-- 007_create_recurring_expenses.sql
-- Recurring expense schedule definitions for cash flow forecast (PRD §13.7, §16.1).
-- These are NOT paid expenses. They project future outflows for the forecast only.
-- When a recurring bill is actually paid, it is recorded separately as a one-time
-- entry in the expenses table (migration 006). The system must never auto-create
-- rows in expenses from this table (PRD §5.7 FR-EXP-04).

CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid          NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  description text          NOT NULL,
  amount      numeric(12,2) NOT NULL,
  frequency   text          NOT NULL,
  start_date  date          NOT NULL,
  end_date    date,
  category    text          NOT NULL,
  is_active   boolean       NOT NULL DEFAULT true,
  notes       text,
  created_at  timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT recurring_expenses_description_not_blank
    CHECK (length(btrim(description)) > 0),

  CONSTRAINT recurring_expenses_amount_positive
    CHECK (amount > 0),

  CONSTRAINT recurring_expenses_frequency_check
    CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'annually')),

  CONSTRAINT recurring_expenses_category_check
    CHECK (category IN (
      'Rent', 'Salaries', 'Utilities', 'Marketing',
      'Travel', 'Supplies', 'Software', 'Other'
    )),

  CONSTRAINT recurring_expenses_end_date_gte_start
    CHECK (end_date IS NULL OR end_date >= start_date)
);

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

-- ── Policies ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "recurring_expenses_select_own_business" ON public.recurring_expenses;
CREATE POLICY "recurring_expenses_select_own_business"
  ON public.recurring_expenses FOR SELECT
  USING (business_id IN (
    SELECT id FROM public.businesses WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "recurring_expenses_insert_own_business" ON public.recurring_expenses;
CREATE POLICY "recurring_expenses_insert_own_business"
  ON public.recurring_expenses FOR INSERT
  WITH CHECK (business_id IN (
    SELECT id FROM public.businesses WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "recurring_expenses_update_own_business" ON public.recurring_expenses;
CREATE POLICY "recurring_expenses_update_own_business"
  ON public.recurring_expenses FOR UPDATE
  USING  (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "recurring_expenses_delete_own_business" ON public.recurring_expenses;
CREATE POLICY "recurring_expenses_delete_own_business"
  ON public.recurring_expenses FOR DELETE
  USING (business_id IN (
    SELECT id FROM public.businesses WHERE user_id = auth.uid()
  ));

-- ── Privileges ────────────────────────────────────────────────────────────────
REVOKE ALL ON public.recurring_expenses FROM PUBLIC, anon, authenticated;

GRANT SELECT                                                                                              ON public.recurring_expenses TO authenticated;
GRANT INSERT (business_id, description, amount, frequency, start_date, end_date, category, is_active, notes)
                                                                                                          ON public.recurring_expenses TO authenticated;
-- business_id excluded from UPDATE: ownership must not change after creation.
GRANT UPDATE (description, amount, frequency, start_date, end_date, category, is_active, notes)           ON public.recurring_expenses TO authenticated;
GRANT DELETE                                                                                              ON public.recurring_expenses TO authenticated;
