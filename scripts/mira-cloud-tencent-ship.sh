#!/usr/bin/env bash
# Runs only on the GitHub ubuntu-latest runner from Mira Cloud prod.
set -Eeuo pipefail
umask 077

sha="${GITHUB_SHA:?}"
[[ "$GITHUB_REF" = refs/heads/prod && "$sha" =~ ^[a-f0-9]{40}$ ]] || exit 2
test -n "${TX_DEPLOY_HOST:-}" && test -n "${SSHPASS:-}" || {
  echo 'Tencent Organization SSH Secrets not available to Mira Cloud' >&2
  exit 1
}
test "$TX_DEPLOY_USER" = root || {
  echo 'Tencent deploy principal must be authorized root' >&2
  exit 1
}
test -d release
(cd release && sha256sum -c checksums.sha256 >/dev/null)
sudo apt-get update -qq >/dev/null
sudo apt-get install -qq -y sshpass >/dev/null

known="$RUNNER_TEMP/mira-cloud-tx-known"
ssh-keyscan -T 12 -p 22 -t ed25519 "$TX_DEPLOY_HOST" 2>/dev/null > "$known"
test -s "$known"
test "$(wc -l < "$known" | tr -d ' ')" -eq 1
expected='SHA256:dts8drN74WDQjcE4OsKJ5zozv1oTQ7aLOSeeXLI16HE'
actual="$(ssh-keygen -lf "$known" -E sha256 | awk '{print $2}')"
test "$actual" = "$expected" || {
  echo 'TX_SSH_HOST_IDENTITY_MISMATCH; refusing root password authentication' >&2
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
sshpass -e ssh -p 22 "${ssh_args[@]}" "$remote" "bash -se -- '$sha'" <<'REMOTE'
set -eu
sha="$1"
test "$(id -u)" -eq 0
test "$(hostname)" = VM-0-17-ubuntu
test "$(uname -m)" = x86_64
test "$(systemctl is-active caddy)" = active
command -v docker >/dev/null
docker compose version >/dev/null
test "$(df -Pm / | awk 'NR==2 {print $4}')" -ge 5000
install -d -m 0700 /opt/mira-cloud/staging
install -d -m 0700 "/opt/mira-cloud/staging/$sha"
echo 'TX_ROOT_DEPLOY_PREFLIGHT=PASS'
REMOTE

sshpass -e scp -P 22 "${ssh_args[@]}" \
  release/web.tar.gz release/api-image.tar.gz release/compose.yaml \
  release/cloud.tomzlab.cn.caddy release/activate.sh release/checksums.sha256 \
  "$remote:/opt/mira-cloud/staging/$sha/"
echo 'TX_RELEASE_TRANSFER=COMPLETE'

sshpass -e ssh -p 22 "${ssh_args[@]}" "$remote" \
  "bash '/opt/mira-cloud/staging/$sha/activate.sh' '$sha'"
echo 'TX_PRODUCTION_ACTIVATION_EXIT=0'
