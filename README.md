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
To solve the "timeout" problem common in serverless functions when processing large loops:
1.  **Frontend** sends a campaign request to `process-scheduler`.
2.  **Scheduler** validates the request and logs all messages as `pending` in bulk.
3.  **Scheduler** pushes individual message tasks to **QStash** in batches (Fan-out).
4.  **QStash** asynchronously calls the `process-message` function for each message, handling retries and rate limits.

### 2. Optimized Dashboard
Instead of fetching thousands of rows to the client:
1.  **Frontend** calls a Postgres RPC function `get_dashboard_stats`.
2.  **Database** aggregates millions of records in milliseconds.
3.  **Frontend** receives a tiny JSON payload with the final numbers.

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
supabase functions deploy process-scheduler
supabase functions deploy process-message
```

## 🔒 Security

*   **RLS**: Enabled on all tables. Users can only access their own tenant's data.
*   **Triggers**: Critical data integrity managed by database triggers.
*   **Secrets**: All sensitive keys (QStash tokens, Service Roles) are stored in Supabase Vault/Secrets, never in the client.

---

Built with ❤️ by **BFLabsAI**
