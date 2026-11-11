#!/usr/bin/env bash
# Production-only fixed release activation. Executed by verified Tencent root SSH.
set -Eeuo pipefail
umask 077

sha="${1:?40-char release SHA required}"
[[ "$sha" =~ ^[a-f0-9]{40}$ ]] || exit 2
[[ "$(id -u)" -eq 0 && "$(hostname)" = "VM-0-17-ubuntu" ]] || exit 3
root=/opt/mira-cloud
bundle="$root/staging/$sha"
www=/srv/www/cloud.tomzlab.cn
caddy_file=/etc/caddy/Caddyfile
site_file=/etc/caddy/sites/mira-cloud.caddy
marker='# Managed Mira Cloud import (cloud.tomzlab.cn)'
backup="$root/backups/$(date -u +%Y%m%dT%H%M%SZ)-$sha"
compose="$bundle/compose.yaml"
test -d "$bundle" && test -f "$compose"
cd "$bundle"
sha256sum -c checksums.sha256 >/dev/null
echo 'TX_RELEASE_ARTIFACT_CHECKSUMS=PASS'
install -d -m 0700 "$root/secrets" "$root/backups" "$root/staging"
install -d -m 0755 "$www" "$www/releases" /etc/caddy/sites
# Caddy runs unprivileged and must traverse the root-owned /srv/www parent.
# 0711 permits traversal by known path without exposing directory listings.
chmod 0711 /srv/www
test "$(stat -c '%a' "$root/secrets")" = 700
if getent group 45045 >/dev/null; then
  echo 'Host group 45045 unexpectedly exists; refusing shared-secret access' >&2
  exit 1
fi
if test ! -s "$root/secrets/db_password"; then
  openssl rand -hex 24 > "$root/secrets/db_password"
fi
chown 0:45045 "$root/secrets/db_password"
chmod 0640 "$root/secrets/db_password"
test "$(stat -c '%a' "$root/secrets/db_password")" = 640
export MIRA_CLOUD_SHA="$sha"
docker compose -p mira-cloud -f "$compose" config --quiet

test -f "$caddy_file"
test "$(systemctl is-active caddy)" = active
caddy validate --config "$caddy_file" --adapter caddyfile >/dev/null
test ! -e "$www/releases/$sha" || test -f "$www/releases/$sha/index.html"
if test ! -f "$www/releases/$sha/index.html"; then
  mkdir -p "$www/releases/$sha"
  tar -xzf web.tar.gz -C "$www/releases/$sha"
fi
test -f "$www/releases/$sha/index.html"
chmod -R a+rX "$www/releases/$sha"
# Image is built from the exact pinned prod commit on this host.
docker image inspect "mira-cloud-api:$sha" >/dev/null

install -d -m 0700 "$backup"
cp -a "$caddy_file" "$backup/Caddyfile.before"
old_site=absent
if test -e "$site_file"; then
  grep -Fq '# Managed only by the Mira Cloud production deployment workflow.' "$site_file" || {
    echo 'Existing unmanaged Caddy site collision' >&2
    exit 1
  }
  cp -a "$site_file" "$backup/site.before"
  old_site=present
fi
old_web="$(readlink -f "$www/current" 2>/dev/null || true)"
old_release="$(cat "$root/current-release" 2>/dev/null || true)"
if test -n "$old_release"; then
  [[ "$old_release" =~ ^[a-f0-9]{40}$ ]] || exit 1
  test -f "$root/staging/$old_release/compose.yaml"
  MIRA_CLOUD_SHA="$old_release" docker compose -p mira-cloud \
    -f "$root/staging/$old_release/compose.yaml" exec -T postgres \
    pg_dump -U mira_cloud -d mira_cloud | gzip -1 > "$backup/db-before.sql.gz"
  test -s "$backup/db-before.sql.gz"
  gzip -t "$backup/db-before.sql.gz"
  echo 'TX_PREUPGRADE_LOGICAL_DB_BACKUP=PASS'
