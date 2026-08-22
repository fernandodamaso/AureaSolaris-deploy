#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/select_python.sh"

: "${AUREA_E2E_URL:?AUREA_E2E_URL is required}"
: "${AUREA_E2E_API_URL:?AUREA_E2E_API_URL is required}"
: "${AUREA_E2E_EMAIL:?AUREA_E2E_EMAIL is required}"
: "${AUREA_E2E_PASSWORD:?AUREA_E2E_PASSWORD is required}"
: "${AUREA_E2E_SECOND_JWT:?AUREA_E2E_SECOND_JWT is required}"
: "${AUREA_VERCEL_WEB_PROTECTION_BYPASS:?AUREA_VERCEL_WEB_PROTECTION_BYPASS is required}"
: "${AUREA_VERCEL_API_PROTECTION_BYPASS:?AUREA_VERCEL_API_PROTECTION_BYPASS is required}"
: "${AUREA_EXPECTED_PREVIEW_SHA:?AUREA_EXPECTED_PREVIEW_SHA is required}"
: "${AUREA_VERCEL_SCOPE:?AUREA_VERCEL_SCOPE is required}"
: "${SUPABASE_PREVIEW_URL:?SUPABASE_PREVIEW_URL is required}"
: "${SUPABASE_PREVIEW_ANON_KEY:?SUPABASE_PREVIEW_ANON_KEY is required}"
: "${AUREA_PRODUCTION_SUPABASE_URL:?AUREA_PRODUCTION_SUPABASE_URL is required}"

CANONICAL_PRODUCTION_SUPABASE_URL="https://tgpcpxqqusehssaihvcp.supabase.co"
CANONICAL_PREVIEW_SUPABASE_URL="https://rosklqnnbmhowohoyboj.supabase.co"
normalized_preview_supabase_url="${SUPABASE_PREVIEW_URL%/}"
if [[ "$normalized_preview_supabase_url" != "$CANONICAL_PREVIEW_SUPABASE_URL" ]]; then
  printf 'SUPABASE_PREVIEW_URL must equal %s\n' \
    "$CANONICAL_PREVIEW_SUPABASE_URL" >&2
  exit 1
fi
export SUPABASE_PREVIEW_URL="$normalized_preview_supabase_url"

normalized_production_supabase_url="${AUREA_PRODUCTION_SUPABASE_URL%/}"
if [[ "$normalized_production_supabase_url" != "$CANONICAL_PRODUCTION_SUPABASE_URL" ]]; then
  printf 'AUREA_PRODUCTION_SUPABASE_URL must equal %s\n' \
    "$CANONICAL_PRODUCTION_SUPABASE_URL" >&2
  exit 1
fi
export AUREA_PRODUCTION_SUPABASE_URL="$normalized_production_supabase_url"

aurea_select_python || exit 1
verified_web_url="$(
  "$PYTHON" "$SCRIPT_DIR/verify_vercel_preview.py" \
    --project aurea-solaris \
    "$AUREA_EXPECTED_PREVIEW_SHA" "$AUREA_E2E_URL"
)" || exit 1
verified_api_url="$(
  "$PYTHON" "$SCRIPT_DIR/verify_vercel_preview.py" \
    --project aurea-solaris-api \
    "$AUREA_EXPECTED_PREVIEW_SHA" "$AUREA_E2E_API_URL"
)" || exit 1

if command -v curl >/dev/null 2>&1; then CURL="curl"
elif command -v curl.exe >/dev/null 2>&1; then CURL="curl.exe"
else printf 'curl is required.\n' >&2; exit 1; fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

request() {
  local output="$TMP_DIR/response.json"
  printf 'x-vercel-protection-bypass: %s\n' "$AUREA_VERCEL_API_PROTECTION_BYPASS" | \
    "$CURL" --fail-with-body --silent --show-error --max-time 30 \
      -H @- -o "$output" -w '%{http_code}' "$@" 2>/dev/null || true
}

health_status="$(request "$AUREA_E2E_API_URL/health")"
[[ "$health_status" == 200 ]] || { printf 'FAIL: API health status=%s\n' "$health_status" >&2; exit 1; }
printf 'api_health=200\n'

unauth_status="$(request "$AUREA_E2E_API_URL/v1/me")"
[[ "$unauth_status" == 401 ]] || { printf 'FAIL: unauthenticated status=%s\n' "$unauth_status" >&2; exit 1; }
printf 'api_unauthenticated_me=401\n'

settings_status="$(builtin printf 'apikey: %s\n' "$SUPABASE_PREVIEW_ANON_KEY" | \
  "$CURL" --fail-with-body --silent --show-error --max-time 30 \
    -H @- -o "$TMP_DIR/auth-settings.json" -w '%{http_code}' \
    "$SUPABASE_PREVIEW_URL/auth/v1/settings" 2>/dev/null || true)"
settings_result="$("$PYTHON" - "$TMP_DIR/auth-settings.json" <<'PY'
import json
import sys

try:
    with open(sys.argv[1], encoding="utf-8") as handle:
        settings = json.load(handle)
        email_enabled = settings.get("external", {}).get("email") is True
        signup_disabled = settings.get("disable_signup") is True
        print("valid" if email_enabled and signup_disabled else "invalid")
except (OSError, json.JSONDecodeError):
    print("invalid")
PY
)"
[[ "$settings_status" == 200 && "$settings_result" == valid ]] || {
  printf 'FAIL: Auth settings status=%s\n' "$settings_status" >&2
  exit 1
}
printf 'public_signup=disabled\n'

unset AUREA_VERCEL_PROTECTION_BYPASS
export AUREA_SMOKE_JWT=""
export AUREA_PRODUCTION_API_URL="${AUREA_PRODUCTION_API_URL:-https://aurea-solaris-api.vercel.app}"

if command -v npx.cmd >/dev/null 2>&1; then
  NPX=(npx.cmd)
elif command -v npx >/dev/null 2>&1; then
  NPX=(npx)
else
  printf 'npx is required.\n' >&2
  exit 1
fi

"${NPX[@]}" playwright test apps/web/e2e/specs/ownership.spec.ts \
  --config=apps/web/e2e/playwright.config.ts --project=chromium --workers=1

post_verified_web_url="$(
  "$PYTHON" "$SCRIPT_DIR/verify_vercel_preview.py" \
    --project aurea-solaris \
    "$AUREA_EXPECTED_PREVIEW_SHA" "$AUREA_E2E_URL"
)" || exit 1
post_verified_api_url="$(
  "$PYTHON" "$SCRIPT_DIR/verify_vercel_preview.py" \
    --project aurea-solaris-api \
    "$AUREA_EXPECTED_PREVIEW_SHA" "$AUREA_E2E_API_URL"
)" || exit 1
if [[ "$post_verified_web_url" != "$verified_web_url" || "$post_verified_api_url" != "$verified_api_url" ]]; then
  printf 'FAIL: preview deployment alias drift detected; exact deployment changed during the gate.\n' >&2
  exit 1
fi

printf 'PASS: hosted preview ownership gate completed without printing credentials or payloads\n'
