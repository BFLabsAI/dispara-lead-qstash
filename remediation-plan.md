# Remediation Plan - Dispara Lead Production Readiness

Based on the Senior Architect Review, this plan outlines the necessary steps to prepare the codebase for a 24/7 production environment.

## Phase 1: Security Hardening (IMMEDIATE)
**Goal:** Prevent unauthorized data access and secure multi-tenant logic.

- [ ] **Audit & Fix RLS Policies**
    - **Action:** Review `supabase/migrations` for `message_logs_dispara_lead_saas_03` and other critical tables.
    - **Task:** Ensure RLS policies use `auth.uid()` or custom claims to verify tenant access, rather than trusting a client-provided `tenant_id`.
    - **Deliverable:** SQL Migration with strengthened policies.

- [ ] **Secure Impersonation Logic**
    - **Action:** Refactor `getEffectiveTenantId` in `src/services/supabaseClient.ts`.
    - **Task:** Instead of trusting client state, use a secure RPC `switch_tenant` or similar mechanism where the server verifies if the admin *actually* has permission to impersonate that tenant.
    - **Deliverable:** Updated `supabaseClient.ts` and potentially a new Database Function.

## Phase 2: Reliability & Stability (Short Term)
**Goal:** Ensure the system doesn't break when external dependencies (AI Models) fail.

- [ ] **Implement AI Circuit Breaker & Configuration**
    - **Action:** Create a configuration table (`app_config` or similar) in Supabase.
    - **Task:**
        1. Create table to store: `active_ai_models` (JSON array), `system_prompts` (JSON).
        2. Refactor `process-message-ai/index.ts` to fetch this config at runtime (with short caching).
        3. Remove hardcoded prompts and model lists from the code.
    - **Deliverable:** Migration file + Updated Edge Function.

- [ ] **Fix "Shuffle" Logic (Smart Randomization)**
    - **Action:** Improve the model selection logic in `process-message-ai`.
    - **Task:** Implement "Randomized Selection with Fallback".
        1. Fetch active models from DB.
        2. Randomly select the *entry point* model to ensure variety (as requested by user).
        3. If selected model fails, iterate through the remaining models in the list.
    - **Deliverable:** Updated Edge Function logic that guarantees both variety and reliability.

## Phase 3: Architecture & Cleanup (Medium Term)
**Goal:** Improve maintainability and performance before scaling.

- [ ] **Refactor `supabaseClient.ts`**
    - **Action:** Break down the 500+ line "God Object".
    - **Task:**
        1. Extract `getDashboardStats` to `src/hooks/useDashboardStats.ts`.
        2. Extract `fetchDisparadorData` to `src/hooks/useDisparadorData.ts`.
        3. Keep `supabaseClient.ts` strictly for initialization.
    - **Deliverable:** Multiple small, focused files.

- [ ] **Adopt React Query Best Practices**
    - **Action:** Remove manual `Map` caching.
    - **Task:** Replace custom `recentDataCache` and `retryWithBackoff` with standard `useQuery` hooks which already handle caching, deduping, and retries natively.
    - **Deliverable:** Cleaned up Service layer code.

## Phase 4: Observability (Ongoing)
**Goal:** Visibility into production issues.

- [ ] **Structured Logging**
    - **Action:** Implement a standard log format.
    - **Task:** Update `process-message-ai` to log JSON objects instead of strings: `console.log(JSON.stringify({ event: "ai_attempt", model: "gpt-4", status: "success" }))`.
    - **Deliverable:** Standardized logs in Edge Functions.