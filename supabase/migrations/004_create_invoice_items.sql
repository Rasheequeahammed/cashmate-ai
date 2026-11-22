-- 004_create_invoice_items.sql
-- Invoice line items (PRD §13.4, §16.1).
-- No business_id column; ownership is derived through the parent invoice.

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid          NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text          NOT NULL,
  quantity    numeric(10,2) NOT NULL DEFAULT 1,
  unit_price  numeric(12,2) NOT NULL,
  line_total  numeric(12,2) NOT NULL,
  sort_order  integer       NOT NULL DEFAULT 0,

  CONSTRAINT invoice_items_description_not_blank
    CHECK (length(btrim(description)) > 0),

  CONSTRAINT invoice_items_quantity_positive
    CHECK (quantity > 0),

  CONSTRAINT invoice_items_unit_price_non_negative
    CHECK (unit_price >= 0),

  CONSTRAINT invoice_items_line_total_non_negative
    CHECK (line_total >= 0)
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- ── Policies ──────────────────────────────────────────────────────────────────
-- Ownership is derived through invoices -> businesses -> auth.uid().
DROP POLICY IF EXISTS "invoice_items_select_own_business" ON public.invoice_items;
CREATE POLICY "invoice_items_select_own_business"
  ON public.invoice_items FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE business_id IN (
        SELECT id FROM public.businesses WHERE user_id = auth.uid()
      )
    )
  );

-- Line items can only be inserted, updated, or deleted while the parent invoice is in 'draft' status.
-- This ensures issued invoices remain immutable at the line-item level.
DROP POLICY IF EXISTS "invoice_items_insert_own_business" ON public.invoice_items;
CREATE POLICY "invoice_items_insert_own_business"
  ON public.invoice_items FOR INSERT
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE status = 'draft'
        AND business_id IN (
          SELECT id FROM public.businesses WHERE user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "invoice_items_update_own_business" ON public.invoice_items;
CREATE POLICY "invoice_items_update_own_business"
  ON public.invoice_items FOR UPDATE
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE status = 'draft'
        AND business_id IN (
          SELECT id FROM public.businesses WHERE user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE status = 'draft'
        AND business_id IN (
          SELECT id FROM public.businesses WHERE user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "invoice_items_delete_own_business" ON public.invoice_items;
CREATE POLICY "invoice_items_delete_own_business"
  ON public.invoice_items FOR DELETE
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE status = 'draft'
        AND business_id IN (
          SELECT id FROM public.businesses WHERE user_id = auth.uid()
        )
    )
  );

-- ── Privileges ────────────────────────────────────────────────────────────────
REVOKE ALL ON public.invoice_items FROM PUBLIC, anon, authenticated;

GRANT SELECT                                                                 ON public.invoice_items TO authenticated;
GRANT INSERT (invoice_id, description, quantity, unit_price, line_total, sort_order)
                                                                             ON public.invoice_items TO authenticated;
GRANT UPDATE (description, quantity, unit_price, line_total, sort_order)     ON public.invoice_items TO authenticated;
GRANT DELETE                                                                 ON public.invoice_items TO authenticated;
