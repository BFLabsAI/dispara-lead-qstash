# Dispara Lead - High-Performance WhatsApp Marketing SaaS

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-production-green.svg)
![Stack](https://img.shields.io/badge/stack-React%20%7C%20Supabase%20%7C%20QStash-blueviolet)

**Dispara Lead** is a robust, multi-tenant SaaS platform designed for high-volume WhatsApp marketing campaigns. Built for scale, it leverages a serverless architecture to handle thousands of messages per minute without timeouts or bottlenecks.

## 🚀 Key Features

*   **Multi-Tenancy**: Complete data isolation with Row Level Security (RLS) for every tenant.
*   **Scalable Scheduling**: "Fan-out" architecture using **QStash** to schedule massive campaigns instantly without server timeouts.
*   **Real-time Dashboard**: Optimized RPC-based analytics for instant loading of campaign stats (Sent, Failed, AI Usage).
*   **Secure Registration**: Atomic user onboarding flow using Postgres Triggers to guarantee tenant and profile creation.
*   **AI Integration**: Toggleable AI features for message personalization.
*   **Role-Based Access**: Granular permissions for Super Admins and regular users.

## 🛠️ Tech Stack

### Frontend
*   **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
*   **State Management**: [Zustand](https://github.com/pmndrs/zustand) + [TanStack Query](https://tanstack.com/query/latest)

### Backend & Infrastructure
*   **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
*   **Auth**: Supabase Auth
*   **Serverless**: Supabase Edge Functions (Deno)
*   **Queueing**: [Upstash QStash](https://upstash.com/) (for reliable message delivery)
*   **Testing**: [Vitest](https://vitest.dev/) (Integration & Unit)

## 🏗️ Architecture Highlights

### 1. The "Fan-Out" Scheduler
To solve the timeout problem common in serverless functions when processing large loops:
1.  The frontend creates campaign/message logs in Supabase and calls `enqueue-campaign`.
2.  `enqueue-campaign` publishes a minimal payload to **QStash** with `messageId`, `campaignId`, `lead`, and `message`.
3.  **QStash** calls `process-message` or `process-message-ai` asynchronously.
4.  Delivery completion is closed in Postgres through atomic RPCs and counters instead of repeated roundtrips.

### 2. Optimized Dashboard
Instead of fetching thousands of rows to the client:
1.  `Dashboard` and `Logs` load the last `7 days` by default for fast first paint.
2.  Expanded date ranges are fetched server-side only when the user requests them.
3.  Dashboard stats come from `get_dashboard_stats`, backed by a daily materialized view.

### 3. Tenant Isolation
1.  The app resolves an effective tenant for normal and impersonated sessions.
2.  Admin impersonation flows reuse the same tenant resolver as user-facing pages.
3.  Queue processing includes tenant-aware protections such as a per-tenant circuit breaker.

## 🏁 Getting Started

### Prerequisites
*   Node.js 18+
*   Supabase Project
*   Upstash Account (for QStash)

### Installation

1.  **Clone the repo**
    ```bash
    git clone https://github.com/BFLabsAI/dispara-lead-qstash.git
    cd dispara-lead-qstash
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file based on `.env.example`:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

## 🧪 Testing

We use **Vitest** for integration testing, specifically to verify RLS policies and critical flows.

```bash
# Run all tests
npm run test

# Run with UI
npm run test:ui
```

## 📦 Deployment

### Frontend
Deploy to Vercel, Netlify, or any static host.
```bash
npm run build
```

### Backend (Edge Functions)
Deploy functions to Supabase:
```bash
supabase functions deploy enqueue-campaign
supabase functions deploy process-message
supabase functions deploy process-message-ai
```

### SQL Runbooks
For environments where `supabase db pull` is blocked by Docker or migration drift, use the documented SQL runbooks in `tasks/2026-03-12_SQL_EDITOR_RUNBOOK.md` and `tasks/2026-03-12_SQL_EDITOR_RUNBOOK_PHASE2_COUNTERS_BREAKER_MV.md`.

## 📈 Observability

*   Campaign completion currently represents the end of processing for the batch, not guaranteed successful delivery of every message.
*   Operational reading should prioritize `sent_count` and `failed_count` when available.
*   QStash processing stays serial per campaign; campaigns are not executed in parallel.

## 🔒 Security

*   **RLS**: Enabled on all tables. Users can only access their own tenant's data.
*   **Triggers**: Critical data integrity managed by database triggers.
*   **Secrets**: All sensitive keys (QStash tokens, Service Roles) are stored in Supabase Vault/Secrets, never in the client.

---

Built with ❤️ by **BFLabsAI**
