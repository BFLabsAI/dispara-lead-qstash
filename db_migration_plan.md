# Database Migration Plan

## Context
The current production database (`iixeygzkgfwetchjvpvo`) is a shared environment hosting multiple applications (e.g., "Rastreia Lead", "FenApp"). This migration aims to extract ONLY the schema and functions relevant to the "Dispara Lead" application to create a clean, isolated codebase state.

## Strategy: Selective Extraction
We will not perform a full database dump. Instead, we have identified the specific tables and functions used by the "Dispara Lead" application codebase (`src/**`).

### Included Tables
The following tables are identified as core dependencies and will be included in the migration:

1.  **Core Multi-tenancy**
    -   `plans_dispara_lead_saas_02`
    -   `tenants_dispara_lead_saas_02`
    -   `users_dispara_lead_saas_02`
    -   `company_settings_dispara_lead_saas_02`

2.  **Messaging & Campaigns**
    -   `instances_dispara_lead_saas_02`
    -   `campaigns_dispara_lead_saas_02`
    -   `message_logs_dispara_lead_saas_03` (Note: Version 03 is the active one)
    -   `email_templates_dispara_lead_saas`

3.  **Audience Management**
    -   `audiences_dispara_lead_saas_02`
    -   `audience_tags_dispara_lead_saas_02`
    -   `audience_contacts_dispara_lead_saas_02`
    -   `tags_dispara_lead_saas_02`

4.  **Chat & AI Agents**
    -   `chat_sessions_dispara_lead_saas_02`
    -   `chat_messages_dispara_lead_saas_02`

### Excluded Tables
All tables related to other projects (e.g., `rastreia_lead_*`, `fenapp_*`, and legacy `_01` tables) are EXCLUDED.

## Functions & Logic
The following PL/PGSQL functions are essential for RLS and application logic and will be migrated:
-   `get_my_tenant_id()`: Retrieves tenant ID for the current authenticated user.
-   `is_super_admin()`: Checks if the current user has super admin privileges.
-   `get_current_tenant_id()`: (Alias/Helper) Used in RLS policies.
-   `is_user_super_admin()`: (Alias/Helper) Used in RLS policies.

## Migration Steps
1.  **Consolidated Schema File**: A new migration file `20260106120000_consolidated_dispara_schema.sql` has been created. This file contains:
    -   `CREATE TABLE IF NOT EXISTS` statements for all included tables.
    -   Full column definitions including types, defaults, and constraints.
    -   Foreign Key relationships.
    -   RLS enablement and Policy definitions.
2.  **Function Definitions**: All required functions are defined in the `database_functions.md` document and included in the migration SQL.
3.  **Execution**: Run `supabase db push` to apply this schema to a new, clean Supabase project.

## Data Migration (Note)
As requested, user data will NOT be migrated automatically. You will recreate users/tenants in the new environment. The schema migration ensures the *structure* is ready to receive this new data.
