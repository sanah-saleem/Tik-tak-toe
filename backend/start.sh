#!/bin/sh
set -e

# Railway Postgres provides DATABASE_URL.
# You can also set NAKAMA_DATABASE_ADDRESS manually in Railway if you prefer.
DB_ADDR="${NAKAMA_DATABASE_ADDRESS:-${DATABASE_URL}}"

if [ -z "$DB_ADDR" ]; then
  echo "ERROR: No database address found. Set DATABASE_URL (Railway) or NAKAMA_DATABASE_ADDRESS." >&2
  exit 1
fi

echo "Running Nakama migrations..."
/nakama/nakama migrate up --database.address "$DB_ADDR"

echo "Starting Nakama..."
/nakama/nakama \
  --name nakama1 \
  --database.address "$DB_ADDR" \
  --config /nakama/data/local.yml \
  --logger.level "${NAKAMA_LOG_LEVEL:-INFO}"
