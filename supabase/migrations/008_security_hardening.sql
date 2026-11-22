-- 008_security_hardening.sql
-- Final security hardening: RLS confirmation, privilege correction for businesses,
-- and explicit anon denial across all tables (PRD §16).

-- ── Confirm RLS on all tables (all ALTER ENABLE are idempotent) ───────────────
ALTER TABLE public.businesses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses   ENABLE ROW LEVEL SECURITY;

-- ── businesses: set explicit least-privilege grants ───────────────────────────
-- Migration 001 did not include GRANT/REVOKE statements. This migration
-- closes that gap without modifying migration 001.
-- No DELETE grant: the absence of a DELETE policy in migration 001's RLS
-- already blocks deletes. No object-level DELETE grant is added here.
REVOKE ALL ON public.businesses FROM PUBLIC, anon, authenticated;

GRANT SELECT                                                        ON public.businesses TO authenticated;
GRANT INSERT (user_id, name, type, owner_name, phone, logo_url)     ON public.businesses TO authenticated;
GRANT UPDATE (name, type, owner_name, phone, logo_url)              ON public.businesses TO authenticated;

-- ── Explicit anon denial on all tables ───────────────────────────────────────
-- With RLS enabled and no anon policies, anon is already blocked. The explicit
-- REVOKE below closes the case where Supabase's bootstrap grants may have
-- added residual object-level privileges for anon on the public schema.
REVOKE ALL ON public.businesses           FROM anon;
REVOKE ALL ON public.customers            FROM anon;
REVOKE ALL ON public.invoices             FROM anon;
REVOKE ALL ON public.invoice_items        FROM anon;
REVOKE ALL ON public.payments             FROM anon;
REVOKE ALL ON public.expenses             FROM anon;
REVOKE ALL ON public.recurring_expenses   FROM anon;
