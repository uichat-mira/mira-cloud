#!/usr/bin/env bash
# Explicit prod-only manual deployment, built on the pinned Tencent VPS.
# This intentionally transfers no Docker image archive over SCP.
set -Eeuo pipefail
umask 077

sha="${GITHUB_SHA:?}"
[[ "$GITHUB_REF" = refs/heads/prod && "$sha" =~ ^[a-f0-9]{40}$ ]] || exit 2
test -n "${TX_DEPLOY_HOST:-}" && test -n "${SSHPASS:-}" || {
  echo 'Tencent Organization SSH secrets unavailable' >&2
  exit 1
}
test "$TX_DEPLOY_USER" = root || {
  echo 'Tencent deploy principal must be explicitly authorized root' >&2
  exit 1
}

sudo apt-get update -qq >/dev/null
sudo apt-get install -y -qq sshpass >/dev/null
known="$RUNNER_TEMP/mira-cloud-tx-known"
ssh-keyscan -T 12 -p 22 -t ed25519 "$TX_DEPLOY_HOST" 2>/dev/null > "$known"
test -s "$known"
test "$(wc -l < "$known" | tr -d ' ')" -eq 1
expected='SHA256:dts8drN74WDQjcE4OsKJ5zozv1oTQ7aLOSeeXLI16HE'
actual="$(ssh-keygen -lf "$known" -E sha256 | awk '{print $2}')"
test "$actual" = "$expected" || {
  echo 'TX_SSH_HOST_IDENTITY_MISMATCH; refusing connection' >&2
  exit 1
}
chmod 600 "$known"
echo 'TX_DEPLOY_HOST_KEY_PIN=VERIFIED'

ssh_args=(-o StrictHostKeyChecking=yes
  -o "UserKnownHostsFile=$known"
  -o GlobalKnownHostsFile=/dev/null
  -o HostKeyAlgorithms=ssh-ed25519
  -o PubkeyAuthentication=no
  -o PreferredAuthentications=password
  -o NumberOfPasswordPrompts=1
  -o ConnectTimeout=15
  -o ServerAliveInterval=15
  -o ServerAliveCountMax=3)
remote="$TX_DEPLOY_USER@$TX_DEPLOY_HOST"

# GitHub.com TLS from Tencent is intermittent; ship only the verified Git tree,
# never an assembled container image or untracked checkout files.
archive="$RUNNER_TEMP/mira-cloud-source-$sha.tar.gz"
git archive --format=tar "$sha" | gzip -1 > "$archive"
test -s "$archive"
archive_digest="$(sha256sum "$archive" | awk '{print $1}')"
[[ "$archive_digest" =~ ^[a-f0-9]{64}$ ]] || exit 2
sshpass -e ssh -p 22 "${ssh_args[@]}" "$remote" \
  "install -d -m 0700 /opt/mira-cloud/staging/$sha"
sshpass -e scp -P 22 "${ssh_args[@]}" "$archive" \
  "$remote:/opt/mira-cloud/staging/$sha/source.tar.gz"
echo 'TX_SMALL_SOURCE_ARCHIVE_TRANSFER=PASS'

# Pull pinned Docker Official Images from ECR Public: Docker Hub times out on this VPS.
# Only runtime base images and npm dependencies are downloaded; VPS caches them.
sshpass -e ssh -p 22 "${ssh_args[@]}" "$remote" "bash -se -- '$sha' '$archive_digest'" <<'REMOTE'
set -Eeuo pipefail
umask 077
sha="$1"
expected_source_digest="$2"
[[ "$sha" =~ ^[a-f0-9]{40}$ && "$expected_source_digest" =~ ^[a-f0-9]{64}$ ]] || exit 2
test "$(id -u)" -eq 0
test "$(hostname)" = VM-0-17-ubuntu
test "$(uname -m)" = x86_64
test "$(systemctl is-active caddy)" = active
command -v git >/dev/null
command -v docker >/dev/null
docker compose version >/dev/null
test "$(df -Pm / | awk 'NR==2 {print $4}')" -ge 5000
test "$(free -m | awk '/^Mem:/ {print $2}')" -ge 3000
echo 'TX_ROOT_GIT_BUILD_PREFLIGHT=PASS'

bundle="/opt/mira-cloud/staging/$sha"
repo="$bundle/source"
archive="$bundle/source.tar.gz"
install -d -m 0700 "$bundle"
test -s "$archive"
printf '%s  %s\n' "$expected_source_digest" "$archive" | sha256sum -c - >/dev/null
echo 'TX_SOURCE_ARCHIVE_SHA256=PASS'
# Source is a git archive of the exact protected prod commit verified on Actions.
# Do not reuse incomplete / stale clones left by earlier failed GitHub TLS requests.
if test -d "$repo"; then
  test "$(cat "$bundle/source-verified.sha" 2>/dev/null || true)" = "$sha" || {
    rm -rf -- "$repo"
  }
fi
if test ! -d "$repo"; then
  install -d -m 0700 "$repo"
  tar -xzf "$archive" --no-same-owner --no-same-permissions -C "$repo"
  test -f "$repo/apps/api/Dockerfile"
  test -f "$repo/pnpm-lock.yaml"
  printf '%s\n' "$sha" > "$bundle/source-verified.sha"
fi
echo "TX_EXACT_PROD_ARCHIVE_SHA=$sha"

# Prefer cached layers. Sequential builds avoid memory contention on 2c/4GiB.
docker build --platform linux/amd64 -f "$repo/apps/api/Dockerfile" \
  -t "mira-cloud-api:$sha" "$repo"
echo 'TX_ON_HOST_API_DOCKER_BUILD=PASS'

docker run --rm --memory=2300m --cpus=1.5 \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  -e NODE_OPTIONS=--max-old-space-size=1400 \
  -v "$repo:/workspace" -w /workspace \
  public.ecr.aws/docker/library/node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df sh -c \
    'corepack enable && pnpm install --frozen-lockfile --filter @mira-cloud/web... && pnpm --filter @mira-cloud/web build'
test -f "$repo/apps/web/dist/index.html"
echo 'TX_ON_HOST_WEB_BUILD=PASS'

# Build small activation bundle on-host, with no docker-save/SCP.
tar -czf "$bundle/web.tar.gz" -C "$repo/apps/web/dist" .
cp "$repo/deploy/mira-cloud/compose.yaml" "$bundle/compose.yaml"
cp "$repo/deploy/mira-cloud/cloud.tomzlab.cn.caddy" "$bundle/cloud.tomzlab.cn.caddy"
cp "$repo/scripts/mira-cloud-activate-on-host.sh" "$bundle/activate.sh"
(cd "$bundle" && sha256sum web.tar.gz compose.yaml cloud.tomzlab.cn.caddy \
  activate.sh > checksums.sha256 && sha256sum -c checksums.sha256 >/dev/null)
echo 'TX_ON_HOST_RELEASE_BUNDLE_READY=PASS'
bash "$bundle/activate.sh" "$sha"
REMOTE
echo 'TX_PRODUCTION_ACTIVATION_EXIT=0'
