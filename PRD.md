# CASHMATE AI — Product Requirements Document (PRD)

> **Version:** 1.1
> **Date:** 2026-11-21
> **Status:** APPROVED FOR DEVELOPMENT
> **Tagline:** Your Business Finances. One Intelligent Workspace.

---

## How to Use This Document

This PRD is the **single source of truth** for all development work on CASHMATE AI.

**Rules for every development chat:**
1. Read `PRD.md` in full before starting any work.
2. Implement only what is specified here for the MVP.
3. Do not introduce new dependencies or patterns not listed here.
4. Follow the two-developer task allocation in Section 19.
5. Follow the 24-hour roadmap in Section 20.
6. After completing each feature, verify acceptance criteria before moving on.
7. Open decisions must remain as open decisions until formally resolved.

---

## Version History

| Version | Date       | Author      | Notes                        |
|---------|------------|-------------|------------------------------|
| 1.0     | 2026-11-21 | Team        | Initial approved specification |
| 1.1     | 2026-11-21 | Team        | Six corrections: server-side payment RPC, integer-paise arithmetic, forecast invoice eligibility, what-if delay scenario, recurring expense separation, dashboard KPI rename. Four additional safeguards: direct paise parsing, atomic RPC validation, out-of-window payment shift handling, strict actuals/schedule separation. |

---

## Open Decisions Log

> Items listed here are unresolved and must be decided before the relevant feature is built.

