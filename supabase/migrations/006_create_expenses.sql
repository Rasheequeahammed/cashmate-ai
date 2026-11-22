-- 006_create_expenses.sql
-- Actual paid one-time expenses (PRD §13.6, §16.1).
-- Separation rule (PRD §5.7 FR-EXP-04): expense_type is locked to 'one_time'
-- by a CHECK constraint. Recurring forecast schedules live exclusively in
-- recurring_expenses (migration 007).

CREATE TABLE IF NOT EXISTS public.expenses (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid          NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  description  text          NOT NULL,
  amount       numeric(12,2) NOT NULL,
  expense_date date          NOT NULL,
  category     text          NOT NULL,
  expense_type text          NOT NULL DEFAULT 'one_time',
  notes        text,
  created_at   timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT expenses_description_not_blank
    CHECK (length(btrim(description)) > 0),

  CONSTRAINT expenses_amount_positive
    CHECK (amount > 0),

  CONSTRAINT expenses_category_check
    CHECK (category IN (
      'Rent', 'Salaries', 'Utilities', 'Marketing',
      'Travel', 'Supplies', 'Software', 'Other'
    )),

  -- Enforce the strict separation rule at the DB level (PRD §5.7 FR-EXP-04).
  -- The value 'recurring' must never appear in this table.
  CONSTRAINT expenses_type_must_be_one_time
    CHECK (expense_type = 'one_time')
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- ── Policies ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "expenses_select_own_business" ON public.expenses;
CREATE POLICY "expenses_select_own_business"
  ON public.expenses FOR SELECT
  USING (business_id IN (
    SELECT id FROM public.businesses WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "expenses_insert_own_business" ON public.expenses;
CREATE POLICY "expenses_insert_own_business"
  ON public.expenses FOR INSERT
  WITH CHECK (business_id IN (
    SELECT id FROM public.businesses WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "expenses_update_own_business" ON public.expenses;
CREATE POLICY "expenses_update_own_business"
  ON public.expenses FOR UPDATE
  USING  (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "expenses_delete_own_business" ON public.expenses;
CREATE POLICY "expenses_delete_own_business"
  ON public.expenses FOR DELETE
  USING (business_id IN (
    SELECT id FROM public.businesses WHERE user_id = auth.uid()
  ));

-- ── Privileges ────────────────────────────────────────────────────────────────
REVOKE ALL ON public.expenses FROM PUBLIC, anon, authenticated;

GRANT SELECT                                                                            ON public.expenses TO authenticated;
GRANT INSERT (business_id, description, amount, expense_date, category, expense_type, notes)
                                                                                        ON public.expenses TO authenticated;
-- expense_type excluded from UPDATE: it must remain 'one_time' (enforced by constraint).
-- business_id excluded from UPDATE: ownership must not change after creation.
GRANT UPDATE (description, amount, expense_date, category, notes)                      ON public.expenses TO authenticated;
GRANT DELETE                                                                            ON public.expenses TO authenticated;
