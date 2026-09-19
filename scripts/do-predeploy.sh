#!/usr/bin/env bash
set -euo pipefail

echo "Applying Drizzle migrations..."
npm run db:migrate
