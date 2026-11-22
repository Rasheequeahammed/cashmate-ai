# CASHMATE AI

<<<<<<< HEAD
CASHMATE AI is a browser-based financial management application for small businesses. It supports customer records, invoicing and payments, expense tracking, dashboard reporting, and cash-flow forecasts with what-if scenarios. Supabase provides authentication and data storage; row-level security protects business data.
=======
> **Your Business Finances. One Intelligent Workspace.**
>>>>>>> b9b1702 (Update project README)

[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Vitest-53%20Passed-6e9f18?logo=vitest&logoColor=white)](https://vitest.dev/)

<<<<<<< HEAD
- Register and log in with email and password through Supabase Auth.
- Require authentication for application routes.
- Guide new users through business profile onboarding.
- Store each user's business profile in Supabase with row-level security.
- Manage customers, invoices, payments, one-time expenses, and recurring expense schedules.
- Review dashboard KPIs and revenue-versus-expense history.
- Forecast cash flow over 30, 60, or 90 days, review forecast assumptions, and simulate changes such as delayed customer payments.
- Use a role-protected, read-only admin view of business profiles.
=======
CASHMATE AI is a modern, responsive financial management and cash flow intelligence platform engineered for small businesses, startups, and independent founders. It centralizes customer directories, invoice generation, payment tracking, categorized expense recording, and predictive cash flow forecasting into a unified workspace.
>>>>>>> b9b1702 (Update project README)

All financial arithmetic runs on a **deterministic, integer-paise calculation engine** with server-side validation and Supabase Row Level Security (RLS) to guarantee complete data isolation and accuracy.

<<<<<<< HEAD
- React 18 and TypeScript
- Vite 5
- React Router 6
- Tailwind CSS 3
- TanStack Query 5 and Recharts 3
- Supabase JavaScript client for authentication and database access
=======
---
>>>>>>> b9b1702 (Update project README)

## Table of Contents

- [Core Capabilities](#core-capabilities)
- [System Architecture & Tech Stack](#system-architecture--tech-stack)
- [Repository Structure](#repository-structure)
- [Application Route Map](#application-route-map)
- [Database Schema & Migrations](#database-schema--migrations)
- [Financial Engine & Principles](#financial-engine--principles)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone and Install Dependencies](#1-clone-and-install-dependencies)
  - [2. Configure Environment Variables](#2-configure-environment-variables)
  - [3. Apply Database Migrations](#3-apply-database-migrations)
  - [4. Provision the Administrator Account](#4-provision-the-administrator-account)
  - [5. Run Development Server](#5-run-development-server)
- [Available Scripts](#available-scripts)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Production & Deployment](#production--deployment)
- [Roadmap & Specifications](#roadmap--specifications)
- [License](#license)

---

## Core Capabilities

### 📊 Executive Financial Dashboard
- **Key Metric Cards**: Instant visibility into *Total Outstanding Receivables*, *Revenue This Month*, *Expenses This Month*, and *Net Cash Movement*.
- **Visual Analytics**: Interactive 6-month historical revenue versus expense trajectory powered by Recharts.
- **Actionable Invoicing Overview**: Instant lists of recent invoices and prioritized urgent overdue accounts requiring attention.

### 👥 Customer Directory
- Centralized client management with billing contacts, phone numbers, addresses, and customer-specific notes.
- Direct linkage to invoices and receivable reports.

### 🧾 Invoice Generation & Payment Lifecycle
- Full invoice creation with dynamic multi-line item entries and automatic subtotal calculations.
- Comprehensive status tracking: `draft` ➔ `sent` ➔ `partially_paid` ➔ `paid` ➔ `overdue`.
- Built-in payment modal supporting UPI, Bank Transfer, Cash, and Other methods.
- **Atomic updates** executed via a PostgreSQL stored procedure (`record_payment` RPC) ensuring consistent amounts and status transitions without race conditions.

### 💸 One-Time & Recurring Expense Management
- Categorized expense logging (Rent, Salaries, Utilities, Marketing, Travel, Supplies, Software, and Other).
- Dedicated recurring expense schedules with frequency configuration (`weekly`, `monthly`, `quarterly`, `annually`) and active status toggling.

### 🔮 Cash Flow Forecasting & What-If Engine
- **Predictive Horizons**: Dynamic 30, 60, and 90-day cash flow projections combining expected invoice collections with recurring expenditure schedules.
- **Adjustable Opening Balance**: Model cash positions starting from any current cash-in-hand baseline.
- **What-If Scenario Simulation**: Test the impact of delayed customer payments on future liquidity, predicting cash shortfall dates before they occur.
- **Timezone-Safe Dates**: All date boundaries anchored to Indian Standard Time (IST / UTC+05:30) to eliminate timezone shift anomalies.

### 🛡️ Multi-Tenant Security & Administration
- Strict PostgreSQL Row-Level Security (RLS) guaranteeing complete tenant isolation across all tables.
- Role-based administration dashboard (`/admin`) for authorized platform administrators managed through `public.admin_users`.

---

## System Architecture & Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend Framework** | React 18.3 & TypeScript 5.9 | Type-safe UI components and robust application state |
| **Bundler & Tooling** | Vite 5.4 | Ultra-fast local HMR and optimized production bundling |
| **Styling & Icons** | Tailwind CSS 3.4 & Lucide React | Clean, responsive design optimized for mobile, tablet, and desktop |
| **Data Fetching** | TanStack React Query 5 | Optimistic updates, background caching, and automatic invalidation |
| **Data Visualization** | Recharts 3.11 | Responsive SVG charts for financial cash flow analytics |
| **Backend & Database** | Supabase (PostgreSQL 15+) | Managed PostgreSQL, Row Level Security (RLS), and Auth |
| **Database Operations** | PL/pgSQL Stored Procedures | `SECURITY DEFINER` atomic RPC functions for transaction integrity |
| **Test Suite** | Vitest 2.1 | Fast unit testing for financial math, simulations, and date windowing |

---

## Repository Structure

```text
CASHMATE AI/
├── src/
│   ├── components/            # UI and layout components
│   │   ├── dashboard/         # Dashboard KPI cards, charts, and invoice lists
│   │   ├── forecast/          # Forecast chart, assumptions, and What-If controls
│   │   ├── ui/                # Base UI components (alert, button, card, input, label)
│   │   ├── BusinessGate.tsx   # Enforces business profile onboarding check
│   │   ├── Navbar.tsx         # Responsive application navigation header
│   │   ├── ProtectedRoute.tsx # Route guard requiring Supabase authentication
│   │   └── PublicOnlyRoute.tsx# Route guard redirecting authenticated users to app
│   ├── contexts/              # React context providers
│   │   ├── AuthContext.tsx    # Supabase session and user state
│   │   └── BusinessContext.tsx# Active business profile state and creation handler
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAdminAccess.ts  # Verification of admin privilege
│   │   ├── useAuth.ts         # Authentication context consumer
│   │   ├── useBusiness.ts     # Business context consumer
│   │   ├── useDashboardData.ts# TanStack query for dashboard analytics
│   │   └── useForecastData.ts # TanStack query for forecast datasets
│   ├── lib/                   # Utility libraries and financial engine
│   │   ├── dashboard/         # Data fetchers and mappers
│   │   ├── finance/           # Deterministic financial calculation engine
│   │   │   ├── calculations.ts# Financial summaries (revenue, receivables, expenses)
│   │   │   ├── dateWindows.ts # IST-anchored financial date boundaries
│   │   │   ├── forecast.ts    # 30/60/90-day cash projection algorithms
│   │   │   ├── money.ts       # Integer paise parsing and INR currency formatting
│   │   │   └── simulation.ts  # What-If delayed payment simulation engine
│   │   ├── businessTypes.ts   # Supported business categories and validation
│   │   ├── queryClient.ts     # TanStack React Query singleton client
│   │   ├── supabase.ts        # Supabase JavaScript client instance
│   │   └── utils.ts           # Class merging utilities (`cn`)
│   ├── pages/                 # Full application page views
│   │   ├── AdminPage.tsx      # Platform administration console
│   │   ├── CustomersPage.tsx  # Customer directory management
│   │   ├── DashboardPlaceholder.tsx # Main executive dashboard
│   │   ├── ExpensesPage.tsx   # One-time and recurring expense tracker
│   │   ├── ForecastPage.tsx   # Predictive cash flow forecasting & simulation
│   │   ├── InvoicesPage.tsx   # Invoice creation and payment logging
│   │   ├── LoginPage.tsx      # User authentication login
│   │   ├── OnboardingPage.tsx # Business profile creation workflow
│   │   └── RegisterPage.tsx   # Account registration
│   ├── App.tsx                # Master routing definition
│   └── main.tsx               # Application entry point
├── supabase/
│   └── migrations/            # Ordered PostgreSQL migration scripts
├── PRD.md                     # Comprehensive Product Requirements Document
├── package.json               # Dependencies and scripts
├── tailwind.config.js         # Tailwind CSS styling configuration
├── tsconfig.json              # TypeScript configuration
├── vercel.json                # Vercel SPA routing rewrite configuration
└── vite.config.ts             # Vite build configuration
```

---

## Application Route Map

| Route | Access Level | Description |
|---|---|---|
| `/login` | Public Only | Sign in to an existing user account |
| `/register` | Public Only | Register a new user account via Supabase Auth |
| `/onboarding` | Authenticated | Create initial business profile (name, industry, owner, phone) |
| `/dashboard` | Authenticated + Business | Executive financial dashboard (KPIs, charts, invoice lists) |
| `/customers` | Authenticated + Business | Customer directory with creation and contact inspection |
| `/invoices` | Authenticated + Business | Invoicing management, line items, and payment recording modal |
| `/payments` | Authenticated + Business | Convenience redirect pointing to `/invoices` |
| `/expenses` | Authenticated + Business | One-time categorized expenses and recurring scheduled payments |
| `/forecast` | Authenticated + Business | 30/60/90-day cash flow forecast and What-If delayed payment simulator |
| `/admin` | Authenticated + Admin Role | Read-only administration across registered business profiles |

---

## Database Schema & Migrations

All database tables, constraints, and Row-Level Security policies are organized into sequential migration scripts under `supabase/migrations/`:

| Migration File | Description |
|---|---|
| `001_create_businesses.sql` | Business profile table linked to `auth.users(id)` with tenant isolation |
| `002_create_customers.sql` | Customer records associated with each business |
| `003_create_invoices.sql` | Invoices table with status checks, due dates, and amount tracking |
| `004_create_invoice_items.sql` | Line items belonging to invoices with automatic totals |
| `005_create_payments.sql` | Payment receipts against invoices |
| `006_create_expenses.sql` | One-time categorized business expenses |
| `007_create_recurring_expenses.sql` | Recurring expense commitments with frequencies and active flags |
| `008_security_hardening.sql` | Tightened RLS policies ensuring users access only their own business records |
| `009_create_indexes.sql` | Performance indexes on foreign keys, dates, and query filter columns |
| `011_create_payment_rpc.sql` | `record_payment()` atomic stored procedure (`SECURITY DEFINER`) |
| `012_admin_access.sql` | `admin_users` table and RLS policies for platform administrators |

---

## Financial Engine & Principles

To guarantee that CASHMATE AI delivers accurate, bank-grade financial reporting, the application adheres to strict architectural rules:

1. **Integer-Paise Precision (`money.ts`)**:
   All monetary amounts are converted and stored as integer paise (`1 INR = 100 paise`). Arithmetic is strictly integer-based to eliminate IEEE 754 floating-point rounding errors. Currency values are displayed using standard Indian Rupee formatting (`₹1,23,456.78`).

2. **Atomic Payment Processing (`011_create_payment_rpc.sql`)**:
   Payments cannot be inserted via direct client writes to the `payments` table. All payments must execute through the `record_payment()` stored procedure, which atomically:
   - Validates business ownership and user authorization.
   - Prevents overpayments exceeding the invoice's outstanding balance.
   - Updates `amount_paid`, recalculates `outstanding_balance`, and transitions the invoice status (`partially_paid` or `paid`).
   - Inserts the audit payment record.

3. **IST Timezone Discipline (`dateWindows.ts`)**:
   Financial month intervals and payment due dates are calculated against Indian Standard Time (`UTC+05:30`), preventing date shifts that can occur when client browsers run in UTC or western timezones.

4. **Forecasting & What-If Simulations (`forecast.ts`, `simulation.ts`)**:
   - Projected cash flow combines outstanding eligible invoices (due within the horizon) and recurring expenses generated across the selected window.
   - What-If simulations allow business owners to stress-test their liquidity: shifting a client invoice payment by 15, 30, or 45 days instantly reveals whether the company will experience a negative cash balance.

---

## Prerequisites

- **Node.js**: `v18.0.0` or higher (Node.js 20+ recommended)
- **Package Manager**: `npm` (comes with Node.js) or `pnpm`
- **Supabase Account**: A free Supabase project at [supabase.com](https://supabase.com) (or a local Supabase CLI instance)

---

## Getting Started

### 1. Clone and Install Dependencies

<<<<<<< HEAD
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
=======
```sh
git clone https://github.com/your-username/cashmate-ai.git
cd cashmate-ai
npm install
>>>>>>> b9b1702 (Update project README)
```

### 2. Configure Environment Variables

<<<<<<< HEAD
Read [PRD.md](PRD.md) for the product scope, database design, financial rules, security requirements, and roadmap. Some planned AI and future-scope features are not implemented yet.
=======
Copy the provided `.env.example` file to create your local `.env`:
>>>>>>> b9b1702 (Update project README)

```sh
cp .env.example .env
```

Open `.env` and fill in your Supabase credentials:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

> **Security Note**: Never add the Supabase `service_role` key to `.env`. Only the public `anon` key should be used in frontend applications.

### 3. Apply Database Migrations

Apply the migration scripts located in `supabase/migrations/` in ascending numerical order (`001` through `012`). You can execute them via:
- **Supabase Web Dashboard**: Navigate to the **SQL Editor**, paste each migration file's contents, and click **Run**.
- **Supabase CLI**: If using the CLI, run `supabase db push` or `supabase migration up`.

### 4. Provision the Administrator Account

To grant an account access to the `/admin` view:
1. Register a user through the app's `/register` page (e.g., `admin@example.com`).
2. In the Supabase SQL Editor, run the following query:

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'admin@example.com'
on conflict (user_id) do nothing;
```

Once executed, that account will see the **Admin** navigation tab and have read-only visibility into all registered business profiles.

### 5. Run Development Server

Start the local Vite development server:

```sh
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to start using CASHMATE AI.

---

## Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Starts the local Vite development server with hot-module replacement |
| `npm test` | Runs the full Vitest automated test suite |
| `npm run build` | Runs TypeScript compilation (`tsc -b`) and creates an optimized production bundle in `dist/` |
| `npm run preview` | Locally serves the production build for smoke testing |

---

## Testing & Quality Assurance

CASHMATE AI includes a comprehensive Vitest unit test suite covering core financial arithmetic, IST date window calculations, forecasting models, and What-If simulations.

Execute the test suite with:

```sh
npm test
```

### Test Coverage Highlights:
- **`money.test.ts`**: Verifies exact INR formatting, paise conversion, decimal sanitization, and invalid input rejection.
- **`calculations.test.ts`**: Tests accurate summing of receivables, monthly revenue, one-time expenses, and net cash movement.
- **`dateWindows.test.ts`**: Verifies 6-month historical boundaries and IST-accurate date mathematics.
- **`forecast.test.ts`**: Validates 30/60/90-day cash projections, recurring expense occurrences, and net balance trajectories.
- **`simulation.test.ts`**: Tests delayed payment impacts, out-of-window payment shifts, and negative cash dip detection.
- **`mappers.test.ts`**: Ensures robust transformation of raw Supabase records into UI-ready dashboard formats.

---

## Production & Deployment

### Build for Production

```sh
npm run build
```

This compiles TypeScript and outputs minified static assets to the `dist/` directory.

### Deploying to Vercel
The repository includes a ready-to-use [`vercel.json`](vercel.json) configured for Single-Page Application (SPA) routing:

1. Push your repository to GitHub / GitLab.
2. Import the project into [Vercel](https://vercel.com/).
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Vercel's **Environment Variables**.
4. Deploy!

---

## Roadmap & Specifications

The complete specification, technical decisions, and roadmap are detailed in [PRD.md](PRD.md).

- [x] Multi-tenant Supabase authentication & onboarding
- [x] Financial command dashboard with live KPI metrics and trend charts
- [x] Customer management directory
- [x] Multi-line invoicing with status lifecycle
- [x] Atomic payment recording via PostgreSQL RPC
- [x] Categorized one-time and recurring expense scheduling
- [x] 30/60/90-day cash flow forecast engine
- [x] What-If delayed payment liquidity simulation
- [x] Admin console with cross-tenant business review
- [ ] AI-assisted receipt scanning and expense OCR
- [ ] Automated payment reminder email/WhatsApp generation
- [ ] Natural language conversational financial query assistant

---

## License

This project was built for hackathon demonstration. Refer to project repository terms or contact the development team for distribution details.
