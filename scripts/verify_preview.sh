#!/usr/bin/env bash
set -euo pipefail

: "${AUREA_E2E_URL:?AUREA_E2E_URL is required}"
: "${AUREA_E2E_API_URL:?AUREA_E2E_API_URL is required}"
: "${AUREA_E2E_EMAIL:?AUREA_E2E_EMAIL is required}"
: "${AUREA_E2E_PASSWORD:?AUREA_E2E_PASSWORD is required}"
: "${AUREA_E2E_SECOND_JWT:?AUREA_E2E_SECOND_JWT is required}"
: "${AUREA_VERCEL_WEB_PROTECTION_BYPASS:?AUREA_VERCEL_WEB_PROTECTION_BYPASS is required}"
: "${AUREA_VERCEL_API_PROTECTION_BYPASS:?AUREA_VERCEL_API_PROTECTION_BYPASS is required}"
: "${SUPABASE_PREVIEW_URL:?SUPABASE_PREVIEW_URL is required}"
: "${SUPABASE_PREVIEW_ANON_KEY:?SUPABASE_PREVIEW_ANON_KEY is required}"

if command -v curl >/dev/null 2>&1; then CURL="curl"
elif command -v curl.exe >/dev/null 2>&1; then CURL="curl.exe"
else printf 'curl is required.\n' >&2; exit 1; fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

request() {
  local output="$TMP_DIR/response.json"
  "$CURL" --fail-with-body --silent --show-error --max-time 30 \
    -H "x-vercel-protection-bypass: $AUREA_VERCEL_API_PROTECTION_BYPASS" \
    -o "$output" -w '%{http_code}' "$@" 2>/dev/null || true
}

health_status="$(request "$AUREA_E2E_API_URL/health")"
[[ "$health_status" == 200 ]] || { printf 'FAIL: API health status=%s\n' "$health_status" >&2; exit 1; }
printf 'api_health=200\n'

unauth_status="$(request "$AUREA_E2E_API_URL/v1/me")"
[[ "$unauth_status" == 401 ]] || { printf 'FAIL: unauthenticated status=%s\n' "$unauth_status" >&2; exit 1; }
printf 'api_unauthenticated_me=401\n'

signup_email="preview-disabled-$(date +%s)-$$@example.com"
signup_status="$($CURL --fail-with-body --silent --show-error --max-time 30 \
  -o "$TMP_DIR/signup.json" -w '%{http_code}' \
  -H "apikey: $SUPABASE_PREVIEW_ANON_KEY" -H 'Content-Type: application/json' \
  --data "{\"email\":\"$signup_email\",\"password\":\"Preview-disabled-9Aa!\"}" \
  "$SUPABASE_PREVIEW_URL/auth/v1/signup" 2>/dev/null || true)"
signup_error_code="$(python3 - "$TMP_DIR/signup.json" <<'PY'
import json
import sys

try:
    with open(sys.argv[1], encoding="utf-8") as handle:
        print(json.load(handle).get("error_code", ""))
except (OSError, json.JSONDecodeError):
    print("")
PY
)"
[[ "$signup_status" == 422 && "$signup_error_code" == signup_disabled ]] || {
  printf 'FAIL: public sign-up status=%s\n' "$signup_status" >&2
  exit 1
}
printf 'public_signup=disabled\n'

export AUREA_VERCEL_PROTECTION_BYPASS="$AUREA_VERCEL_WEB_PROTECTION_BYPASS"
export AUREA_SMOKE_JWT=""
export AUREA_PRODUCTION_API_URL="${AUREA_PRODUCTION_API_URL:-https://aurea-solaris-api.vercel.app}"
export AUREA_PRODUCTION_SUPABASE_URL="${AUREA_PRODUCTION_SUPABASE_URL:-}"

cmd.exe /d /s /c "set AUREA_E2E_URL=$AUREA_E2E_URL&&set AUREA_E2E_API_URL=$AUREA_E2E_API_URL&&set AUREA_E2E_EMAIL=$AUREA_E2E_EMAIL&&set AUREA_E2E_PASSWORD=$AUREA_E2E_PASSWORD&&set AUREA_E2E_SECOND_JWT=$AUREA_E2E_SECOND_JWT&&set AUREA_VERCEL_PROTECTION_BYPASS=$AUREA_VERCEL_WEB_PROTECTION_BYPASS&&set AUREA_VERCEL_WEB_PROTECTION_BYPASS=$AUREA_VERCEL_WEB_PROTECTION_BYPASS&&set AUREA_VERCEL_API_PROTECTION_BYPASS=$AUREA_VERCEL_API_PROTECTION_BYPASS&&set AUREA_PRODUCTION_API_URL=$AUREA_PRODUCTION_API_URL&&set AUREA_PRODUCTION_SUPABASE_URL=$AUREA_PRODUCTION_SUPABASE_URL&&npx.cmd playwright test apps/web/e2e/specs/ownership.spec.ts --config=apps/web/e2e/playwright.config.ts --project=chromium --workers=1"

printf 'PASS: hosted preview ownership gate completed without printing credentials or payloads\n'
