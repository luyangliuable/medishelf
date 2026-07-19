#!/usr/bin/env bash
set -euo pipefail

echo "Ensuring database schema..."
node scripts/ensure-schema.mjs
echo "Database schema is ready."
