# Tencent Mira Cloud production runbook

**Status:** authorized release candidate. This page is not evidence of a live service.

## Authorized access

- Production-only manual GitHub workflow: .github/workflows/tencent-prod-deploy.yml
- Only Tencent Organization Secrets: TX_DEPLOY_HOST, TX_DEPLOY_USER, TX_DEPLOY_PASSWORD. Root password is never logged or copied into a file.
- Trusted ED25519 SSH identity pinned to SHA256:dts8drN74WDQjcE4OsKJ5zozv1oTQ7aLOSeeXLI16HE, verified independently by OPS-027 at the Tencent console. Never bypass strict host-key checking.
- [Real read-only preflight](https://github.com/uichat-mira/mira-cloud/actions/runs/42975664061): verified root on VM-0-17-ubuntu, Ubuntu x86_64, Docker/Compose, existing host Caddy running, available loopback port 34170, approx. 3.6 GiB RAM and 58 GiB disk.
- Existing Alibaba Cloud DEPLOY_* secrets are strictly excluded.

## Runtime topology

cloud.tomzlab.cn → existing host Caddy TLS → React dist directory and /api reverse proxy → 127.0.0.1:34170 → Hono Docker container (isolated DB network plus loopback ingress network) → Docker-only PostgreSQL 16.15.

- PostgreSQL has no host/public port, a persistent Docker volume, and a root-owned secret file under /opt/mira-cloud/secrets. The API image runs non-root with a dedicated supplementary group for secret access.
- Web static releases are immutable directories under /srv/www/cloud.tomzlab.cn/releases, with an atomic current symlink.
- The **VPS clones the public prod branch and verifies its exact Git SHA** against the dispatched workflow commit. Docker builds the API image on VPS, and a short-lived Node container builds the React assets. Docker and pnpm caches are reused across releases. No Docker image archive crosses SSH/SCP. The small on-host release bundle is SHA-256 checked before activation.
- Caddy changes are isolated to one managed site import, after backing up the existing configuration and validating it before reload.
- Docker resources and logs are bounded. No Cloud Auth sessions or Cloud Pi tasks are implemented by this deployment.

## Releasing and acceptance

1. Promote feat → dev → test → prod with Docs Contract, Engineering Checks, real PostgreSQL Integration, Production Package and Mira Gate success.
2. Manually run Deploy Mira Cloud to Tencent VPS on prod. No automatic SSH deployment on ordinary pushes.
3. Strictly verify the previously trusted SSH identity and root target. Clone the public GitHub repo on the VPS, check out the current prod commit, **fail closed if it does not match the workflow's immutable SHA**, then build API Docker image and Web in a Node container locally. Before upgrades, require a logical pg_dump of the existing DB into the private backup folder.
4. Check the on-host release bundle's SHA-256 hashes, start PostgreSQL, apply versioned migrations through a fixed one-off container, start the API, then verify actual HTTP 200 for both /api/v1/health and /api/v1/ready on loopback.
5. Only after API readiness, activate versioned Web and validate/reload host Caddy.
6. Prove HTTPS and public API readiness for the exact deployed SHA. Until the domain resolves to Tencent and inbound 80/443 work, report public T5 as pending, not passed.

## Recovery and limitations

- A failed activation attempts to restore the prior Caddy config, Web symlink and API image. It never automatically reverts SQL schema migrations.
- Private on-host pg_dump snapshots protect upgrades but **are not off-host disaster recovery**. Do not collect durable authenticated user data until off-host backup and restore testing are implemented.
- DNS registration, cloud security-group ports 80/443 and public certificate issuance are separate external conditions. Do not open unrelated ports.
- dev/test have no server; no T4 evidence exists. Production smoke of infrastructure is not a Cloud Auth login, Task execution or Cloud Pi result.

## Simplified on-VPS build (2026-11-11)

The first deployment packed a complete Docker image using `docker save | gzip`
on GitHub Actions, then transferred it with SCP to Tencent. The transfer did not
complete before cancellation. That approach has been retired in favor of
**`git clone` + on-host Docker build**, as selected by the maintainer.

GitHub Actions only verifies the branch/SHA and enters the VPS over pinned SSH.
The VPS itself runs `git clone --depth 1 --branch prod`, checks the checkout
SHA, builds the API Dockerfile, builds Web assets inside a short-lived Node
container, then invokes the same guarded activation, migration and Caddy flow.
This approach moves *source code*, not heavyweight image archives. The first
pull of Node/Postgres base images and package dependencies can still require
network access and time; later deployments can reuse on-host Docker layers.
