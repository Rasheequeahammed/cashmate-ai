-- 003_create_invoices.sql
-- Invoices owned by a business (PRD §13.3, §15.3, §16.1).
--
-- Security model for payment-driven fields (amount_paid, outstanding_balance):
--   - Excluded from column-level INSERT and UPDATE grants.
--   - Initialized and maintained by the maintain_invoice_state() trigger.
--   - After issuance, updated exclusively by record_payment() SECURITY DEFINER RPC
--     (migration 011), which bypasses column-level grants via SECURITY DEFINER.

CREATE TABLE IF NOT EXISTS public.invoices (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         uuid          NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id         uuid          NOT NULL,
  invoice_number      text          NOT NULL,
  issue_date          date          NOT NULL,
  due_date            date          NOT NULL,
  status              text          NOT NULL DEFAULT 'draft',
  subtotal            numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate            numeric(5,2),
  tax_amount          numeric(12,2),
  total_amount        numeric(12,2) NOT NULL DEFAULT 0,
  amount_paid         numeric(12,2) NOT NULL DEFAULT 0,
  outstanding_balance numeric(12,2) NOT NULL DEFAULT 0,
  notes               text,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),

  -- Business-scoped unique invoice number (PRD §13.3, FR-INV-09).
  CONSTRAINT invoices_number_unique_per_business
    UNIQUE (business_id, invoice_number),

  -- Cross-business integrity: customer must belong to the same business.
  -- Relies on customers(id, business_id) UNIQUE constraint from migration 002.
  -- No ON DELETE clause = RESTRICT: deleting a customer blocks if invoices exist.
  CONSTRAINT invoices_customer_business_fk
    FOREIGN KEY (customer_id, business_id)
    REFERENCES public.customers(id, business_id),

  CONSTRAINT invoices_status_check
    CHECK (status IN ('draft', 'sent', 'partially_paid', 'paid', 'overdue')),

  CONSTRAINT invoices_due_date_gte_issue_date
    CHECK (due_date >= issue_date),

  -- Financial sanity (PRD §15).
  CONSTRAINT invoices_subtotal_non_negative
    CHECK (subtotal >= 0),

  CONSTRAINT invoices_total_non_negative
    CHECK (total_amount >= 0),

  CONSTRAINT invoices_amount_paid_non_negative
    CHECK (amount_paid >= 0),

  CONSTRAINT invoices_outstanding_non_negative
    CHECK (outstanding_balance >= 0),

  CONSTRAINT invoices_amount_paid_lte_total
    CHECK (amount_paid <= total_amount),

  CONSTRAINT invoices_tax_rate_range
    CHECK (tax_rate IS NULL OR (tax_rate >= 0 AND tax_rate <= 100)),

  -- Balance identity (PRD §15.2). The trigger maintains this invariant;
  -- the constraint enforces it at the row level after every write.
  CONSTRAINT invoices_balance_consistency
    CHECK (outstanding_balance = total_amount - amount_paid),

  -- Payment status consistency (PRD §15.3).
  -- Prevents clients from directly setting 'paid' or 'partially_paid' to
  -- inconsistent values. record_payment() sets these correctly via the RPC.
  CONSTRAINT invoices_paid_requires_zero_outstanding
    CHECK (status != 'paid' OR outstanding_balance = 0),

  -- 'partially_paid' requires that payment has been received AND an unpaid balance remains.
  CONSTRAINT invoices_partially_paid_status_consistency
    CHECK (
      status != 'partially_paid'
      OR (amount_paid > 0 AND outstanding_balance > 0)
    ),

  -- Named composite unique: required for payments(invoice_id, business_id)
  -- composite FK. Prevents cross-business payment references at the DB level.
  CONSTRAINT invoices_id_business_unique
    UNIQUE (id, business_id)
);

-- ── Trigger: maintain invoice state and lifecycle ────────────────────────────
-- Fires BEFORE INSERT OR UPDATE OR DELETE on every invoice row.
--
-- DELETE path:
--   Enforces draft-only deletion at the trigger level (PRD §5.5 FR-INV-08).
--
-- INSERT path:
--   Enforces that new invoices must start in 'draft' status.
--   Forces amount_paid = 0 and outstanding_balance = total_amount.
--   These columns are excluded from the authenticated INSERT grant, so this
--   trigger is the only mechanism that sets them on new rows.
--
-- UPDATE path:
--   Sets updated_at = now().
--   For direct client requests (current_user IN ('authenticated', 'anon')):
--     - Rejects any direct client edit to amount_paid or outstanding_balance.
--     - Rejects setting status to 'paid', 'partially_paid', or 'overdue'.
--     - Allows draft -> draft (recomputing balance) or draft -> sent.
--     - Blocks reverting issued invoices back to draft.
--     - Blocks changing the status of an already-issued invoice.
--     - Freezes financial, date, and identity fields of an issued invoice.
--
-- SECURITY INVOKER: runs with the privileges of the statement issuer.
-- When called from record_payment() (SECURITY DEFINER), current_user is postgres,
-- so client-specific mutation guards do not block the RPC.