fi

apply_caddy_config() {
  caddy validate --config "$caddy_file" --adapter caddyfile >/dev/null
  if caddy reload --config "$caddy_file" --adapter caddyfile >/dev/null 2>&1; then
    echo 'TX_CADDY_APPLY_MODE=admin-reload'
    return 0
  fi
  echo 'TX_CADDY_ADMIN_RELOAD_UNAVAILABLE; using validated systemd restart'
  systemctl restart caddy
  test "$(systemctl is-active caddy)" = active
  echo 'TX_CADDY_APPLY_MODE=systemd-restart'
}

rollback() {
  rc=$?
  trap - ERR
  echo 'TX_DEPLOY_ACTIVATION_FAILED; attempting non-destructive Caddy/Web/API rollback' >&2
  cp -a "$backup/Caddyfile.before" "$caddy_file"
  if test "$old_site" = present; then
    cp -a "$backup/site.before" "$site_file"
  else
    rm -f "$site_file"
  fi
  if test -n "$old_web" && test -d "$old_web"; then
    ln -sfn "$old_web" "$www/current.restore"
    mv -Tf "$www/current.restore" "$www/current"
  else
    rm -f "$www/current"
  fi
  if test -n "$old_release"; then
    MIRA_CLOUD_SHA="$old_release" docker compose -p mira-cloud \
      -f "$root/staging/$old_release/compose.yaml" up -d api || true
  else
    docker compose -p mira-cloud -f "$compose" stop api >/dev/null 2>&1 || true
  fi
  if caddy validate --config "$caddy_file" --adapter caddyfile >/dev/null 2>&1; then
    if ! caddy reload --config "$caddy_file" --adapter caddyfile >/dev/null 2>&1; then
      systemctl restart caddy >/dev/null 2>&1 || true
    fi
  fi
  echo 'TX_DEPLOY_FAILED_ROLLBACK_ATTEMPTED; database migration is never automatically reversed' >&2
  exit "$rc"
}
trap rollback ERR

docker compose -p mira-cloud -f "$compose" up -d postgres
docker compose -p mira-cloud -f "$compose" --profile migration run --rm migrate
docker compose -p mira-cloud -f "$compose" up -d --no-deps api
for i in $(seq 1 40); do
  if curl --noproxy '*' --fail --silent --show-error --max-time 3 \
      http://127.0.0.1:34170/api/v1/ready >/dev/null 2>&1; then break; fi
  sleep 2
done
curl --noproxy '*' -fsS --max-time 5 http://127.0.0.1:34170/api/v1/health |
  grep -Fq '"status":"alive"'
curl --noproxy '*' -fsS --max-time 5 http://127.0.0.1:34170/api/v1/ready |
  grep -Fq '"status":"ready"'
echo 'TX_DOCKER_API_AND_POSTGRESQL_READY=PASS'

cp -a cloud.tomzlab.cn.caddy "$site_file"
chmod 0644 "$site_file"
if ! grep -Fq "$marker" "$caddy_file"; then
  if grep -Fq 'cloud.tomzlab.cn' "$caddy_file"; then
    echo 'Cloud domain already exists outside managed import; refusing duplicate' >&2
    exit 1
  fi
  printf '\n%s\nimport %s\n' "$marker" "$site_file" >> "$caddy_file"
fi
caddy validate --config "$caddy_file" --adapter caddyfile >/dev/null
ln -sfn "$www/releases/$sha" "$www/current.next"
mv -Tf "$www/current.next" "$www/current"
apply_caddy_config

printf '%s\n' "$sha" > "$root/current-release"
chmod 0600 "$root/current-release"
echo "TX_DEPLOYED_SOURCE_SHA=$sha"
echo 'TX_CADDY_CONFIG_VALID_AND_RELOADED=PASS'
echo 'TX_LOCAL_WEB_API_DB_DEPLOYMENT=PASS'
