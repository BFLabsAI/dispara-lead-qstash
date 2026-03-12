#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env.local"
  exit 1
fi

if [[ -z "${TEST_EMAIL:-}" || -z "${TEST_PASSWORD:-}" ]]; then
  echo "Set TEST_EMAIL and TEST_PASSWORD before running"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

if [[ -z "${VITE_SUPABASE_URL:-}" || -z "${VITE_SUPABASE_ANON_KEY:-}" ]]; then
  echo "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local"
  exit 1
fi

REPORT_DIR="$ROOT_DIR/tasks"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
REPORT_FILE="$REPORT_DIR/${TIMESTAMP}_post_deploy_terminal_validation.md"

AUTH_RESPONSE="$(
  curl -sS "${VITE_SUPABASE_URL}/auth/v1/token?grant_type=password" \
    -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}"
)"

ACCESS_TOKEN="$(printf '%s' "$AUTH_RESPONSE" | jq -r '.access_token // empty')"
USER_ID="$(printf '%s' "$AUTH_RESPONSE" | jq -r '.user.id // empty')"
FUNCTION_BEARER="${VITE_SUPABASE_ANON_KEY}"

if [[ -z "$ACCESS_TOKEN" ]]; then
  echo "Failed to get access token"
  printf '%s\n' "$AUTH_RESPONSE"
  exit 1
fi

call_json() {
  local method="$1"
  local url="$2"
  local auth_mode="${3:-user}"
  local body="${4:-}"

  local tmp_body
  tmp_body="$(mktemp)"

  local -a args
  args=(-sS -X "$method" "$url" -H "apikey: ${VITE_SUPABASE_ANON_KEY}")

  if [[ "$auth_mode" == "user" ]]; then
    args+=(-H "Authorization: Bearer ${ACCESS_TOKEN}")
  else
    args+=(-H "Authorization: Bearer smoke-test")
  fi

  if [[ -n "$body" ]]; then
    args+=(-H "Content-Type: application/json" -d "$body")
  fi

  local status
  status="$(curl "${args[@]}" -o "$tmp_body" -w '%{http_code}')"
  local response
  response="$(cat "$tmp_body")"
  rm -f "$tmp_body"

  printf '%s\n%s' "$status" "$response"
}

read_result() {
  local raw="$1"
  RESULT_STATUS="$(printf '%s' "$raw" | head -n1)"
  RESULT_BODY="$(printf '%s' "$raw" | tail -n +2)"
}

ENQUEUE_RAW="$(
  curl -sS -X POST "${VITE_SUPABASE_URL}/functions/v1/enqueue-campaign" \
    -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${FUNCTION_BEARER}" \
    -H "Content-Type: application/json" \
    -d '{"messages":[]}' \
    -w $'\n%{http_code}'
)"
ENQUEUE_STATUS="$(printf '%s' "$ENQUEUE_RAW" | tail -n1)"
ENQUEUE_BODY="$(printf '%s' "$ENQUEUE_RAW" | sed '$d')"

PROCESS_RAW="$(
  curl -sS -X POST "${VITE_SUPABASE_URL}/functions/v1/process-message" \
    -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${FUNCTION_BEARER}" \
    -H "Content-Type: application/json" \
    -d '{"messageId":"00000000-0000-0000-0000-000000000001"}' \
    -w $'\n%{http_code}'
)"
PROCESS_STATUS="$(printf '%s' "$PROCESS_RAW" | tail -n1)"
PROCESS_BODY="$(printf '%s' "$PROCESS_RAW" | sed '$d')"

PROCESS_AI_RAW="$(
  curl -sS -X POST "${VITE_SUPABASE_URL}/functions/v1/process-message-ai" \
    -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${FUNCTION_BEARER}" \
    -H "Content-Type: application/json" \
    -d '{"messageId":"00000000-0000-0000-0000-000000000001"}' \
    -w $'\n%{http_code}'
)"
PROCESS_AI_STATUS="$(printf '%s' "$PROCESS_AI_RAW" | tail -n1)"
PROCESS_AI_BODY="$(printf '%s' "$PROCESS_AI_RAW" | sed '$d')"

