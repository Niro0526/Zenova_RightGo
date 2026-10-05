#!/bin/sh
# Local Docker Compose entrypoint: migrate, check dataset, start API.
# Seeding itself is idempotent and runs inside the app lifespan (app.main).
set -e

DATA_DIR="${RIGHTGO_DATA_DIR:-/app/data}"
REQUIRED_FILES="calendar.csv district_travel.csv outlets.csv service_allowance.csv vehicles.csv task2b_peak_day_fleet.csv task2b_peak_day_scenarios.csv"

missing=""
for f in $REQUIRED_FILES; do
  if [ -z "$(find "$DATA_DIR" -name "$f" -print -quit 2>/dev/null)" ]; then
    missing="$missing $f"
  fi
done

if [ -n "$missing" ]; then
  echo "[entrypoint] Competition dataset incomplete in $DATA_DIR. Missing:$missing" >&2
  echo "[entrypoint] Place the confidential CSVs in ./data (see README 'Dataset')." >&2
  if [ "${REQUIRE_DATASET:-true}" = "true" ]; then
    exit 1
  fi
fi

echo "[entrypoint] Applying migrations..."
attempt=0
until alembic upgrade head; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 10 ]; then
    echo "[entrypoint] Migrations failed after $attempt attempts." >&2
    exit 1
  fi
  echo "[entrypoint] Database not ready, retrying ($attempt/10)..."
  sleep 3
done

echo "[entrypoint] Starting API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
