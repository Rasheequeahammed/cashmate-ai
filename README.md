# CASHMATE AI

CASHMATE AI is a browser-based financial management application for small businesses. It supports customer records, invoicing and payments, expense tracking, dashboard reporting, and cash-flow forecasts with what-if scenarios. Supabase provides authentication and data storage; row-level security protects business data.

## Current functionality

- Register and log in with email and password through Supabase Auth.
- Require authentication for application routes.
- Guide new users through business profile onboarding.
- Store each user's business profile in Supabase with row-level security.
- Manage customers, invoices, payments, one-time expenses, and recurring expense schedules.
- Review dashboard KPIs and revenue-versus-expense history.
- Forecast cash flow over 30, 60, or 90 days, review forecast assumptions, and simulate changes such as delayed customer payments.
- Use a role-protected, read-only admin view of business profiles.

## Technology

- React 18 and TypeScript
- Vite 5
- React Router 6
- Tailwind CSS 3
- TanStack Query 5 and Recharts 3
- Supabase JavaScript client for authentication and database access

This repository is a JavaScript/TypeScript project. `requirements.txt` is included for tooling that expects the filename, but no Python packages are required. Use `package.json` and `package-lock.json` for the application dependencies.

## Prerequisites

- Node.js 18 or newer
- npm
- A Supabase project

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env` and set the public Supabase project URL and anon key:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   These values are required when the app starts. Do not put a Supabase service role key or other secret in a `VITE_` variable; Vite exposes those variables to browser code.

3. Apply the migrations in `supabase/migrations/` in order. They create the business, customer, invoice, payment, and expense data model with row-level security. Migration `012_admin_access.sql` adds the read-only admin query policy.

4. Start the development server:

   ```sh
   npm run dev
   ```

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Vite development server |
| `npm run build` | Type-check the app and create a production build in `dist/` |
| `npm run preview` | Serve the production build locally |

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/login` | Signed out | Sign in to an existing account |
| `/register` | Signed out | Create an account |
| `/onboarding` | Signed in | Create the user's business profile |
| `/dashboard` | Signed in with a business profile | Financial dashboard |
| `/customers` | Signed in with a business profile | Customer management |
| `/invoices` | Signed in with a business profile | Invoices and payment recording |
| `/expenses` | Signed in with a business profile | One-time and recurring expense management |
| `/forecast` | Signed in with a business profile | 30/60/90-day forecast and what-if simulations |
| `/admin` | Signed in and explicitly assigned admin | Read-only business profile administration |

Unknown routes redirect to the application root, which routes signed-in users to the dashboard.

## Repository layout

```text
src/
  components/       Shared UI, dashboard, and forecast components
  contexts/         Supabase auth and business profile state
  hooks/            Context access hooks
  lib/              Supabase client, finance calculations, utilities, business types
  pages/            Login, registration, onboarding, dashboard, admin, customers, invoices, expenses, forecast
supabase/
  migrations/       Database schema and row-level security policies
PRD.md              Product requirements and roadmap
```

## Product specification

Read [PRD.md](PRD.md) for the product scope, database design, financial rules, security requirements, and roadmap. Some planned AI and future-scope features are not implemented yet.

## Provision the first administrator

Administrator access is not granted by frontend configuration. After applying `012_admin_access.sql` and creating the intended account through the normal registration flow, use the Supabase SQL Editor as a trusted project owner to assign that user's Auth UUID:

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'admin@example.com'
on conflict (user_id) do nothing;
```

Replace the email with the account to authorize. The account can then open `/admin` or use the administration link in the app navigation. The current admin page is read-only and covers business profiles; the other business data tables are not included in its views yet. Supabase RLS independently enforces admin checks for cross-account reads.