CREATE OR REPLACE FUNCTION public.maintain_invoice_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- ── 1. DELETE ENFORCEMENT ───────────────────────────────────────────────────
  IF TG_OP = 'DELETE' THEN
    IF OLD.status != 'draft' THEN
      RAISE EXCEPTION 'invoice_delete_invalid: Only draft invoices may be deleted (current status: %)', OLD.status;
    END IF;
    RETURN OLD;
  END IF;

  -- ── 2. INSERT ENFORCEMENT ───────────────────────────────────────────────────
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION 'invoice_status_invalid: New invoices must be created in draft status';
    END IF;

    NEW.amount_paid         := 0;
    NEW.outstanding_balance := NEW.total_amount;
    RETURN NEW;
  END IF;

  -- ── 3. UPDATE ENFORCEMENT ───────────────────────────────────────────────────
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();

    -- Protections applying to direct client traffic (authenticated / anon):
    IF current_user IN ('authenticated', 'anon') THEN

      -- Rule 3a: Clients cannot modify payment-driven columns directly
      IF NEW.amount_paid IS DISTINCT FROM OLD.amount_paid
         OR NEW.outstanding_balance IS DISTINCT FROM OLD.outstanding_balance THEN
        RAISE EXCEPTION 'invoice_payment_fields_protected: Payment fields can only be modified via record_payment()';
      END IF;

      -- Rule 3b: Clients must not directly set paid, partially_paid, or overdue
      IF NEW.status IN ('paid', 'partially_paid', 'overdue') THEN
        RAISE EXCEPTION 'invoice_status_invalid: Status % can only be set by the payment system', NEW.status;
      END IF;

      -- Rule 3c: Status transitions from draft
      IF OLD.status = 'draft' THEN
        -- Draft invoices can only remain 'draft' or transition to 'sent'
        IF NEW.status NOT IN ('draft', 'sent') THEN
          RAISE EXCEPTION 'invoice_status_invalid: Draft invoices can only transition to sent';
        END IF;

        -- If remaining in draft, recompute balance based on draft line item edits
        IF NEW.status = 'draft' THEN
          NEW.outstanding_balance := NEW.total_amount - NEW.amount_paid;
        END IF;

      -- Rule 3d: Enforce immutability and disallow reversion once issued (status != 'draft')
      ELSE
        -- Disallow changing status back to draft
        IF NEW.status = 'draft' THEN
          RAISE EXCEPTION 'invoice_status_invalid: Cannot revert an issued invoice to draft';
        END IF;

        -- Disallow direct status alterations of an issued invoice
        IF NEW.status IS DISTINCT FROM OLD.status THEN
          RAISE EXCEPTION 'invoice_status_invalid: Cannot directly alter status of an issued invoice';
        END IF;

        -- Disallow modifying business ownership, financial, date, or identity details of an issued invoice
        IF NEW.business_id IS DISTINCT FROM OLD.business_id
           OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
           OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
           OR NEW.tax_rate IS DISTINCT FROM OLD.tax_rate
           OR NEW.tax_amount IS DISTINCT FROM OLD.tax_amount
           OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
           OR NEW.invoice_number IS DISTINCT FROM OLD.invoice_number
           OR NEW.issue_date IS DISTINCT FROM OLD.issue_date
           OR NEW.due_date IS DISTINCT FROM OLD.due_date THEN
          RAISE EXCEPTION 'invoice_immutable: Cannot modify business, financial, date, or identity details of an issued invoice';
        END IF;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS maintain_invoice_state ON public.invoices;
CREATE TRIGGER maintain_invoice_state
  BEFORE INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.maintain_invoice_state();

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- ── Policies ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "invoices_select_own_business" ON public.invoices;
CREATE POLICY "invoices_select_own_business"
  ON public.invoices FOR SELECT
  USING (business_id IN (
    SELECT id FROM public.businesses WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "invoices_insert_own_business" ON public.invoices;
CREATE POLICY "invoices_insert_own_business"
  ON public.invoices FOR INSERT
  WITH CHECK (business_id IN (
    SELECT id FROM public.businesses WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "invoices_update_own_business" ON public.invoices;
CREATE POLICY "invoices_update_own_business"
  ON public.invoices FOR UPDATE
  USING  (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- RLS enforces draft-only deletion at policy evaluation time (PRD §5.5 FR-INV-08).
-- In addition, the foreign key on payments(invoice_id, business_id) has no ON DELETE CASCADE,
-- so any attempt to delete an invoice with recorded payments is blocked with error 23503.
DROP POLICY IF EXISTS "invoices_delete_own_business" ON public.invoices;
CREATE POLICY "invoices_delete_own_business"
  ON public.invoices FOR DELETE
  USING (
    status = 'draft'
    AND business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- ── Privileges ────────────────────────────────────────────────────────────────
REVOKE ALL ON public.invoices FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.invoices TO authenticated;

-- INSERT: amount_paid and outstanding_balance are intentionally excluded.
-- The maintain_invoice_state trigger sets them to 0 and total_amount respectively.
GRANT INSERT (
  business_id, customer_id, invoice_number,
  issue_date, due_date, status,
  subtotal, tax_rate, tax_amount, total_amount,
  notes
) ON public.invoices TO authenticated;

-- UPDATE: amount_paid and outstanding_balance are intentionally excluded.
-- Those fields are managed exclusively by record_payment() (migration 011).
-- status is included so the application can transition draft -> sent.
GRANT UPDATE (
  customer_id, invoice_number,
  issue_date, due_date, status,
  subtotal, tax_rate, tax_amount, total_amount,
  notes
) ON public.invoices TO authenticated;

GRANT DELETE ON public.invoices TO authenticated;
