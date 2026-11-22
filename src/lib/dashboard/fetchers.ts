import { supabase } from "../supabase";
import type { RawInvoice, RawPayment, RawExpense } from "./mappers";

export interface CustomerSummary {
  id: string;
  name: string;
}

/**
 * Fetches all customers for a given business, sorted alphabetically by name.
 */
export async function fetchCustomers(businessId: string): Promise<CustomerSummary[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("id, name")
    .eq("business_id", businessId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch customers: ${error.message}`);
  }

  return (data as CustomerSummary[]) ?? [];
}

/**
 * Fetches all invoices for a given business.
 * Resolves customer names via a separate batch query to avoid unverified relationship embeds.
 * Skips customer lookup when there are no customer IDs.
 * Handles missing customer records safely with "Customer name unavailable".
 */
export async function fetchInvoices(businessId: string): Promise<RawInvoice[]> {
  const { data: invoicesData, error: invoicesError } = await supabase
    .from("invoices")
    .select(
      "id, customer_id, invoice_number, status, issue_date, due_date, created_at, total_amount, amount_paid, outstanding_balance",
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (invoicesError) {
    throw new Error(`Failed to fetch invoices: ${errorInvoices(invoicesError)}`);
  }

  const rawInvoices = invoicesData ?? [];

  // Collect unique non-empty customer IDs
  const customerIds = Array.from(
    new Set(
      rawInvoices
        .map((inv) => inv.customer_id)
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0),
    ),
  );

  const customerMap = new Map<string, string>();

  // Skip the customer query if there are no customer IDs
  if (customerIds.length > 0) {
    const { data: customersData, error: customersError } = await supabase
      .from("customers")
      .select("id, name")
      .eq("business_id", businessId)
      .in("id", customerIds);

    if (customersError) {
      throw new Error(`Failed to fetch customers: ${customersError.message}`);
    }

    for (const customer of customersData ?? []) {
      if (customer.id && customer.name) {
        customerMap.set(customer.id, customer.name);
      }
    }
  }

  // Map customer names safely onto invoices
  return rawInvoices.map((inv) => {
    let customerName = "Customer name unavailable";
    if (inv.customer_id && customerMap.has(inv.customer_id)) {
      customerName = customerMap.get(inv.customer_id)!;
    }

    return {
      ...inv,
      customer_name: customerName,
    };
  });
}

function errorInvoices(err: { message: string }): string {
  return err.message;
}

/**
 * Fetches payments for a business, optionally starting from a given date.
 */
export async function fetchPayments(
  businessId: string,
  startDate?: string,
): Promise<RawPayment[]> {
  let query = supabase
    .from("payments")
    .select("id, amount, payment_date")
    .eq("business_id", businessId)
    .order("payment_date", { ascending: true });

  if (startDate) {
    query = query.gte("payment_date", startDate);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch payments: ${error.message}`);
  }

  return (data as RawPayment[]) ?? [];
}

/**
 * Fetches expenses for a business, optionally starting from a given date.
 */
export async function fetchExpenses(
  businessId: string,
  startDate?: string,
): Promise<RawExpense[]> {
  let query = supabase
    .from("expenses")
    .select("id, amount, expense_date")
    .eq("business_id", businessId)
    .order("expense_date", { ascending: true });

  if (startDate) {
    query = query.gte("expense_date", startDate);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch expenses: ${error.message}`);
  }

  return (data as RawExpense[]) ?? [];
}

export interface DashboardRawData {
  invoices: RawInvoice[];
  payments: RawPayment[];
  expenses: RawExpense[];
}

/**
 * Fetches all invoices, payments, and expenses concurrently.
 */
export async function fetchDashboardRawData(
  businessId: string,
  startDate?: string,
): Promise<DashboardRawData> {
  const [invoices, payments, expenses] = await Promise.all([
    fetchInvoices(businessId),
    fetchPayments(businessId, startDate),
    fetchExpenses(businessId, startDate),
  ]);

  return { invoices, payments, expenses };
}
