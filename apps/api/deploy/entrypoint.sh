#!/bin/sh
set -eu

test -s /run/secrets/db_password || {
  echo 'Database password secret unavailable' >&2
  exit 1
}
password="$(cat /run/secrets/db_password)"
case "$password" in
  ''|*[!0-9a-f]*) echo 'Invalid database password format' >&2; exit 1 ;;
esac
unset PG_PASSWORD
export DATABASE_URL="postgresql://mira_cloud:$password@postgres:5432/mira_cloud"
unset password

case "$1" in
  api)
    exec node dist/server.js
    ;;
  migrate)
    exec node dist/db/migrate.js
    ;;
  *)
    echo 'Unsupported fixed app command' >&2
    exit 2
    ;;
esac
