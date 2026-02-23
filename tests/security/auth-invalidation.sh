/**
 * Security Evidence Test 1 — Auth JWT Invalidation after signOut
 *
 * Verifies that after supabase.auth.signOut() the Supabase server invalidates
 * the JWT so a previously valid access_token returns 401/403 on protected endpoints.
 *
 * Prerequisites (configure env vars before running):
 *   SUPABASE_URL        - https://<project>.supabase.co
 *   SUPABASE_ANON_KEY   - anon/public key
 *   TEST_USER_EMAIL     - admin@garagem40.test
 *   TEST_USER_PASSWORD  - value from TEST_USER_PASSWORD secret
 *
 * Run: TEST_USER_EMAIL=admin@garagem40.test TEST_USER_PASSWORD=... bash tests/security/auth-invalidation.sh
 */

#!/usr/bin/env bash
set -euo pipefail

SUPABASE_URL="${SUPABASE_URL:-${VITE_SUPABASE_URL:-}}"
ANON_KEY="${SUPABASE_ANON_KEY:-${VITE_SUPABASE_ANON_KEY:-}}"
EMAIL="${TEST_USER_EMAIL:-admin@garagem40.test}"
PASSWORD="${TEST_USER_PASSWORD:-}"

if [[ -z "$SUPABASE_URL" || -z "$ANON_KEY" || -z "$PASSWORD" ]]; then
  echo "❌ Missing env: SUPABASE_URL, SUPABASE_ANON_KEY (or VITE_ prefix), TEST_USER_PASSWORD"
  exit 1
fi

TIMESTAMP() { date -u +"%Y-%m-%dT%H:%M:%S.%3NZ"; }

echo "============================================================"
echo "[$(TIMESTAMP)] AUTH INVALIDATION TEST — $(date -u)"
echo "============================================================"

# ── STEP 1: Obtain access_token ─────────────────────────────────
echo ""
echo "[$(TIMESTAMP)] STEP 1: Login POST /auth/v1/token"
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${EMAIL}\", \"password\": \"${PASSWORD}\"}")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)
BODY=$(echo "$LOGIN_RESPONSE" | head -n -1)
ACCESS_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null)
REFRESH_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('refresh_token',''))" 2>/dev/null)

echo "[$(TIMESTAMP)] Login response status: $HTTP_CODE"
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "❌ Login failed (${HTTP_CODE}): $BODY"
  exit 1
fi
echo "✅ Access token obtained (${#ACCESS_TOKEN} chars)"

# ── STEP 2: Protected endpoint BEFORE logout ──────────────────
echo ""
echo "[$(TIMESTAMP)] STEP 2: Call /auth/v1/user BEFORE logout (expect 200)"
PRE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "${SUPABASE_URL}/auth/v1/user" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")
echo "[$(TIMESTAMP)] Pre-logout status: $PRE_STATUS"

if [[ "$PRE_STATUS" == "200" ]]; then
  echo "✅ Token VALID before logout — HTTP 200"
else
  echo "⚠️ Unexpected status ${PRE_STATUS} before logout"
fi

# ── STEP 3: Logout via signOut ────────────────────────────────
echo ""
echo "[$(TIMESTAMP)] STEP 3: POST /auth/v1/logout (supabase.auth.signOut equivalent)"
LOGOUT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${SUPABASE_URL}/auth/v1/logout" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json")
echo "[$(TIMESTAMP)] Logout HTTP status: $LOGOUT_STATUS"
echo "✅ signOut() sent to Supabase server"

# Allow 1s for server-side token invalidation
sleep 1

# ── STEP 4: Protected endpoint AFTER logout (expect 401/403) ──
echo ""
echo "[$(TIMESTAMP)] STEP 4: Call /auth/v1/user AFTER logout with SAME token (expect 401)"
POST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "${SUPABASE_URL}/auth/v1/user" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")
echo "[$(TIMESTAMP)] Post-logout status: $POST_STATUS"

echo ""
echo "============================================================"
if [[ "$POST_STATUS" == "401" || "$POST_STATUS" == "403" ]]; then
  echo "[$(TIMESTAMP)] ✅ PASS — Auth invalidation CONFIRMED: revoked token got HTTP ${POST_STATUS}"
  exit 0
else
  echo "[$(TIMESTAMP)] ❌ FAIL — token still valid after signOut! Got HTTP ${POST_STATUS}"
  exit 1
fi
echo "============================================================"
