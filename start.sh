#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# Load environment variables from apps/web/.env.local
if [ -f apps/web/.env.local ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    # Skip empty lines and comments
    [[ -z "$line" || "$line" =~ ^# ]] && continue
    export "$line"
  done < apps/web/.env.local
else
  echo "Error: apps/web/.env.local not found"
  exit 1
fi

# Start Supabase locally if not already running (use packages/supabase workdir for correct config)
if ! npx supabase status &>/dev/null; then
  npx supabase start
else
  echo "Supabase is already running."
fi

pnpm dev
