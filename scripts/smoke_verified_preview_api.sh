#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/select_python.sh"

: "${AUREA_PREVIEW_API_URL:?Set the protected preview API URL or alias}"
: "${AUREA_EXPECTED_PREVIEW_SHA:?Set the full candidate SHA}"
: "${AUREA_VERCEL_SCOPE:?Set the verified Vercel team scope}"

aurea_select_python || exit 1
verified_url="$(
  "$PYTHON" "$SCRIPT_DIR/verify_vercel_preview.py" \
    "$AUREA_EXPECTED_PREVIEW_SHA" "$AUREA_PREVIEW_API_URL"
)" || exit 1
export AUREA_VERIFIED_PREVIEW_API_URL="$verified_url"

exec bash "$SCRIPT_DIR/smoke_api.sh" "$AUREA_VERIFIED_PREVIEW_API_URL"
