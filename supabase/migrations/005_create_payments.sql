-- 005_create_payments.sql
-- Payment records (PRD §13.5, §16.2, §16.7).
--
-- Write access model:
--   - No INSERT policy  -> direct client inserts are denied (RLS blocks them).
--   - No UPDATE policy  -> direct client updates are denied.
--   - DELETE policy USING (false) -> deletes are denied for all users (FR-PAY-08).
--   - Only the record_payment() SECURITY DEFINER RPC (migration 011) can write
--     to this table, because SECURITY DEFINER bypasses RLS.
--   - Only SELECT is granted to authenticated.

CREATE TABLE IF NOT EXISTS public.payments (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     uuid          NOT NULL,
  business_id    uuid          NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  amount         numeric(12,2) NOT NULL,
  payment_date   date          NOT NULL,
  payment_method text          NOT NULL DEFAULT 'other',
  notes          text,
  created_at     timestamptz   NOT NULL DEFAULT now(),

  -- Cross-business integrity: invoice must belong to the same business.
  -- No ON DELETE clause = RESTRICT: deleting an invoice with payments is blocked.
  -- This enforces FR-INV-08 at the DB level.
  CONSTRAINT payments_invoice_business_fk
    FOREIGN KEY (invoice_id, business_id)
    REFERENCES public.invoices(id, business_id),

  CONSTRAINT payments_amount_positive
    CHECK (amount > 0),

  CONSTRAINT payments_method_check
    CHECK (payment_method IN ('cash', 'bank_transfer', 'upi', 'other'))
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ── Policies ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "payments_select_own_business" ON public.payments;
CREATE POLICY "payments_select_own_business"
  ON public.payments FOR SELECT
  USING (business_id IN (
    SELECT id FROM public.businesses WHERE user_id = auth.uid()
  ));

-- No INSERT policy: direct client inserts are denied by RLS.
-- No UPDATE policy: direct client updates are denied by RLS.

-- Explicit DELETE denial (PRD §5.6 FR-PAY-08, §16.2).
DROP POLICY IF EXISTS "payments_no_delete" ON public.payments;
CREATE POLICY "payments_no_delete"
  ON public.payments FOR DELETE
  USING (false);

-- ── Privileges ────────────────────────────────────────────────────────────────
-- SELECT only. All writes go through record_payment() (migration 011).
REVOKE ALL ON public.payments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.payments TO authenticated;
