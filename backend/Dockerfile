FROM heroiclabs/nakama:3.21.0

# Copy runtime modules + config into image
COPY ./modules /nakama/data/modules
COPY ./local.yml /nakama/data/local.yml

EXPOSE 7350 7351

# Run migrations then start Nakama (Railway gives DATABASE_URL)
ENTRYPOINT /bin/sh -ec '\
DB_ADDR="${NAKAMA_DATABASE_ADDRESS:-$DATABASE_URL}"; \
if [ -z "$DB_ADDR" ]; then \
  echo "ERROR: DATABASE_URL or NAKAMA_DATABASE_ADDRESS not set" >&2; exit 1; \
fi; \
echo "Running migrations..."; \
/nakama/nakama migrate up --database.address "$DB_ADDR"; \
echo "Starting Nakama..."; \
/nakama/nakama \
  --name nakama1 \
  --database.address "$DB_ADDR" \
  --config /nakama/data/local.yml \
  --logger.level "${NAKAMA_LOG_LEVEL:-INFO}" \
'