| ID  | Section | Decision Required | Impact |
|-----|---------|-------------------|--------|
| OD-01 | §14 | Gemini API key availability and quota limits must be confirmed before AI features are built | AI features (NL entry, reminders, insights) may need to be deferred or mocked if key is unavailable |
| OD-02 | §13 | Whether to store AI prompt/response logs in Supabase for audit purposes | Adds `ai_logs` table if yes |
| OD-03 | §15 | Whether to include an optional `tax_rate` field on invoices (basic %) for businesses that need it | Low risk; can be added as a nullable column without enabling full GST logic |
| OD-04 | §9 | Dark mode support — include in MVP or defer | UI effort only; Tailwind supports it trivially |
| OD-05 | §11 | Supabase Edge Function runtime — Deno (default) confirmed; ensure Gemini SDK compatibility | Affects AI integration implementation |

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Problem Statement](#2-problem-statement)
3. [Target Audience](#3-target-audience)
4. [Product Objectives](#4-product-objectives)
5. [Functional Requirements](#5-functional-requirements)
6. [MVP Features](#6-mvp-features)
7. [Future Scope](#7-future-scope)
8. [User Onboarding Workflow](#8-user-onboarding-workflow)
9. [Application Screens and Navigation](#9-application-screens-and-navigation)
10. [Mobile Responsiveness Requirements](#10-mobile-responsiveness-requirements)
11. [Technology Stack](#11-technology-stack)
12. [System Architecture](#12-system-architecture)
13. [Database Structure](#13-database-structure)
14. [AI Integration Requirements](#14-ai-integration-requirements)
15. [Financial Calculation Rules](#15-financial-calculation-rules)
16. [Security Requirements](#16-security-requirements)
17. [Testing Strategy](#17-testing-strategy)
18. [Deployment Strategy](#18-deployment-strategy)
19. [Two-Developer Task Allocation](#19-two-developer-task-allocation)
20. [24-Hour Hackathon Development Roadmap](#20-24-hour-hackathon-development-roadmap)
- [Appendix A — Sample Data](#appendix-a--sample-data)
- [Appendix B — Glossary](#appendix-b--glossary)

---

## 1. Product Overview

### 1.1 Summary

CASHMATE AI is an AI-powered financial management platform built for small businesses. It consolidates customer management, invoicing, payment tracking, expense management, and cash flow forecasting into a single, intelligent workspace. AI features assist with data entry, reminders, and insights — but all financial logic is deterministic and controlled by the application.

### 1.2 Tagline

**Your Business Finances. One Intelligent Workspace.**

### 1.3 Core Value Proposition

| Without CASHMATE AI | With CASHMATE AI |
|---|---|
| Invoices tracked in spreadsheets | Invoices created and tracked in one place |
| Manual payment follow-up | AI-drafted payment reminders |
| No cash flow visibility | 30/60/90-day forecasts with assumptions |
| Expenses scattered across notes | One-time and recurring expenses in one view |
| No financial insights | AI-generated plain-language insights |

### 1.4 Platform Type

Responsive web application. Optimized for desktop use but fully functional on mobile and tablet. No native mobile app for the MVP.

---

## 2. Problem Statement

Small business owners — freelancers, retailers, contractors, and agencies — routinely face:

1. **Fragmented tools** — Invoices in one app, payments noted elsewhere, expenses in a spreadsheet.
2. **Poor cash flow visibility** — No forecasting; businesses only know they are in trouble after the fact.
3. **Manual and error-prone data entry** — Time-consuming; leads to missed invoices and unpaid amounts.
4. **Late payments** — No systematic reminders; owners feel awkward following up manually.
5. **No financial insights** — Owners cannot identify trends, top customers, or risk periods.

CASHMATE AI solves these problems by providing a single, affordable, AI-assisted platform that handles the full financial operations lifecycle of a small business — from issuing the first invoice to forecasting next quarter's cash position.

---

## 3. Target Audience

### 3.1 Primary Users

| Persona | Description |
|---|---|
| Retail Shop Owner | Sells goods to repeat customers; needs invoice tracking and payment reminders |
| Freelancer | Bills clients for project work; needs partial payment support and clear outstanding balances |
| Agency Owner | Manages multiple clients; needs customer management and cash flow overview |
| Consultant | Bills retainer and project fees; needs recurring expense tracking |
| Contractor | Tracks project milestones and partial payments; needs forecasting |
| Service Provider | Plumbers, designers, tutors — anyone billing for services rendered |

### 3.2 User Profile

- **Business size:** Solo to 5-person team
- **Technical level:** Non-technical; needs a simple, intuitive UI
- **Geography:** India (INR currency)
- **Device:** Primarily mobile and desktop browser
- **Existing tools:** WhatsApp for communication, Excel/paper for finances

### 3.3 Out of Scope Users (MVP)

- Enterprise businesses
- Businesses requiring multi-currency support
- Businesses requiring full accounting (P&L, balance sheet, GST filing)

---

## 4. Product Objectives

### 4.1 Business Goals

1. Demonstrate a compelling, complete MVP within 24 hours.
2. Show a clear path from manual financial management to AI-assisted management.
3. Win the hackathon by delivering a functional, polished, and differentiated product.

### 4.2 MVP Success Metrics

| Metric | Target |
|---|---|
| User can register and onboard a business | < 2 minutes |
| User can create an invoice and record a payment | < 3 minutes |
| Dashboard reflects accurate totals | Real-time, no page reload needed |
| AI natural-language entry produces a correct draft | > 80% accuracy on simple inputs |
| Cash flow forecast renders with assumptions visible | Yes |
| App is usable on a 375px mobile screen | Yes |

---

## 5. Functional Requirements

### 5.1 Authentication and Identity

**FR-AUTH-01:** Users must be able to register with an email address and password.
**FR-AUTH-02:** Users must be able to log in and log out.
**FR-AUTH-03:** Authentication must be managed entirely by Supabase Auth. No custom users table is required unless a specific extended profile field is needed.
**FR-AUTH-04:** A user's session must persist across page refreshes (Supabase handles this automatically).
**FR-AUTH-05:** All routes except `/login` and `/register` must require an authenticated session.
**FR-AUTH-06:** Supabase Row-Level Security (RLS) must ensure each user can only access their own data.

### 5.2 Business Onboarding

**FR-BIZ-01:** After first login, the user must be redirected to a business setup screen.
**FR-BIZ-02:** The user must enter: business name, business type, owner name, phone number, and optionally a logo URL.
**FR-BIZ-03:** One business profile per user account. Creating a second business is not supported in the MVP.
**FR-BIZ-04:** After completing setup, the user is redirected to the main dashboard.
**FR-BIZ-05:** The user must be able to edit their business profile from the settings screen.

### 5.3 Business Dashboard

**FR-DASH-01:** The dashboard must display the following KPI cards:
- Total outstanding receivables (sum of unpaid invoice balances)
- Total revenue this month (sum of payments received in current calendar month)
- Total expenses this month (sum of expenses in current calendar month)
- Net cash movement this month (payments received this month − expenses paid this month)

**FR-DASH-02:** The dashboard must display a revenue vs. expenses bar chart for the last 6 months.
**FR-DASH-03:** The dashboard must display a list of the 5 most recently created invoices.
**FR-DASH-04:** The dashboard must display the 5 invoices most urgently overdue (past due date, highest outstanding balance first).
**FR-DASH-05:** All dashboard data must reflect the current state of the database without requiring a page reload on initial load.

### 5.4 Customer Management

**FR-CUST-01:** Users must be able to create a customer with: name (required), email (optional), phone (optional), address (optional), notes (optional).
**FR-CUST-02:** Users must be able to view a list of all customers.
**FR-CUST-03:** Users must be able to view a customer detail page showing all invoices and total outstanding balance for that customer.
**FR-CUST-04:** Users must be able to edit a customer's details.
**FR-CUST-05:** Users must be able to delete a customer. Deletion must be blocked if the customer has associated invoices.

### 5.5 Invoice Management

**FR-INV-01:** Users must be able to create an invoice with:
- Customer (selected from existing customers)
- Invoice number (auto-generated, editable)
- Issue date (required)
- Due date (required)
- One or more line items: description, quantity, unit price
- Optional notes/terms field
- *(Open Decision OD-03: optional tax rate field)*

**FR-INV-02:** Invoice total must be calculated automatically from line items (see §15).
**FR-INV-03:** Invoice status must be one of: `draft`, `sent`, `partially_paid`, `paid`, `overdue`.
**FR-INV-04:** Status must update automatically:
- `overdue` when due date has passed and balance > 0
- `paid` when total amount received ≥ invoice total
- `partially_paid` when some payment exists but balance > 0

**FR-INV-05:** Users must be able to view a list of all invoices, filterable by status.
**FR-INV-06:** Users must be able to view an invoice detail page showing all line items, all payments, and outstanding balance.
**FR-INV-07:** Users must be able to edit an invoice while it is in `draft` status. Paid or partially paid invoices must not be editable.
**FR-INV-08:** Users must be able to delete a `draft` invoice. Invoices with recorded payments must not be deletable.
**FR-INV-09:** Auto-generated invoice number format: `INV-YYYYMM-NNN` (e.g., `INV-202611-001`).

### 5.6 Payment Tracking

**FR-PAY-01:** Users must be able to record a payment against an invoice.
**FR-PAY-02:** A payment must include: invoice reference, amount (required), date (required), payment method (cash / bank transfer / UPI / other), optional notes.
**FR-PAY-03:** Partial payments must be supported. Multiple payment records can exist against one invoice.
**FR-PAY-04:** The system must track the allocated amount per payment and calculate the outstanding balance correctly (see §15).
**FR-PAY-05:** A payment amount must not exceed the remaining outstanding balance on the invoice. Enforcement is **two-layer**:
- **Client-side (convenience):** The UI must display a validation error before submission if the entered amount exceeds the displayed outstanding balance.
- **Server-side (mandatory):** All payment writes must go through the `record_payment` PostgreSQL RPC (see §13.5 and §15.4), which re-validates the outstanding balance inside an atomic transaction. Client-side validation is never sufficient on its own.
**FR-PAY-06:** Users must be able to view all payments for an invoice on the invoice detail page.
**FR-PAY-07:** Users must be able to view a global payment history list (all payments across all invoices).
**FR-PAY-08:** A payment record must not be deletable once created (financial audit integrity). An admin-only override is out of scope for the MVP.

### 5.7 Expense Management

**FR-EXP-01:** Users must be able to record a one-time expense with: description (required), amount (required), date (required), category (required), optional notes.
**FR-EXP-02:** Expense categories (predefined): `Rent`, `Salaries`, `Utilities`, `Marketing`, `Travel`, `Supplies`, `Software`, `Other`.
**FR-EXP-03:** Users must be able to record a recurring expense **schedule** with: description, amount, frequency (`weekly` / `monthly` / `quarterly` / `annually`), start date, optional end date, category. Recurring expense schedules are stored in the `recurring_expenses` table and are used exclusively for cash flow forecast projections. They do **not** represent actual paid expenses.
**FR-EXP-04:** Recurring expense schedules must generate projected outflow amounts in the cash flow forecast automatically. The system must **never** auto-create a row in the `expenses` table from a recurring schedule. When a recurring expense is actually paid (e.g., rent paid for November), the user must manually record it as a separate one-time expense entry in the `expenses` table. This strict separation between forecast schedules and actual paid expenses must be maintained across the database, UI labels, and all sample data.
**FR-EXP-05:** Users must be able to view, edit, and delete any expense record.
**FR-EXP-06:** Users must be able to view all expenses in a list, filterable by type (one-time / recurring) and category.

### 5.8 Cash Flow Forecasting

**FR-FORE-01:** The system must generate a 30-day, 60-day, and 90-day cash flow forecast.
**FR-FORE-02:** Forecast must include:
- **Projected inflows:** Outstanding balance from invoices with status `sent`, `partially_paid`, or `overdue`, grouped by expected due date. `draft` invoices are excluded because they have not been issued to a customer and carry no collection expectation.
- **Projected outflows:** Recurring expense amounts projected forward by frequency from the `recurring_expenses` table.
- **Net running balance** per period.

**FR-FORE-03:** Forecast must display its assumptions clearly on screen:
- Starting balance (manual input or ₹0 default)
- Only `sent`, `partially_paid`, and `overdue` invoices are included. `draft` invoices are excluded.
- Invoices with `due_date` more than 90 days in the past are also excluded as likely uncollectable. The 90-day threshold applies consistently in both the UI assumptions panel and the forecast computation algorithm.
- Recurring expense schedules (from `recurring_expenses`) included
- Actual one-time expenses (from `expenses`) are NOT projected forward — they are historical actuals only

**FR-FORE-04:** The user must be able to enter a "current cash balance" to seed the forecast.
**FR-FORE-05:** The forecast must be rendered as a line/area chart using Recharts.
**FR-FORE-06:** Forecast data must be computed by application logic, not by AI.

### 5.9 What-If Financial Simulation

**FR-SIM-01:** From the forecast screen, the user must be able to run a what-if simulation.
**FR-SIM-02:** The user must be able to adjust the following parameters:
- Assume a new recurring expense (amount + frequency)
- Assume an early payment on a specific invoice
- Assume an additional one-off revenue amount on a specific date
- **Delay an expected customer payment** by a configurable number of days (selectable: 15, 30, or 45 days). The user selects an outstanding invoice and a delay duration; the forecast shifts that invoice's projected inflow from its original due date to `due_date + delay_days`. If the shifted date falls **outside** the currently selected forecast window (30, 60, or 90 days), that inflow must be **removed entirely** from the simulated forecast for that window and must not be counted or carried to the window boundary.

**FR-SIM-03:** The simulation must recompute the forecast with the adjusted parameters and display both the original (baseline) and simulated forecast lines on the same chart. This applies to all four scenario types, including the payment delay scenario.
**FR-SIM-04:** Simulations must not persist to the database. They are display-only.
**FR-SIM-05:** The user must be able to clear the simulation and return to the base forecast.

### 5.10 AI — Natural-Language Financial Entry

**FR-AI-NL-01:** Users must be able to describe a financial record in plain English/Hindi-English.
**FR-AI-NL-02:** The AI must parse the input and return a structured draft record (invoice line item, payment, or expense).
**FR-AI-NL-03:** The draft must be displayed for user review before any data is saved.
**FR-AI-NL-04:** The user must explicitly confirm the draft before it is written to the database.
**FR-AI-NL-05:** The user must be able to edit any field of the draft before confirming.
**FR-AI-NL-06:** If the AI fails or returns an unusable response, the system must fall back gracefully to the standard manual entry form.

**Example inputs:**
- "Received ₹5000 from Ramesh on 15 Nov for invoice 23"
- "Add monthly rent expense of ₹12000 starting December"
- "Create invoice for Priya for website design, 3 milestones at ₹8000 each, due Dec 31"

### 5.11 AI — Payment Reminder Drafts

**FR-AI-REM-01:** From an invoice detail page, the user must be able to generate an AI-drafted payment reminder message.
**FR-AI-REM-02:** The reminder must be pre-populated with: customer name, invoice number, amount outstanding, due date.
**FR-AI-REM-03:** The draft must be displayed in a text area for review and editing before use.
**FR-AI-REM-04:** The user copies the reminder manually (WhatsApp automation is out of scope for the MVP).
**FR-AI-REM-05:** If the AI fails, the system must display a pre-defined template reminder as a fallback.

**Fallback template:**
```
Hi [Customer Name], this is a reminder that invoice [Invoice Number] 
for ₹[Outstanding Amount] was due on [Due Date]. 
Please let us know when you can process this payment. Thank you.
```

### 5.12 AI — Financial Insights

**FR-AI-INS-01:** The dashboard or a dedicated insights section must display 2–4 AI-generated plain-language financial observations.
**FR-AI-INS-02:** Insights must be generated from real data passed to the AI: total revenue, total outstanding, expense breakdown, overdue invoices.
**FR-AI-INS-03:** Insights must be advisory and clearly labeled as AI-generated.
**FR-AI-INS-04:** If the AI is unavailable, a set of deterministic rule-based insights must be displayed as a fallback (see §14.5).
**FR-AI-INS-05:** Insights must refresh when the user explicitly requests it. They must not auto-refresh on every page load (to conserve API quota).

---

## 6. MVP Features

The following features are **in scope** for the 24-hour hackathon MVP, listed in build priority order.

| Priority | Feature | Acceptance Criteria |
|---|---|---|
| P0 | User registration and login | User can register, log in, and log out. Unauthenticated routes redirect to `/login`. |
| P0 | Business onboarding | First-time user is prompted to set up their business. Business name and owner name are required. |
| P0 | Business dashboard | Dashboard loads with KPI cards, chart, and recent invoices. All values are accurate. KPI card reads "Net cash movement this month". |
| P1 | Customer management | User can create, list, view, and edit customers. Delete blocked if invoices exist. |
| P1 | Invoice creation | User can create an invoice with line items. Total auto-calculates. Invoice number auto-generates. |
| P1 | Invoice tracking | User can view invoice list filtered by status. Status updates automatically. |
| P1 | Payment recording | User can record full or partial payment against an invoice. Balance updates immediately. |
| P2 | Expense management | User can add one-time and recurring expenses. List is filterable. |
| P2 | Cash flow forecast | 30/60/90-day forecast renders with chart. Assumptions displayed. User can set opening balance. |
| P2 | What-if simulation | User can adjust parameters and see simulated vs. base forecast on same chart. |
| P3 | AI natural-language entry | User types a financial description; AI returns a draft; user reviews and confirms. |
| P3 | AI payment reminder draft | User requests reminder from invoice detail page; AI returns draft; user copies it. |
| P3 | AI financial insights | Dashboard displays 2–4 AI insights with manual refresh. Fallback rule-based insights shown if AI unavailable. |

---

## 7. Future Scope

The following features are **explicitly out of scope** for the MVP and must not be built during the hackathon.

| Feature | Reason Deferred |
|---|---|
| Multiple businesses per account | Adds complexity to data isolation, billing, and UI |
| Bank account integration | Requires third-party API agreements (e.g., Plaid, Setu) |
| Automated WhatsApp messaging | Requires WhatsApp Business API and phone number provisioning |
| GST / TDS / advanced taxation | Regulatory complexity; out of scope for a demo |
| PDF invoice generation | Nice-to-have; can be built post-hackathon |
| Email delivery of invoices | Requires transactional email provider setup |
| Multi-currency support | Out of scope; INR only for MVP |
| Team / employee access | Single-user per business for MVP |
| Mobile native app | Web app only for MVP |
| Accounting reports (P&L, Balance Sheet) | Requires full double-entry bookkeeping engine |

---

## 8. User Onboarding Workflow

### 8.1 New User Flow

```
[Visit App URL]
      |
      v
[Landing / Login Page]
      |
      +--[Has account?]--YES--> [Login] --> [Check: business profile exists?]
      |                                               |
      NO                                   YES        NO
      |                                    |          |
      v                                    v          v
[Register Page]                    [Dashboard]  [Business Setup]
      |                                               |
      v                                               v
[Email Verified / Auto-Login]                  [Dashboard]
      |
      v
[Business Setup Page]
  - Business name (required)
  - Business type (dropdown)
  - Owner name (required)
  - Phone number (optional)
  - Logo URL (optional)
      |
      v
[Dashboard]
```

### 8.2 Returning User Flow

1. User visits any route.
2. Supabase Auth checks session token.
3. If valid: allow access.
4. If invalid/expired: redirect to `/login`.
5. After login: redirect to `/dashboard`.

### 8.3 Business Profile Check

On authenticated route entry, check if `businesses` table has a record for the current user's `auth.uid()`. If not, redirect to `/onboarding`. This check runs once per session.

---

## 9. Application Screens and Navigation

### 9.1 Screen Inventory

| Screen | Route | Description |
|---|---|---|
| Login | `/login` | Email + password login form |
| Register | `/register` | Email + password registration form |
| Business Onboarding | `/onboarding` | First-time business profile setup |
| Dashboard | `/dashboard` | KPI cards, charts, recent invoices, AI insights |
| Customers List | `/customers` | All customers, search, create button |
| Customer Detail | `/customers/:id` | Customer info, invoices, total outstanding |
| Invoices List | `/invoices` | All invoices, filter by status |
| Invoice Detail / Edit | `/invoices/:id` | Line items, payments, reminder button |
| New Invoice | `/invoices/new` | Create invoice form |
| Expenses | `/expenses` | List of one-time and recurring expenses |
| Cash Flow Forecast | `/forecast` | 30/60/90-day chart, what-if controls |
| Settings | `/settings` | Edit business profile |
| AI Entry | `/ai-entry` or modal | Natural-language input → structured draft review |

### 9.2 Navigation Structure

**Desktop:** Fixed left sidebar with icon + label nav items.

**Mobile:** Bottom navigation bar with icons only. Sidebar collapses.

**Nav items:**
- 🏠 Dashboard
- 👥 Customers
- 📄 Invoices
- 💸 Expenses
- 📈 Forecast
- ⚙️ Settings

**Top bar:** Business name, user avatar, logout button.

### 9.3 AI Entry Access Points

The AI natural-language entry feature is accessible via:
1. A floating action button (✨) on Dashboard, Invoices, and Expenses screens.
2. Opens as a modal/slide-over panel (not a separate route).

---

## 10. Mobile Responsiveness Requirements

### 10.1 Breakpoints (Tailwind defaults)

| Breakpoint | Min Width | Layout |
|---|---|---|
| `sm` | 640px | Single column, bottom nav |
| `md` | 768px | Two columns where applicable |
| `lg` | 1024px | Sidebar visible, full layout |
| `xl` | 1280px | Wider content area |

### 10.2 Mobile-Specific Requirements

- **Bottom navigation bar** on screens < 768px. Sidebar hidden.
- **KPI cards** stack vertically on mobile (1 column) instead of grid (4 columns on desktop).
- **Tables** (invoices, customers, expenses) must become **card lists** on mobile. No horizontal scrolling on primary views.
- **Forms** must be single-column on mobile.
- **Charts** (Recharts) must be responsive using `ResponsiveContainer` with 100% width.
- **Modals** must be full-screen drawers on mobile.
- **Buttons** must have a minimum touch target of 44×44px.
- **Font sizes** must remain legible at 375px width (iPhone SE baseline).

### 10.3 Mobile-First Development

Developers must write Tailwind classes mobile-first (base styles for mobile, `md:` or `lg:` prefixes for larger screens).

---

## 11. Technology Stack

### 11.1 Frontend

| Technology | Version / Notes | Purpose |
|---|---|---|
| React | 18.x | UI framework |
| Vite | 5.x | Build tool and dev server |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Utility-first styling |
| shadcn/ui | Latest | Pre-built accessible UI components |
| Recharts | 2.x | Charts (bar, line, area) |
| React Router | 6.x | Client-side routing |
| React Query / TanStack Query | 5.x | Data fetching, caching, invalidation |

### 11.2 Backend and Database

| Technology | Notes | Purpose |
|---|---|---|
| Supabase | Hosted instance | Backend-as-a-service |
| Supabase Auth | Built-in | User authentication (email + password) |
| Supabase Postgres | Managed | Relational database |
| Supabase Edge Functions | Deno runtime | AI proxy (Gemini API calls) |
| Supabase RLS | Built-in | Row-level security per user |

### 11.3 AI Provider

| Technology | Notes | Purpose |
|---|---|---|
| Google Gemini API | `gemini-1.5-flash` model | NL parsing, reminder drafts, insights |
| Supabase Edge Function | Acts as secure API proxy | Keeps Gemini API key server-side |

> **Open Dependency (OD-01):** Gemini API key must be provisioned and added to Supabase Edge Function secrets before AI features can be built. If unavailable, all AI features must fall back to manual entry forms and static templates.

### 11.4 Hosting and Deployment

| Technology | Notes | Purpose |
|---|---|---|
| Vercel | Free tier | Frontend hosting and CI/CD |
| Supabase | Free tier | Database and backend |

### 11.5 Development Tools

| Tool | Purpose |
|---|---|
| Git + GitHub | Source control |
| ESLint + Prettier | Code quality |
| Supabase CLI | Local dev, migrations |

---

## 12. System Architecture

### 12.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      USER BROWSER                        │
│                                                          │
│   React + Vite + TypeScript + Tailwind + shadcn/ui       │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│   │  React Router│  │TanStack Query│  │   Recharts   │  │
│   └──────────────┘  └──────────────┘  └──────────────┘  │
└───────────────────┬─────────────────────────────────────┘
                    │ HTTPS
         ┌──────────▼──────────────────────────────┐
         │              SUPABASE                    │
         │                                          │
         │  ┌─────────────┐  ┌──────────────────┐  │
         │  │  Auth        │  │  Postgres DB      │  │
         │  │  (JWT)       │  │  (RLS enabled)    │  │
         │  └─────────────┘  └──────────────────┘  │
         │                                          │
         │  ┌─────────────────────────────────────┐ │
         │  │  Edge Functions (Deno)               │ │
         │  │  - /ai-parse   (NL → structured)     │ │
         │  │  - /ai-remind  (reminder draft)       │ │
         │  │  - /ai-insights (financial insights)  │ │
         │  └────────────────┬────────────────────┘ │
         └───────────────────│─────────────────────┘
                             │ HTTPS (server-side)
                    ┌────────▼────────┐
                    │  GOOGLE GEMINI  │
                    │      API        │
                    └─────────────────┘
```

### 12.2 Data Flow — Normal Operations

1. User action in React → TanStack Query → Supabase JS client → Supabase Postgres (with RLS).
2. Response returned → TanStack Query cache updated → React re-renders.
3. All financial calculations performed in the React application before writing to DB.

### 12.3 Data Flow — AI Operations

1. User submits natural-language input or requests AI action.
2. React → Supabase Edge Function (authenticated with user JWT).
3. Edge Function builds prompt with user data + input → calls Gemini API.
4. Gemini API returns structured JSON response.
5. Edge Function validates and returns response to React.
6. React displays draft for user review.
7. User confirms → React writes confirmed record to Supabase Postgres.
8. AI response is **never written directly to the database**.

### 12.4 Key Design Decisions

- **No custom backend server.** All server-side logic runs in Supabase Edge Functions or Supabase Postgres functions.
- **AI is advisory only.** The AI never writes to the database. Only user-confirmed records are persisted.
- **Financial calculations are deterministic.** The application code (not AI) performs all arithmetic.
- **Gemini API key is never exposed to the browser.** It lives only in Supabase Edge Function environment secrets.

---

## 13. Database Structure

> **Note:** Supabase Auth manages the `auth.users` table. No custom `users` table is created unless extended profile fields beyond those in §13.1 are needed.

### 13.1 Business Profile (extends auth user)

**Table: `businesses`**

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Business ID |
| `user_id` | `uuid` | NOT NULL, UNIQUE, FK → `auth.users.id` | Owner (1:1 with auth user) |
| `name` | `text` | NOT NULL | Business name |
| `type` | `text` | NOT NULL | Retail / Freelance / Agency / Consulting / Contracting / Service / Other |
| `owner_name` | `text` | NOT NULL | Owner's full name |
| `phone` | `text` | NULL | Contact number |
| `logo_url` | `text` | NULL | Logo image URL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Last updated |

**RLS:** User can only SELECT, INSERT, UPDATE their own row (`user_id = auth.uid()`).

---

### 13.2 Customers

**Table: `customers`**

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Customer ID |
| `business_id` | `uuid` | NOT NULL, FK → `businesses.id` | Owning business |
| `name` | `text` | NOT NULL | Customer name |
| `email` | `text` | NULL | Email address |
| `phone` | `text` | NULL | Phone number |
| `address` | `text` | NULL | Full address |
| `notes` | `text` | NULL | Internal notes |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Creation timestamp |

**RLS:** User can access only customers belonging to their business.

---

### 13.3 Invoices

**Table: `invoices`**

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Invoice ID |
| `business_id` | `uuid` | NOT NULL, FK → `businesses.id` | Owning business |
| `customer_id` | `uuid` | NOT NULL, FK → `customers.id` | Billed customer |
| `invoice_number` | `text` | NOT NULL, UNIQUE per business | e.g., `INV-202611-001` |
| `issue_date` | `date` | NOT NULL | Invoice issue date |
| `due_date` | `date` | NOT NULL | Payment due date |
| `status` | `text` | NOT NULL, default `'draft'` | draft / sent / partially_paid / paid / overdue |
| `subtotal` | `numeric(12,2)` | NOT NULL, default `0` | Sum of line items |
| `tax_rate` | `numeric(5,2)` | NULL | Optional tax % (OD-03) |
| `tax_amount` | `numeric(12,2)` | NULL | Calculated tax amount (OD-03) |
| `total_amount` | `numeric(12,2)` | NOT NULL | Final invoice total |
| `amount_paid` | `numeric(12,2)` | NOT NULL, default `0` | Total payments received |
| `outstanding_balance` | `numeric(12,2)` | NOT NULL | `total_amount - amount_paid` |
| `notes` | `text` | NULL | Terms or notes |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Last updated |

**RLS:** User can access only invoices belonging to their business.

---

### 13.4 Invoice Line Items

**Table: `invoice_items`**

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Line item ID |
| `invoice_id` | `uuid` | NOT NULL, FK → `invoices.id` ON DELETE CASCADE | Parent invoice |
| `description` | `text` | NOT NULL | Service/product description |
| `quantity` | `numeric(10,2)` | NOT NULL, default `1` | Quantity |
| `unit_price` | `numeric(12,2)` | NOT NULL | Price per unit (INR) |
| `line_total` | `numeric(12,2)` | NOT NULL | `quantity × unit_price` |
| `sort_order` | `integer` | NOT NULL, default `0` | Display order |

**Note:** `line_total` is computed by application logic before insert. No DB trigger needed for MVP.

---

### 13.5 Payments

**Table: `payments`**

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Payment ID |
| `invoice_id` | `uuid` | NOT NULL, FK → `invoices.id` | Invoice being paid |
| `business_id` | `uuid` | NOT NULL, FK → `businesses.id` | Owning business (for RLS and reporting) |
| `amount` | `numeric(12,2)` | NOT NULL, CHECK > 0 | Amount received |
| `payment_date` | `date` | NOT NULL | Date payment was received |
| `payment_method` | `text` | NOT NULL, default `'other'` | cash / bank_transfer / upi / other |
| `notes` | `text` | NULL | Optional notes |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Record creation timestamp |

**Payment RPC — `record_payment` (mandatory):**

All payment inserts must be executed through the `record_payment` PostgreSQL RPC function, never via a direct INSERT from the client. The RPC must execute the following steps atomically within a single database transaction:

```sql
-- Pseudocode for record_payment(p_invoice_id, p_business_id, p_amount, p_date, p_method, p_notes)
BEGIN;
  -- Step 1: Validate invoice ownership (prevents cross-business tampering)
  SELECT id, business_id, total_amount, amount_paid, outstanding_balance, status
  FROM invoices
  WHERE id = p_invoice_id
    AND business_id = p_business_id
  FOR UPDATE;  -- row-level lock prevents concurrent payment race conditions

  -- Step 2: Validate payment amount (server-side, inside transaction)
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'payment_amount_invalid: Amount must be greater than 0';
  END IF;
  IF p_amount > outstanding_balance THEN
    RAISE EXCEPTION 'payment_exceeds_balance: Amount ₹% exceeds outstanding balance ₹%', p_amount, outstanding_balance;
  END IF;

  -- Step 3: Validate payment details
  IF p_date IS NULL THEN
    RAISE EXCEPTION 'payment_date_required';
  END IF;
  IF p_method NOT IN ('cash', 'bank_transfer', 'upi', 'other') THEN
    RAISE EXCEPTION 'payment_method_invalid';
  END IF;

  -- Step 4: Insert the payment record
  INSERT INTO payments (invoice_id, business_id, amount, payment_date, payment_method, notes)
  VALUES (p_invoice_id, p_business_id, p_amount, p_date, p_method, p_notes);

  -- Step 5: Recalculate invoice totals
  new_amount_paid := amount_paid + p_amount;
  new_outstanding := total_amount - new_amount_paid;

  -- Step 6: Determine new status
  new_status := CASE
    WHEN new_outstanding <= 0 THEN 'paid'
    WHEN new_amount_paid > 0  THEN 'partially_paid'
    WHEN due_date < CURRENT_DATE THEN 'overdue'
    ELSE status  -- preserve 'sent' or 'draft'
  END;

  -- Step 7: Update invoice
  UPDATE invoices
  SET amount_paid = new_amount_paid,
      outstanding_balance = new_outstanding,
      status = new_status,
      updated_at = now()
  WHERE id = p_invoice_id;

COMMIT;
```

**Key guarantees of this approach:**
- Invoice ownership is verified before any write (prevents cross-business data tampering).
- `FOR UPDATE` acquires a row-level lock so two concurrent payment submissions cannot both read the same `outstanding_balance` and together exceed it.
- All validations — ownership, amount > 0, amount ≤ outstanding, date, method — execute atomically. Partial writes are impossible.
- The client application must call `supabase.rpc('record_payment', { ... })` and handle the error codes returned.

**RLS:** User can access only payments belonging to their business.

**No deletes:** DELETE is not permitted on the `payments` table via RLS policy for the MVP.

---

### 13.6 Expenses

**Table: `expenses`**

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Expense ID |
| `business_id` | `uuid` | NOT NULL, FK → `businesses.id` | Owning business |
| `description` | `text` | NOT NULL | What the expense is for |
| `amount` | `numeric(12,2)` | NOT NULL, CHECK > 0 | Amount in INR |
| `expense_date` | `date` | NOT NULL | Date of expense |
| `category` | `text` | NOT NULL | Rent / Salaries / Utilities / Marketing / Travel / Supplies / Software / Other |
| `expense_type` | `text` | NOT NULL, default `'one_time'` | Always `one_time`. Recurring expense schedules are stored exclusively in `recurring_expenses`; this column must never hold the value `recurring`. |
| `notes` | `text` | NULL | Optional notes |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Creation timestamp |

**RLS:** User can access only expenses belonging to their business.

> **Separation rule:** The `expenses` table stores only **actual paid expenses** (money already spent). Recurring expense schedules (for future forecasting) are stored separately in `recurring_expenses`. When a user pays their monthly rent, they record it here as a one-time entry. The recurring schedule in `recurring_expenses` remains untouched and continues to drive forecast projections.

---

### 13.7 Recurring Expenses

**Table: `recurring_expenses`**

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Recurring expense ID |
| `business_id` | `uuid` | NOT NULL, FK → `businesses.id` | Owning business |
| `description` | `text` | NOT NULL | Expense label |
| `amount` | `numeric(12,2)` | NOT NULL, CHECK > 0 | Recurring amount in INR |
| `frequency` | `text` | NOT NULL | weekly / monthly / quarterly / annually |
| `start_date` | `date` | NOT NULL | First occurrence date |
| `end_date` | `date` | NULL | Last occurrence (NULL = ongoing) |
| `category` | `text` | NOT NULL | Same categories as expenses |
| `is_active` | `boolean` | NOT NULL, default `true` | Whether this recurrence is live |
| `notes` | `text` | NULL | Optional notes |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Creation timestamp |

**Note:** Rows in `recurring_expenses` are **forecast schedule definitions only**. They do not represent paid expenses and must never be inserted into the `expenses` table by the system. The forecast algorithm reads this table to project future outflows. When the user actually pays a recurring bill, they record it manually as a one-time entry in `expenses`.

---

### 13.8 AI Logs (Conditional — OD-02)

**Table: `ai_logs`** *(Create only if OD-02 resolved as YES)*

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK | Log entry ID |
| `business_id` | `uuid` | NOT NULL, FK → `businesses.id` | Owning business |
| `feature` | `text` | NOT NULL | nl_entry / reminder / insights |
| `input` | `text` | NOT NULL | User's raw input |
| `ai_response` | `jsonb` | NULL | AI's structured response |
| `was_confirmed` | `boolean` | NULL | Whether user confirmed the draft |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Timestamp |

---

### 13.9 Indexes

```sql
-- Performance indexes (create after tables)
CREATE INDEX idx_invoices_business_id ON invoices(business_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_business_id ON payments(business_id);
CREATE INDEX idx_expenses_business_id ON expenses(business_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_recurring_expenses_business_id ON recurring_expenses(business_id);
CREATE INDEX idx_customers_business_id ON customers(business_id);
```

---

## 14. AI Integration Requirements

### 14.1 Architecture

All AI calls must go through Supabase Edge Functions. The Gemini API key must never be present in the frontend bundle.

```
React (browser)
  → Supabase Edge Function (authenticated, server-side)
    → Google Gemini API
  → Structured JSON response back to React
  → User reviews draft
  → User confirms → React writes to Supabase DB
```

### 14.2 Edge Functions

| Function | Trigger | Input | Output |
|---|---|---|---|
| `/functions/ai-parse` | User submits NL text | `{ input: string, context: { customers[], recent_invoices[] } }` | `{ type: 'invoice'|'payment'|'expense', draft: object, confidence: number }` |
| `/functions/ai-remind` | User clicks "Generate Reminder" | `{ invoice: InvoiceObject, customer: CustomerObject }` | `{ message: string }` |
| `/functions/ai-insights` | User clicks "Refresh Insights" | `{ summary: FinancialSummaryObject }` | `{ insights: string[] }` |

### 14.3 Gemini Prompting Guidelines

**For NL Parse (`ai-parse`):**
- System prompt: Instruct the model to act as a financial data extraction assistant for a small business app. Output must be valid JSON only.
- Include current date, business name, customer list, and recent invoice numbers in the system context.
- Ask the model to return a confidence score (0–1). If < 0.7, the UI should warn the user.
- If the input is ambiguous, return a `clarification_needed` field with a suggested question.

**For Reminder (`ai-remind`):**
- System prompt: Instruct the model to write a polite, professional payment reminder in English. Tone: friendly but firm.
- Pass: customer name, invoice number, total amount, outstanding balance, due date, number of days overdue.
- Maximum output: 200 words.

**For Insights (`ai-insights`):**
- System prompt: Instruct the model to act as a financial advisor for a small business. Output 2–4 specific, actionable observations in plain language. No jargon.
- Pass: revenue this month, revenue last month, total outstanding, overdue count, top expense categories, top customer by revenue.
- Output as a JSON array of strings.

### 14.4 Draft Review UI

When AI returns a draft, the UI must:
1. Display all fields in a form pre-filled with the AI's values.
2. Highlight AI-populated fields visually (e.g., with a subtle yellow background or ✨ icon).
3. Show a confidence indicator if below 0.7.
4. Require the user to click "Confirm and Save" to persist.
5. Offer "Edit" (modify fields) and "Discard" (close without saving) options.

### 14.5 Fallback Rules (Deterministic Insights)

If the AI is unavailable, display rule-based insights:

| Condition | Insight Text |
|---|---|
| Outstanding > 2× monthly revenue | "You have high outstanding receivables. Follow up on overdue invoices to improve cash flow." |
| Any invoice overdue > 30 days | "You have invoices overdue by more than 30 days. Consider sending payment reminders." |
| Expenses > Revenue this month | "Your expenses exceeded revenue this month. Review your recurring costs." |
| No invoices created this month | "No invoices have been created this month. Make sure to bill your clients." |
| Outstanding = 0 | "All invoices are paid. Great work maintaining healthy receivables!" |

### 14.6 AI Feature Manual Fallbacks

| AI Feature | Manual Fallback |
|---|---|
| NL Entry | Standard invoice / expense / payment creation form |
| Reminder Draft | Pre-defined template with fields filled in (see §5.11) |
| Insights | Deterministic rule-based insights (§14.5) |

---

## 15. Financial Calculation Rules

> **Critical:** All financial calculations must be performed by deterministic application code (TypeScript). The AI must never perform or suggest calculations.

### 15.1 Invoice Line Item Totals

> **Precision rule:** All monetary arithmetic must use **integer paise** internally to avoid JavaScript floating-point errors (e.g., `0.1 + 0.2 = 0.30000000000000004`). Values are converted to paise at the point of input and back to rupees only for display and database storage.

**Direct paise parsing (safeguard):** Monetary string inputs (e.g., from form fields or AI drafts) must be parsed directly into integer paise without passing through floating-point multiplication. Use the following approach:

```typescript
// CORRECT — parse directly to paise from string input
function parseToPaise(input: string): number {
  // Remove currency symbols, commas; split on decimal point
  const clean = input.replace(/[₹,\s]/g, '');
  const [rupees, paiseStr = '0'] = clean.split('.');
  const paiseDigits = paiseStr.padEnd(2, '0').slice(0, 2);
  return parseInt(rupees, 10) * 100 + parseInt(paiseDigits, 10);
}

// WRONG — do not do this (floating-point error risk)
// const paise = Math.round(parseFloat(input) * 100);
```

**Arithmetic in paise:**

```typescript
// All intermediate calculations operate on integer paise
function calculateLineTotalPaise(quantityPaise: number, unitPricePaise: number): number {
  // quantity is stored as integer × 100 (e.g., 1.5 units → 150)
  return Math.round((quantityPaise * unitPricePaise) / 100);
}

function calculateSubtotalPaise(items: { lineTotalPaise: number }[]): number {
  return items.reduce((sum, item) => sum + item.lineTotalPaise, 0);
}

function calculateTaxPaise(subtotalPaise: number, taxRateBasisPoints: number): number {
  // taxRateBasisPoints: e.g., 18% = 1800 basis points
  return Math.round((subtotalPaise * taxRateBasisPoints) / 10000);
}

function calculateTotalPaise(subtotalPaise: number, taxPaise: number): number {
  return subtotalPaise + taxPaise;
}

// Convert to rupees only for display / DB storage (numeric(12,2))
function paiseToCurrency(paise: number): number {
  return paise / 100;
}
```

**Summary formula (conceptual):**
```
line_total_paise   = round((quantity_paise × unit_price_paise) / 100)
subtotal_paise     = SUM(line_total_paise)
tax_paise          = round((subtotal_paise × tax_rate_basis_points) / 10000)
total_paise        = subtotal_paise + tax_paise

-- Store in DB as:
subtotal    = subtotal_paise / 100      → numeric(12,2)
tax_amount  = tax_paise / 100           → numeric(12,2)
total_amount = total_paise / 100        → numeric(12,2)
```

### 15.2 Outstanding Balance

All balance calculations must also operate in integer paise to prevent accumulation of rounding errors across multiple partial payments:

```typescript
// Paise-level balance tracking
function calculateOutstandingPaise(totalPaise: number, paymentsInPaise: number[]): number {
  const totalPaidPaise = paymentsInPaise.reduce((sum, p) => sum + p, 0);
  return totalPaise - totalPaidPaise;
}
```

**Conceptual formula:**
```
outstanding_paise = total_amount_paise - SUM(payment_amount_paise)
outstanding_balance (stored) = outstanding_paise / 100   → numeric(12,2)
```

### 15.3 Invoice Status Rules

Evaluated in this order after every payment event:

```
IF outstanding_balance <= 0        → status = 'paid'
ELSE IF amount_paid > 0            → status = 'partially_paid'
ELSE IF due_date < today           → status = 'overdue'
ELSE IF status was 'sent'          → status = 'sent'
ELSE                               → status = 'draft'
```

The overdue check runs client-side on load. A database function or cron job is not needed for the MVP (but would be needed in production).

### 15.4 Payment Validation

**Client-side pre-validation (convenience, in TypeScript/paise):**

```typescript
function validatePaymentPaise(amountPaise: number, outstandingPaise: number): void {
  if (amountPaise <= 0) {
    throw new Error('Payment amount must be greater than ₹0');
  }
  if (amountPaise > outstandingPaise) {
    throw new Error(
      `Payment amount cannot exceed outstanding balance of ${formatINR(outstandingPaise / 100)}`
    );
  }
}
```

**Server-side enforcement (mandatory):** Client-side validation is a UX convenience only. The authoritative check runs inside the `record_payment` RPC transaction (see §13.5). The RPC re-reads and locks the invoice row, then independently validates all of the following before writing:

| Validation | Error Code |
|---|---|
| `p_invoice_id` belongs to `p_business_id` | `payment_ownership_invalid` |
| `p_amount > 0` | `payment_amount_invalid` |
| `p_amount ≤ current outstanding_balance` (re-read with FOR UPDATE lock) | `payment_exceeds_balance` |
| `p_date IS NOT NULL` | `payment_date_required` |
| `p_method IN ('cash','bank_transfer','upi','other')` | `payment_method_invalid` |

The React client must handle these error codes and display user-friendly messages.

### 15.5 Dashboard KPI Calculations

```
total_outstanding_receivables = SUM(outstanding_balance) WHERE status NOT IN ('paid')
revenue_this_month            = SUM(payments.amount) WHERE payment_date IN current calendar month
expenses_this_month           = SUM(expenses.amount) WHERE expense_date IN current calendar month
net_cash_movement             = revenue_this_month - expenses_this_month
-- Note: net_cash_movement is a monthly cash flow metric, NOT a running balance.
-- It answers: "Did more money come in than go out this month?"
-- It does not represent total funds available. Use opening_balance + forecast for that.
```

### 15.6 Cash Flow Forecast Algorithm

**Inputs:**
- `opening_balance`: User-entered (default ₹0)
- `forecast_days`: 30, 60, or 90
- `outstanding_invoices`: Invoices where `status IN ('sent', 'partially_paid', 'overdue')` **AND** `due_date >= (today − 90 days)`. Draft invoices are always excluded. Invoices overdue by more than 90 days are excluded as likely uncollectable.
- `recurring_expenses`: All active recurring expense schedules from `recurring_expenses` (not from `expenses`)

**Algorithm:**

```
1. Build a date map from today to (today + forecast_days).
2. For each outstanding invoice (status IN ('sent', 'partially_paid', 'overdue'),
   due_date >= today − 90 days):
   - Draft invoices are skipped entirely — they carry no collection expectation.
   - Invoices with due_date older than 90 days are skipped as likely uncollectable.
   - Add outstanding_balance to the date map on the invoice's due_date.
   - If due_date is in the past (but within the 90-day exclusion window), map to today
     (overdue, expected any time within the forecast window).
3. For each active recurring expense schedule (from `recurring_expenses`), project
   occurrences within the forecast window:
   - weekly: every 7 days from start_date
   - monthly: same day each month from start_date
   - quarterly: every 3 months from start_date
   - annually: same date each year from start_date
   - Add amount as an outflow on each projected date.
4. Compute running balance per day:
   running_balance[day] = running_balance[day-1] + inflows[day] - outflows[day]
   starting with running_balance[0] = opening_balance
5. Aggregate into weekly or monthly buckets for the chart.
```

**Assumptions to display:**
- Opening balance used
- Number of outstanding invoices included
- Number of recurring expenses projected
- One-time expenses excluded from forward projection
- Overdue invoices assumed collectible (user must acknowledge this)

### 15.7 What-If Simulation

The simulation applies delta adjustments to the base forecast. All simulation results are display-only and are never persisted.

```typescript
// Delta types
type SimulationDelta =
  | { type: 'early_payment';    invoiceId: string; newDate: Date }
  | { type: 'additional_revenue'; amount: number; date: Date }
  | { type: 'new_expense';      amount: number; frequency: Frequency; fromDate: Date }
  | { type: 'delayed_payment';  invoiceId: string; delayDays: number };  // NEW

// Apply deltas to base inflow/outflow date maps
function applyDeltas(base: ForecastDateMap, deltas: SimulationDelta[], forecastEndDate: Date): ForecastDateMap {
  const sim = deepClone(base);

  for (const delta of deltas) {
    if (delta.type === 'early_payment') {
      // Shift inflow from original due date to earlier date
      sim.inflows[delta.newDate] += base.inflows[originalDueDate];
      sim.inflows[originalDueDate] -= base.inflows[originalDueDate];
    }

    if (delta.type === 'additional_revenue') {
      sim.inflows[delta.date] += delta.amount;
    }

    if (delta.type === 'new_expense') {
      // Project recurring outflow from fromDate within window
      projectRecurring(sim, delta.amount, delta.frequency, delta.fromDate, forecastEndDate);
    }

    if (delta.type === 'delayed_payment') {
      const originalDate = getInvoiceDueDate(delta.invoiceId);
      const shiftedDate = addDays(originalDate, delta.delayDays);

      // SAFEGUARD: if shiftedDate falls outside the forecast window,
      // remove the inflow entirely from the simulation — do not count it
      // at the window boundary or beyond.
      if (shiftedDate > forecastEndDate) {
        sim.inflows[originalDate] -= base.inflows[originalDate]; // remove from baseline position
        // Do NOT add to any date — it is outside the window
      } else {
        // Shift inflow to new date within window
        sim.inflows[originalDate] -= base.inflows[originalDate];
        sim.inflows[shiftedDate] += base.inflows[originalDate];
      }
    }
  }

  return sim;
}
```

**Display rule:** Both the baseline forecast line and the simulated forecast line must be rendered on the same Recharts chart. The chart legend must clearly label each line. When a delayed payment falls outside the window, the UI must note in the assumptions panel: *"[Customer name] payment of ₹X delayed beyond the {N}-day window and excluded from this forecast."*

### 15.8 Currency Formatting

All monetary values must display with Indian number formatting:

```
₹1,00,000.00  (not ₹100,000.00)
```

Use `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.

---

## 16. Security Requirements

### 16.1 Supabase Row-Level Security (RLS)

RLS must be enabled on all tables. Every table policy must enforce:

```sql
-- Example policy pattern for all tables
CREATE POLICY "Users can only access their own business data"
ON <table_name>
FOR ALL
USING (
  business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  )
);

-- For businesses table itself
CREATE POLICY "Users can only access their own business"
ON businesses
FOR ALL
USING (user_id = auth.uid());
```

### 16.2 Payment Table — No Delete

```sql
-- Payments: no delete allowed for any user
CREATE POLICY "Payments cannot be deleted"
ON payments
FOR DELETE
USING (false);
```

### 16.3 Authentication Security

- Supabase Auth handles password hashing, JWT token issuance, and session management.
- JWT tokens must be passed with every Supabase client call (automatic via Supabase JS client).
- The Gemini API key must be stored only in Supabase Edge Function secrets (environment variables), never in frontend code or `.env` files committed to the repository.

### 16.4 Input Validation

- All form inputs must be validated on the frontend before submission.
- Monetary amounts: must be positive numbers with at most 2 decimal places.
- Dates: must be valid dates. Due date must be ≥ issue date.
- Required fields must not be empty.
- Text fields: trim whitespace before saving.

### 16.5 AI Input Sanitization

- Natural-language input must be limited to 500 characters before sending to the Edge Function.
- The Edge Function must not reflect user input directly into the Gemini prompt without wrapping it in a safe context structure.

### 16.6 Environment Variables

| Variable | Location | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend `.env` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend `.env` | Supabase anon/public key |
| `GEMINI_API_KEY` | Supabase Edge Function secret | Google Gemini API key (never in frontend) |

> `.env` files must be in `.gitignore`. Never commit API keys to the repository.

### 16.7 Payment Concurrency and Transaction Safety

The payment recording pathway has a specific concurrency risk: two simultaneous payment submissions (e.g., a user double-clicking, or two devices logged into the same account) could both read the same `outstanding_balance`, both pass client-side validation, and together write payments that exceed the invoice total.

**Mitigations (all required):**

| Layer | Mitigation |
|---|---|
| **Database** | The `record_payment` RPC uses `SELECT ... FOR UPDATE` to acquire an exclusive row-level lock on the invoice before reading `outstanding_balance`. Concurrent transactions block until the lock is released. |
| **RPC atomicity** | All reads, validations, inserts, and updates execute inside a single `BEGIN/COMMIT` transaction. If any step fails, the entire transaction rolls back. |
| **RLS** | The `payments` table RLS policy ensures only the invoice's owning business can insert against it, preventing cross-account writes. |
| **Client** | The UI must disable the "Record Payment" submit button immediately after the first click and show a loading state. This prevents naive double-submission. |
| **No direct INSERT** | The Supabase JS client must never call `supabase.from('payments').insert(...)` directly. All payment writes must go through `supabase.rpc('record_payment', { ... })`. |

**Error handling:** The React client must catch and display the structured error codes returned by the RPC (`payment_exceeds_balance`, `payment_amount_invalid`, etc.) as user-friendly toast/alert messages.

---

## 17. Testing Strategy

### 17.1 Testing Philosophy for Hackathon

Given the 24-hour constraint, the testing strategy is pragmatic:
- **Unit tests** for critical calculation functions only.
- **Manual smoke tests** per feature before moving to the next.
- **No end-to-end testing framework** (Cypress/Playwright is out of scope for the MVP).

### 17.2 Unit Tests — Calculation Functions

The following functions must have unit tests (using Vitest, which ships with Vite):

| Function | Test Cases |
|---|---|
| `parseToPaise(input)` | Integer rupees, decimal paise, with ₹ symbol, with commas, `"0.10"` → 10, `"0.1"` → 10 |
| `calculateLineTotalPaise(qtyPaise, pricePaise)` | Standard, fractional quantity (1.5 units), zero quantity |
| `calculateInvoiceTotalPaise(items, taxRateBasisPoints)` | No tax, with 18% tax, multiple items; verify `0.1 + 0.2` scenario produces exact paise result |
| `calculateOutstandingPaise(totalPaise, paymentsInPaise[])` | Zero paid, single partial, multiple partials, fully paid |
| `determineInvoiceStatus(totalPaise, paidPaise, dueDate)` | All 5 status scenarios |
| `validatePaymentPaise(amountPaise, outstandingPaise)` | Valid amount, over-payment, zero, negative |
| `projectRecurringExpense(schedule, forecastDays)` | Monthly, weekly, quarterly, annually |
| `applyDelayedPaymentDelta(invoiceId, delayDays, forecastEndDate)` | Delay within window (shifts date), delay that pushes past 30-day window, delay that pushes past 90-day window (excluded entirely) |
| `formatINR(amount)` | Standard (₹1,000.00), lakh (₹1,00,000.00), crore (₹1,00,00,000.00) |

> **Integration test (not unit):** After the `record_payment` RPC is deployed, manually test the concurrency safeguard by opening two browser tabs simultaneously and attempting to submit payments that together exceed the outstanding balance. Only one must succeed.

### 17.3 Manual Smoke Tests — Per Feature

Before declaring a feature complete, the developer must verify:

**Auth:**
- [ ] Can register with a new email
- [ ] Cannot access dashboard without login
- [ ] Session persists on page refresh
- [ ] Can log out

**Business Onboarding:**
- [ ] New user is redirected to onboarding after first login
- [ ] Cannot proceed without required fields
- [ ] After onboarding, dashboard loads correctly

**Customers:**
- [ ] Can create a customer
- [ ] Can edit a customer
- [ ] Cannot delete a customer with invoices
- [ ] Customer detail shows correct invoice totals

**Invoices:**
- [ ] Can create an invoice with multiple line items
- [ ] Total auto-calculates correctly
- [ ] Invoice number is auto-generated
- [ ] Status updates to `overdue` when due date passes
- [ ] Cannot edit a paid invoice

**Payments:**
- [ ] Can record a full payment; status becomes `paid`
- [ ] Can record a partial payment; status becomes `partially_paid`
- [ ] Cannot record payment exceeding outstanding balance
- [ ] Cannot delete a payment

**Expenses:**
- [ ] Can create a one-time expense
- [ ] Can create a recurring expense
- [ ] Can edit and delete an expense

**Forecast:**
- [ ] Forecast renders chart for 30/60/90-day periods
- [ ] Assumptions are displayed
- [ ] Recurring expenses appear as projected outflows

**AI Features (if API available):**
- [ ] NL input produces a draft
- [ ] Draft can be edited before saving
- [ ] Discard does not save anything
- [ ] Reminder generates a draft message
- [ ] Insights display on dashboard

**Fallbacks:**
- [ ] AI NL entry falls back to form if API unavailable
- [ ] Reminder falls back to template if API unavailable
- [ ] Insights fall back to rule-based if API unavailable

### 17.4 Acceptance Criteria Summary

Each feature is complete when:
1. All manual smoke tests pass.
2. Data persists correctly in Supabase after page refresh.
3. RLS is confirmed (attempting to access another user's data returns nothing).
4. UI is functional on a 375px wide screen.

---

## 18. Deployment Strategy

### 18.1 Supabase Project Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com).
2. Run database migrations in order using Supabase SQL editor or Supabase CLI.
3. Enable RLS on all tables.
4. Create all RLS policies.
5. Deploy Edge Functions using Supabase CLI: `supabase functions deploy`.
6. Set Edge Function secrets: `supabase secrets set GEMINI_API_KEY=<key>`.
7. Enable Email Auth in Supabase Auth settings.

### 18.2 Vercel Deployment

1. Push code to a GitHub repository.
2. Connect the GitHub repository to a new Vercel project.
3. Set environment variables in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Build command: `vite build`
5. Output directory: `dist`
6. Every push to `main` triggers an automatic deployment.

### 18.3 Local Development Setup

```bash
# Clone repository
git clone <repo-url>
cd cashmate-ai

# Install dependencies
npm install

# Copy env template
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Start dev server
npm run dev
```

### 18.4 Database Migrations

Migrations must be numbered and committed to `supabase/migrations/`:

```
supabase/migrations/
  001_create_businesses.sql
  002_create_customers.sql
  003_create_invoices.sql
  004_create_invoice_items.sql
  005_create_payments.sql
  006_create_expenses.sql
  007_create_recurring_expenses.sql
  008_create_rls_policies.sql
  009_create_indexes.sql
  010_create_ai_logs.sql        ← only if OD-02 resolved YES
  011_create_payment_rpc.sql    ← record_payment() RPC with FOR UPDATE lock and atomic validation
```

### 18.5 Demo Data

Load sample data (see Appendix A) into the Supabase project using the SQL editor before the hackathon demo. Use fictional business names and customer names only.

---

## 19. Two-Developer Task Allocation

### 19.1 Developer A — Core App Backbone

**Primary ownership:**
| Feature | Sections |
|---|---|
| Project initialization (Vite + React + TypeScript + Tailwind + shadcn/ui setup) | §11 |
| Supabase project setup and database migrations | §13, §18.1 |
| Auth: register, login, logout, route protection | §5.1 |
| Business onboarding screen | §5.2, §8 |
| Business dashboard (KPIs, charts, recent invoices) | §5.3, §9 |
| Invoice creation form and line item management | §5.5 |
| Invoice list and detail views | §5.5, §9 |
| Payment recording (full and partial) | §5.6 |
| AI Edge Functions (all three: parse, remind, insights) | §14 |
| AI natural-language entry UI | §5.10 |
| AI payment reminder draft UI | §5.11 |
| AI financial insights on dashboard | §5.12 |

### 19.2 Developer B — Financial Intelligence

**Primary ownership:**
| Feature | Sections |
|---|---|
| Customer creation and list view | §5.4 |
| Customer detail page (invoices, totals) | §5.4 |
| Expense management (one-time and recurring) | §5.7 |
| Cash flow forecast screen (chart + assumptions) | §5.8, §15.6 |
| What-if simulation controls and dual-line chart | §5.9, §15.7 |
| Financial calculation utility functions + unit tests | §15, §17.2 |
| Settings screen (business profile editing) | §5.2, §9 |
| Mobile responsiveness polish across all screens | §10 |
| Vercel deployment and environment setup | §18.2 |
| Sample data loading for demo | Appendix A |

### 19.3 Shared Responsibilities

| Task | Both Developers |
|---|---|
| Design tokens and global Tailwind config | Dev A leads, Dev B reviews |
| shadcn/ui component additions | As needed, whoever needs it |
| Git branch strategy (feature branches → main) | Both |
| Final smoke testing | Both — cross-test each other's features |
| Hackathon presentation / demo preparation | Both |

### 19.4 Coordination Points

- **H+4:** Dev A: Auth + Onboarding done. Dev B: DB schema + Customer screen done.
- **H+8:** Dev A: Dashboard + Invoice Creation done. Dev B: Expense screen done.
- **H+12:** Dev A: Invoice List + Payment Recording done. Dev B: Forecast chart done.
- **H+18:** Dev A: AI features done (pending API key). Dev B: Simulation + mobile polish done.
- **H+22:** Full integration test, bug fixes, demo data loaded.
- **H+24:** Final deployment live on Vercel. Demo ready.

---

## 20. 24-Hour Hackathon Development Roadmap

### Phase 1 — Foundation (H+0 to H+4)

**Goal:** Working app skeleton with auth and navigation.

| Time | Dev A | Dev B |
|---|---|---|
| H+0 → H+1 | Initialize Vite + React + TS + Tailwind + shadcn/ui project | Set up Supabase project; write and run DB migrations 001–009 |
| H+1 → H+2 | Implement Supabase Auth (register, login, logout, session) | Create businesses table RLS; implement business onboarding screen |
| H+2 → H+3 | Build app shell: sidebar nav, bottom nav, route protection | Write all financial calculation utility functions + unit tests |
| H+3 → H+4 | Business dashboard skeleton (KPI card components, chart placeholder) | Build Customer List screen and Customer Create form |

**Milestone H+4:** App launches, user can register, onboard a business, see the dashboard skeleton, and create a customer. ✅

---

### Phase 2 — Core Financial Features (H+4 to H+12)

**Goal:** Complete invoice and payment flow; expense management.

| Time | Dev A | Dev B |
|---|---|---|
| H+4 → H+6 | Invoice creation form: customer selector, line items, auto-total, auto-number | Customer detail page (invoices list, total outstanding) |
| H+6 → H+8 | Invoice list (filterable by status); Invoice detail page | One-time expense: create, list, edit, delete |
| H+8 → H+10 | Payment recording (full + partial); balance recalculation; status update | Recurring expense: create, list, edit, delete |
| H+10 → H+11 | Wire up dashboard KPI cards with real data; last 6-month revenue chart | Expense list filter (by type, by category) |
| H+11 → H+12 | Recent invoices list on dashboard; overdue invoices list | Begin cash flow forecast: data computation (§15.6) |

**Milestone H+12:** User can create invoices, record full and partial payments, track expenses, and see accurate dashboard KPIs. ✅

---

### Phase 3 — Forecasting and AI (H+12 to H+20)

**Goal:** Cash flow forecast, what-if simulation, and all AI features.

| Time | Dev A | Dev B |
|---|---|---|
| H+12 → H+14 | Build 3 Supabase Edge Functions (ai-parse, ai-remind, ai-insights) | Forecast chart: Recharts area chart, 30/60/90-day toggle, assumptions panel |
| H+14 → H+16 | AI natural-language entry: modal UI, draft review form, confirm/discard | What-if simulation: parameter controls, dual-line chart overlay |
| H+16 → H+18 | AI payment reminder: button on invoice detail, draft text area, copy button | Mobile responsiveness: convert tables to card lists on mobile, bottom nav |
| H+18 → H+20 | AI insights: dashboard section, refresh button, fallback rules | Settings screen: edit business profile; Vercel deployment setup |

**Milestone H+18:** All features built. AI features working (or fallbacks in place). App deployed to Vercel. ✅

---

### Phase 4 — Polish and Demo Prep (H+20 to H+24)

**Goal:** Bug-free, demo-ready product.

| Time | Both Developers |
|---|---|
| H+20 → H+21 | Cross-test: Dev A tests Dev B's features; Dev B tests Dev A's features |
| H+21 → H+22 | Bug fixes from testing; load sample data into Supabase (Appendix A) |
| H+22 → H+23 | UI polish: spacing, typography, loading states, empty states, error states |
| H+23 → H+24 | Demo run-through; prepare talking points; final Vercel deploy check |

**Milestone H+24:** Polished, demo-ready application live on Vercel. ✅

### Feature Build Order Summary

```
Auth → Onboarding → DB Schema → Dashboard Shell → Customers
  → Invoices → Payments → Expenses → Dashboard (live data)
    → Forecast → Simulation → AI Features → Mobile Polish
      → Settings → Testing → Demo Prep
```

---

## Appendix A — Sample Data

> Load this fictional data into Supabase before the hackathon demo. All names, amounts, and businesses are fictional.

### Business

```
Name: Prism Digital Studio
Type: Agency
Owner: Arjun Mehra
Phone: +91 98100 00001
```

### Sample Customers

| Name | Email | Phone |
|---|---|---|
| Ramesh Textiles | ramesh@example.com | +91 98200 00001 |
| Priya Sharma | priya@example.com | +91 98200 00002 |
| Northern Foods Pvt Ltd | contact@northernfoods.com | +91 98200 00003 |
| Suresh Constructions | suresh@example.com | +91 98200 00004 |
| Anika Boutique | anika@example.com | +91 98200 00005 |

### Sample Invoices

| Invoice No | Customer | Amount | Status | Due Date |
|---|---|---|---|---|
| INV-202610-001 | Ramesh Textiles | ₹45,000 | partially_paid | 2026-10-31 |
| INV-202610-002 | Priya Sharma | ₹28,500 | paid | 2026-10-15 |
| INV-202611-001 | Northern Foods | ₹72,000 | sent | 2026-11-30 |
| INV-202611-002 | Suresh Constructions | ₹1,15,000 | overdue | 2026-11-10 |
| INV-202611-003 | Anika Boutique | ₹18,000 | draft | 2026-12-15 |

### Sample Payments

| Invoice | Amount | Date | Method |
|---|---|---|---|
| INV-202610-001 | ₹20,000 | 2026-10-25 | UPI |
| INV-202610-002 | ₹28,500 | 2026-10-14 | Bank Transfer |

### Sample Expenses

> These are **actual paid expenses** stored in the `expenses` table (one-time only).

| Description | Amount | Date | Category | Type |
|---|---|---|---|---|
| Team Lunch | ₹3,200 | 2026-11-15 | Other | one_time |
| Facebook Ads | ₹8,000 | 2026-11-10 | Marketing | one_time |

### Sample Recurring Expense Schedules

> These are **forecast schedule definitions** stored in the `recurring_expenses` table. They drive projected outflows in the cash flow forecast. When the business actually pays rent in November, that payment is recorded separately in the `expenses` table as a one-time entry.

| Description | Amount | Frequency | Start Date | Category |
|---|---|---|---|---|
| Office Rent | ₹25,000 | monthly | 2026-11-01 | Rent |
| Adobe Creative Suite | ₹5,500 | monthly | 2026-11-01 | Software |
| Internet Bill | ₹1,800 | monthly | 2026-11-05 | Utilities |

---

## Appendix B — Glossary

| Term | Definition |
|---|---|
| **Outstanding Balance** | The amount remaining on an invoice after all payments: `total_amount - amount_paid` |
| **Partial Payment** | A payment that covers only a portion of the invoice total |
| **Recurring Expense Schedule** | A forecast schedule definition in `recurring_expenses` that projects future outflows. Does NOT represent a paid expense. |
| **Actual Expense** | A one-time paid expense recorded in the `expenses` table representing money already spent |
| **Cash Flow Forecast** | A projection of future cash inflows and outflows over 30, 60, or 90 days |
| **What-If Simulation** | A display-only scenario where the user adjusts forecast assumptions to see hypothetical outcomes |
| **NL Entry** | Natural-language entry — the user describes a financial record in plain text and AI parses it into structured fields |
| **Draft** | A record generated by AI that has not yet been reviewed and confirmed by the user |
| **RLS** | Row-Level Security — a Supabase/Postgres feature that restricts database access per user |
| **INR** | Indian Rupee — the only currency supported by this MVP |
| **KPI** | Key Performance Indicator — a summary metric displayed on the dashboard |
| **Edge Function** | A serverless function running on Supabase's infrastructure (Deno runtime) used to proxy AI API calls |
| **Overdue** | An invoice where the due date has passed and the outstanding balance is greater than zero |
| **Opening Balance** | The user-entered current cash amount used as the starting point for the cash flow forecast |
| **Confidence Score** | A 0–1 value returned by the AI indicating how certain it is about its NL parsing result |
| **Deterministic** | A calculation that always produces the same result for the same inputs — no randomness or AI involvement |
| **Paise** | The smallest unit of INR: 1 rupee = 100 paise. All internal monetary arithmetic uses integer paise to avoid floating-point errors. |
| **Paise Arithmetic** | The practice of converting all monetary values to integer paise before performing arithmetic, then converting back to rupees for display and storage. Avoids JavaScript floating-point precision errors. |
| **Direct Paise Parsing** | Parsing a monetary string input into integer paise by splitting on the decimal point and processing rupees and paise parts as integers separately — without passing through floating-point multiplication. |
| **Net Cash Movement** | The dashboard KPI showing `payments received this month − expenses paid this month`. A positive value means more money came in than went out. It is not a running account balance. |
| **record_payment RPC** | A PostgreSQL function that inserts a payment atomically, validating invoice ownership, payment amount, outstanding balance, and payment details inside a single transaction with a row-level lock. The only permitted way to write to the `payments` table. |
| **FOR UPDATE Lock** | A PostgreSQL row-level lock acquired by `SELECT ... FOR UPDATE` that prevents concurrent transactions from modifying the same row until the current transaction commits or rolls back. Used by `record_payment` to prevent race conditions. |

---

*End of Document — CASHMATE AI PRD v1.1*
*This document is the single source of truth. All development chats must read it before beginning work.*
