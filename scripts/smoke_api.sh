#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-}"
[[ -n "$BASE_URL" ]] || { printf 'Usage: %s <api-url>\n' "$0" >&2; exit 2; }
BASE_URL="${BASE_URL%/}"

if command -v curl >/dev/null 2>&1; then CURL="curl"
elif command -v curl.exe >/dev/null 2>&1; then CURL="curl.exe"
else printf 'curl is required.\n' >&2; exit 1; fi
PYTHON=""
for candidate in python3 python python.exe; do
  if command -v "$candidate" >/dev/null 2>&1 && "$candidate" --version >/dev/null 2>&1; then
    PYTHON="$candidate"
    break
  fi
done
[[ -n "$PYTHON" ]] || { printf 'Python 3 is required.\n' >&2; exit 1; }

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

request() {
  local name="$1" path="$2" output="$TMP_DIR/$1.json"; shift 2
  local status url="$BASE_URL$path"
  if [[ -n "${AUREA_VERCEL_SHARE_QUERY:-}" ]]; then
    url="$url?${AUREA_VERCEL_SHARE_QUERY#\?}"
  fi
  local -a share_flags=()
  if [[ -n "${AUREA_VERCEL_SHARE_QUERY:-}" ]]; then
    share_flags=(-L -c "$TMP_DIR/cookies.txt" -b "$TMP_DIR/cookies.txt")
  fi
  local -a protection_flags=()
  if [[ -n "${AUREA_VERCEL_PROTECTION_BYPASS:-}" ]]; then
    protection_flags=(-H "x-vercel-protection-bypass: $AUREA_VERCEL_PROTECTION_BYPASS")
  fi
  status="$("$CURL" --fail-with-body --silent --show-error --max-time 30 \
    "${share_flags[@]}" "${protection_flags[@]}" -o "$output" -w '%{http_code}' "$url" "$@" 2>/dev/null || true)"
  printf '%s %s %s\n' "$name" "$status" "$output"
}

json_field() {
  "$PYTHON" - "$1" "$2" <<'PY'
import json, sys
path, field = sys.argv[1:]
value = json.load(open(path, encoding="utf-8")).get(field)
print("" if value is None else value)
PY
}

health="$(request health /health)"
health_status="$(printf '%s' "$health" | awk '{print $2}')"
health_file="$(printf '%s' "$health" | awk '{print $3}')"
[[ "$health_status" == 200 && "$(json_field "$health_file" status)" == ok ]] || { printf 'FAIL: health check\n' >&2; exit 1; }
printf 'health=200\n'

ready="$(request ready /ready)"
ready_status="$(printf '%s' "$ready" | awk '{print $2}')"
ready_file="$(printf '%s' "$ready" | awk '{print $3}')"
if [[ "$ready_status" == 200 ]]; then
  [[ "$(json_field "$ready_file" status)" == ok ]] || { printf 'FAIL: ready payload\n' >&2; exit 1; }
elif [[ "$ready_status" == 503 ]]; then
  [[ "$(json_field "$ready_file" code)" == service_not_ready ]] || { printf 'FAIL: ready fail-closed payload\n' >&2; exit 1; }
else
  printf 'FAIL: ready status\n' >&2
  exit 1
fi
printf 'ready=%s\n' "$ready_status"

unauth="$(request unauth /v1/me)"
unauth_status="$(printf '%s' "$unauth" | awk '{print $2}')"
[[ "$unauth_status" == 401 ]] || { printf 'FAIL: unauthenticated route status\n' >&2; exit 1; }
printf 'unauthenticated_me=401\n'

if [[ -n "${AUREA_SMOKE_JWT:-}" ]]; then
  auth="$(request auth /v1/me -H "Authorization: Bearer $AUREA_SMOKE_JWT")"
  auth_status="$(printf '%s' "$auth" | awk '{print $2}')"
  auth_file="$(printf '%s' "$auth" | awk '{print $3}')"
  printf 'authenticated_me_status=%s\n' "$auth_status"
  if [[ "$auth_status" == 200 ]]; then
    printf 'authenticated_me=200\n'
  elif [[ "$auth_status" == 404 && "$(json_field "$auth_file" code)" == profile_not_found ]]; then
    printf 'authenticated_me=404_profile_not_found\n'
  else
    printf 'authenticated_me_code=%s\n' "$(json_field "$auth_file" code)"
    printf 'FAIL: authenticated route status\n' >&2
    exit 1
  fi

  if [[ "${AUREA_SMOKE_ASTROLOGY:-0}" == 1 ]]; then
    profile_body='{"label":"Vercel E2E","birth_date":"1990-01-01","birth_time":"12:00:00","timezone":"UTC","latitude":0,"longitude":0,"place":"E2E","house_system":"P"}'
    profile="$(request birth_profile /v1/birth-profile -X PUT -H "Authorization: Bearer $AUREA_SMOKE_JWT" -H 'Content-Type: application/json' --data "$profile_body")"
    profile_status="$(printf '%s' "$profile" | awk '{print $2}')"
    printf 'birth_profile_status=%s\n' "$profile_status"
    [[ "$profile_status" == 200 ]] || { printf 'FAIL: birth profile setup\n' >&2; exit 1; }
    astrology="$(request astrology /v1/astrology/natal -X POST -H "Authorization: Bearer $AUREA_SMOKE_JWT" -H 'Content-Type: application/json' --data '{}')"
    astrology_status="$(printf '%s' "$astrology" | awk '{print $2}')"
    astrology_file="$(printf '%s' "$astrology" | awk '{print $3}')"
    printf 'astrology_status=%s\n' "$astrology_status"
    if [[ "$astrology_status" != 200 ]]; then
      printf 'astrology_code=%s\n' "$(json_field "$astrology_file" code)"
    fi
    [[ "$astrology_status" == 200 ]] || { printf 'FAIL: astrology route status\n' >&2; exit 1; }
    engine="$(json_field "$astrology_file" engine_name)"
    ephemeris="$(json_field "$astrology_file" ephemeris_version)"
    [[ -n "$engine" && -n "$ephemeris" ]] || { printf 'FAIL: Swiss Ephemeris metadata\n' >&2; exit 1; }
    printf 'astrology=200 engine=%s ephemeris_metadata=present\n' "$engine"
  fi
else
  [[ "${AUREA_SMOKE_SKIP_AUTH:-0}" == 1 ]] || { printf 'FAIL: AUREA_SMOKE_JWT is required for authenticated checks\n' >&2; exit 1; }
  printf 'authenticated_checks=skipped_secure_token_not_supplied\n'
fi

printf 'PASS: API smoke completed without printing response bodies or credentials\n'
