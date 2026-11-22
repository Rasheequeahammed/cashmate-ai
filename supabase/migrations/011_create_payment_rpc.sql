-- 011_create_payment_rpc.sql
-- record_payment() — the sole permitted write pathway for the payments table.
-- (PRD §13.5, §15.4, §16.7)
--
-- SECURITY DEFINER: runs as the function owner (postgres role), bypassing RLS
-- on the payments table. Caller identity is verified in Step 1 via auth.uid().
--
-- SET search_path = '': best-practice protection against search-path hijacking.
-- All database objects, schemas, and types must be fully qualified.

CREATE OR REPLACE FUNCTION public.record_payment(
  p_invoice_id  uuid,
  p_business_id uuid,
  p_amount      numeric,
  p_date        date,
  p_method      text,
  p_notes       text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invoice         public.invoices%ROWTYPE;
  v_new_amount_paid numeric(12,2);
  v_new_outstanding numeric(12,2);
  v_new_status      text;
  v_payment_id      uuid;
BEGIN
  -- Step 0: Validate required scalar inputs before touching the database.
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'payment_amount_invalid: Amount must be greater than 0';
  END IF;

  IF p_date IS NULL THEN
    RAISE EXCEPTION 'payment_date_required: Payment date is required';
  END IF;

  IF p_method IS NULL OR p_method NOT IN ('cash', 'bank_transfer', 'upi', 'other') THEN
    RAISE EXCEPTION 'payment_method_invalid: Must be cash, bank_transfer, upi, or other';
  END IF;

  -- Step 1: Verify the calling user owns the stated business via fully-qualified auth.uid().
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id      = p_business_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'payment_ownership_invalid: Access denied';
  END IF;

  -- Step 2: Acquire an exclusive row-level lock on the invoice (PRD §16.7).
  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id          = p_invoice_id
    AND business_id = p_business_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_ownership_invalid: Invoice not found or does not belong to this business';
  END IF;

  -- Step 3: Block payment against draft invoices.
  IF v_invoice.status = 'draft' THEN
    RAISE EXCEPTION 'payment_invoice_draft: Cannot record a payment against a draft invoice';
  END IF;

  -- Step 4: Server-side payment amount validation (PRD §15.4, FR-PAY-05).
  IF p_amount > v_invoice.outstanding_balance THEN
    RAISE EXCEPTION 'payment_exceeds_balance: Amount % exceeds outstanding balance %',
      p_amount, v_invoice.outstanding_balance;
  END IF;

  -- Step 5: Insert the payment record into public.payments.
  INSERT INTO public.payments (
    invoice_id, business_id, amount, payment_date, payment_method, notes
  )
  VALUES (
    p_invoice_id, p_business_id, p_amount, p_date, p_method, p_notes
  )
  RETURNING id INTO v_payment_id;

  -- Step 6: Recalculate totals using deterministic numeric arithmetic.
  v_new_amount_paid := v_invoice.amount_paid + p_amount;
  v_new_outstanding := v_invoice.total_amount - v_new_amount_paid;

  -- Step 7: Determine new invoice status (PRD §15.3 evaluation order).
  v_new_status := CASE
    WHEN v_new_outstanding <= 0            THEN 'paid'
    WHEN v_new_amount_paid > 0             THEN 'partially_paid'
    WHEN v_invoice.due_date < CURRENT_DATE THEN 'overdue'
    ELSE v_invoice.status                       -- preserve 'sent'
  END;

  -- Step 8: Update the invoice atomically in the same transaction.
  UPDATE public.invoices
  SET
    amount_paid         = v_new_amount_paid,
    outstanding_balance = v_new_outstanding,
    status              = v_new_status,
    updated_at          = pg_catalog.now()
  WHERE id = p_invoice_id;

  RETURN v_payment_id;
END;
$$;

-- Explicitly ensure record_payment() is owned by the intended privileged database role
ALTER FUNCTION public.record_payment(uuid, uuid, numeric, date, text, text) OWNER TO postgres;

-- ── Privileges ────────────────────────────────────────────────────────────────
REVOKE ALL     ON FUNCTION public.record_payment(uuid, uuid, numeric, date, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.record_payment(uuid, uuid, numeric, date, text, text)
  TO authenticated;
