-- 009_create_indexes.sql
-- Performance indexes (PRD §13.9). All use IF NOT EXISTS; safe to rerun.

CREATE INDEX IF NOT EXISTS idx_customers_business_id
  ON public.customers(business_id);

CREATE INDEX IF NOT EXISTS idx_invoices_business_id
  ON public.invoices(business_id);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id
  ON public.invoices(customer_id);

CREATE INDEX IF NOT EXISTS idx_invoices_status
  ON public.invoices(status);

CREATE INDEX IF NOT EXISTS idx_invoices_due_date
  ON public.invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id
  ON public.invoice_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id
  ON public.payments(invoice_id);

CREATE INDEX IF NOT EXISTS idx_payments_business_id
  ON public.payments(business_id);

CREATE INDEX IF NOT EXISTS idx_expenses_business_id
  ON public.expenses(business_id);

CREATE INDEX IF NOT EXISTS idx_expenses_expense_date
  ON public.expenses(expense_date);

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_business_id
  ON public.recurring_expenses(business_id);
