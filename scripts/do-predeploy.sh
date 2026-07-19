#!/usr/bin/env bash
set -euo pipefail

echo "Validating database schema..."
node scripts/ensure-schema.mjs
echo "Database schema is ready."
