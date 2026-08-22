#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/lib/select_python.sh"
cd "$ROOT_DIR"

PREVIEW_REF="rosklqnnbmhowohoyboj"
PRODUCTION_REF="tgpcpxqqusehssaihvcp"
MIGRATION_FILE="supabase/migrations/202608150001_web_v1_core.sql"
MIGRATION_VERSION="202608150001"
MIGRATION_SHA256="42d3b1f57a52ae3fff45a0086075518a18d8924f6deb5cf7d5b1143aef46dcb2"

select_tools() {
  aurea_select_python || exit 1
  if [[ -z "${SUPABASE:-}" ]]; then
    if command -v supabase.exe >/dev/null 2>&1; then SUPABASE="supabase.exe"
    elif command -v supabase >/dev/null 2>&1; then SUPABASE="supabase"
    else printf 'Supabase CLI is required.\n' >&2; exit 1; fi
  fi
  if command -v curl >/dev/null 2>&1; then CURL="curl"
  elif command -v curl.exe >/dev/null 2>&1; then CURL="curl.exe"
  else printf 'curl is required for Auth policy checks.\n' >&2; exit 1; fi
}

fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }

verify_project() {
  local label="$1" ref="$2" project_json migration_output migration_error query_output api_keys auth_json publishable_key
  project_json="$("$SUPABASE" projects list --output-format json 2>/dev/null)" || fail "$label project list unavailable"
  printf '%s' "$project_json" | "$PYTHON" -c 'import json,sys; payload=json.load(sys.stdin); ref,label=sys.argv[1:]; projects=[p for p in payload.get("projects",[]) if p.get("ref")==ref]; sys.exit(1) if len(projects)!=1 or projects[0].get("status")!="ACTIVE_HEALTHY" else print(f"{label}: project=ACTIVE_HEALTHY ref={ref}")' "$ref" "$label"

  migration_error="$(mktemp)"
  if ! migration_output="$("$SUPABASE" migration list --project-ref "$ref" --output-format json 2>"$migration_error")"; then
    rm -f "$migration_error"
    fail "$label migration history unavailable"
  fi
  rm -f "$migration_error"
  printf '%s' "$migration_output" | "$PYTHON" -c 'import re,sys; text=sys.stdin.read(); label,local_version=sys.argv[1:]; versions=list(dict.fromkeys(re.findall(r"[0-9]{12,14}",text))); sys.exit(1) if local_version not in versions or len(versions)<2 else print(f"{label}: migration={local_version} remote_execution_version={next(v for v in versions if v != local_version)}")' "$label" "$MIGRATION_VERSION"

  api_keys="$("$SUPABASE" projects api-keys --project-ref "$ref" --output-format json 2>/dev/null)" || fail "$label publishable-key discovery unavailable"
  publishable_key="$(printf '%s' "$api_keys" | "$PYTHON" -c 'import json,sys; value=json.load(sys.stdin); items=value if isinstance(value,list) else value.get("keys",value.get("data",[])); print(next((item.get("api_key","") for item in items if item.get("type")=="publishable" or item.get("name")=="anon"),""))' | tr -d '\r\n')"
  [[ -n "$publishable_key" ]] || fail "$label publishable key unavailable"
  auth_json="$(builtin printf 'apikey: %s\n' "$publishable_key" | \
    "$CURL" --fail --silent --show-error --max-time 20 \
      -H @- "https://${ref}.supabase.co/auth/v1/settings" 2>/dev/null)" \
    || fail "$label Auth settings unavailable"
  printf '%s' "$auth_json" | "$PYTHON" -c 'import json,sys; settings=json.load(sys.stdin); label=sys.argv[1]; sys.exit(1) if settings.get("external",{}).get("email") is not True or settings.get("disable_signup") is not True else print(f"{label}: auth_email_password=enabled public_signup=disabled")' "$label"

  query_output="$("$SUPABASE" db query --linked --project-ref "$ref" --output-format json \
    "select c.relname as tablename, c.relrowsecurity as rls_enabled, p.policyname, p.roles::text as roles, p.cmd, p.qual, p.with_check from pg_class c join pg_namespace n on n.oid=c.relnamespace left join pg_policies p on p.schemaname='public' and p.tablename=c.relname where n.nspname='public' and c.relname in ('profiles','birth_profiles','calculation_receipts') order by c.relname,p.policyname;" 2>/dev/null)" \
    || fail "$label RLS query unavailable"
  printf '%s' "$query_output" | "$PYTHON" -c 'import json,sys; text=sys.stdin.read(); decoder=json.JSONDecoder(); payload=None
for index,char in enumerate(text):
    if char=="{":
        try: candidate,_=decoder.raw_decode(text[index:])
        except json.JSONDecodeError: continue
        if isinstance(candidate,dict) and "rows" in candidate: payload=candidate; break
if payload is None: raise SystemExit(1)
expected={"profiles":"profiles_owner_all","birth_profiles":"birth_profiles_owner_all","calculation_receipts":"calculation_receipts_owner_all"}; rows=payload["rows"]
owner_expr="(( SELECT auth.uid() AS uid) = user_id)"
if len(rows)!=len(expected) or {row.get("tablename") for row in rows}!=set(expected): raise SystemExit(1)
for row in rows:
    table=row["tablename"]
    if row.get("rls_enabled") is not True or row.get("policyname")!=expected[table] or row.get("roles")!="{authenticated}" or row.get("cmd")!="ALL" or row.get("qual")!=owner_expr or row.get("with_check")!=owner_expr: raise SystemExit(1)
tables=",".join(sorted(expected)); print(f"{sys.argv[1]}: rls=enabled owner_policies=verified tables={tables}")' "$label"

  local admin_var="SUPABASE_SERVICE_ROLE_KEY_${label^^}" admin_key
  admin_key="$(printenv "$admin_var" 2>/dev/null || true)"
  if [[ -n "$admin_key" ]]; then
    local users_json user_count confirmed_count
    users_json="$(builtin printf 'apikey: %s\nAuthorization: Bearer %s\n' \
      "$admin_key" "$admin_key" | \
      "$CURL" --fail --silent --show-error --max-time 20 \
        -H @- "https://${ref}.supabase.co/auth/v1/admin/users?per_page=1000" 2>/dev/null)" \
      || fail "$label Auth user inventory unavailable"
    read -r user_count confirmed_count < <(printf '%s' "$users_json" | "$PYTHON" -c 'import json,sys; users=json.load(sys.stdin).get("users",[]); print(len(users),sum(1 for user in users if user.get("email_confirmed_at")))' | tr -d '\r')
    [[ "$label" != production || "$user_count" == 1 ]] || fail 'production has unexpected Auth identities'
    printf '%s: auth_users=%s confirmed=%s\n' "$label" "$user_count" "$confirmed_count"
  else
    printf '%s: auth_users=not_checked_secure_admin_credential_not_supplied\n' "$label"
  fi
}

select_tools
[[ -f "$MIGRATION_FILE" ]] || fail "missing $MIGRATION_FILE"
actual_sha256="$($PYTHON - "$MIGRATION_FILE" <<'PY'
import hashlib, pathlib, sys
print(hashlib.sha256(pathlib.Path(sys.argv[1]).read_bytes()).hexdigest())
PY
)"
actual_sha256="${actual_sha256//$'\r'/}"
[[ "$actual_sha256" == "$MIGRATION_SHA256" ]] || fail 'committed migration hash mismatch'
printf 'migration_sha256=%s\n' "$actual_sha256"
verify_project preview "$PREVIEW_REF"
verify_project production "$PRODUCTION_REF"
printf 'PASS: preview and production Supabase environments verified\n'
