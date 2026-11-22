-- 002_create_customers.sql
-- Customer profiles owned by a business (PRD §13.2, §16.1).

CREATE TABLE IF NOT EXISTS public.customers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  email       text,
  phone       text,
  address     text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT customers_name_not_blank
    CHECK (length(btrim(name)) > 0),

  -- Named composite unique: required for invoices(customer_id, business_id)
  -- composite FK. Prevents cross-business customer references at the DB level.
  CONSTRAINT customers_id_business_unique
    UNIQUE (id, business_id)
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- ── Policies ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "customers_select_own_business" ON public.customers;
CREATE POLICY "customers_select_own_business"
  ON public.customers FOR SELECT
  USING (business_id IN (
    SELECT id FROM public.businesses WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "customers_insert_own_business" ON public.customers;
CREATE POLICY "customers_insert_own_business"
  ON public.customers FOR INSERT
  WITH CHECK (business_id IN (
    SELECT id FROM public.businesses WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "customers_update_own_business" ON public.customers;
CREATE POLICY "customers_update_own_business"
  ON public.customers FOR UPDATE
  USING  (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- RLS allows DELETE; the FK on invoices(customer_id) with no ON DELETE CASCADE
-- means the DB rejects the delete with error 23503 if invoices exist.
-- Application must catch 23503 and show "Cannot delete a customer with invoices."
DROP POLICY IF EXISTS "customers_delete_own_business" ON public.customers;
CREATE POLICY "customers_delete_own_business"
  ON public.customers FOR DELETE
  USING (business_id IN (
    SELECT id FROM public.businesses WHERE user_id = auth.uid()
  ));

-- ── Privileges ────────────────────────────────────────────────────────────────
REVOKE ALL ON public.customers FROM PUBLIC, anon, authenticated;

GRANT SELECT                                                      ON public.customers TO authenticated;
GRANT INSERT (business_id, name, email, phone, address, notes)    ON public.customers TO authenticated;
GRANT UPDATE (name, email, phone, address, notes)                 ON public.customers TO authenticated;
GRANT DELETE                                                      ON public.customers TO authenticated;