WEBHOOK_PAYLOAD='{"eventType":"messages","instanceName":"smoke-test-instance","message":{"id":"smoke-message-1","key":{"id":"smoke-message-1","remoteJid":"5585999999999@s.whatsapp.net","fromMe":false},"text":"smoke","messageType":"text","timestamp":1710000000}}'
WEBHOOK_RAW="$(call_json "POST" "${VITE_SUPABASE_URL}/functions/v1/webhook_messages_dispara_lead_saas" "anon" "$WEBHOOK_PAYLOAD" )"
read_result "$WEBHOOK_RAW"
WEBHOOK_STATUS="$RESULT_STATUS"
WEBHOOK_BODY="$RESULT_BODY"

RPC_PAYLOAD='{"p_campaign_id":"00000000-0000-0000-0000-000000000111","p_current_message_id":"00000000-0000-0000-0000-000000000222","p_completed_at":"2026-03-12T12:00:00.000Z"}'
RPC_RAW="$(call_json "POST" "${VITE_SUPABASE_URL}/rest/v1/rpc/complete_campaign_if_finished" "user" "$RPC_PAYLOAD" )"
read_result "$RPC_RAW"
RPC_STATUS="$RESULT_STATUS"
RPC_BODY="$RESULT_BODY"

LOGS_RAW="$(call_json "GET" "${VITE_SUPABASE_URL}/rest/v1/message_logs_dispara_lead_saas_03?select=id,campaign_id,status,tenant_id,created_at&order=created_at.desc&limit=3" "user" )"
read_result "$LOGS_RAW"
LOGS_STATUS="$RESULT_STATUS"
LOGS_BODY="$RESULT_BODY"

CAMPAIGNS_RAW="$(call_json "GET" "${VITE_SUPABASE_URL}/rest/v1/campaigns_dispara_lead_saas_02?select=id,name,status,tenant_id,completed_at&order=created_at.desc&limit=3" "user" )"
read_result "$CAMPAIGNS_RAW"
CAMPAIGNS_STATUS="$RESULT_STATUS"
CAMPAIGNS_BODY="$RESULT_BODY"

cat > "$REPORT_FILE" <<EOF
# Post Deploy Terminal Validation

- Timestamp: \`${TIMESTAMP}\`
- User: \`<ADMIN_EMAIL>\`
- User ID: \`<AUTH_USER_ID>\`
- Base URL: \`https://<SUPABASE_PROJECT_REF>.supabase.co\`

## Results

### enqueue-campaign
- Status: \`${ENQUEUE_STATUS}\`
- Body:
\`\`\`json
${ENQUEUE_BODY}
\`\`\`

### process-message
- Status: \`${PROCESS_STATUS}\`
- Body:
\`\`\`
${PROCESS_BODY}
\`\`\`

### process-message-ai
- Status: \`${PROCESS_AI_STATUS}\`
- Body:
\`\`\`
${PROCESS_AI_BODY}
\`\`\`

### webhook_messages_dispara_lead_saas
- Status: \`${WEBHOOK_STATUS}\`
- Body:
\`\`\`
${WEBHOOK_BODY}
\`\`\`

### RPC complete_campaign_if_finished
- Status: \`${RPC_STATUS}\`
- Body:
\`\`\`json
${RPC_BODY}
\`\`\`

### Recent message logs
- Status: \`${LOGS_STATUS}\`
- Body:
\`\`\`json
${LOGS_BODY}
\`\`\`

### Recent campaigns
- Status: \`${CAMPAIGNS_STATUS}\`
- Body:
\`\`\`json
${CAMPAIGNS_BODY}
\`\`\`
EOF

echo "Report written to: $REPORT_FILE"
