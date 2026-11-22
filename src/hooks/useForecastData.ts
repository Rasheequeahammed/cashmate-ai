import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toPaise } from '../lib/dashboard/mappers';
import type { ForecastInvoice, ForecastRecurringSchedule } from '../lib/finance/forecast';

const PAGE_SIZE = 1000;

/**
 * Fetches all invoices for the authenticated business using pagination (.range())
 * to guarantee no invoices are truncated by PostgREST row limits.
 * Converts rupee amounts to integer paise exactly once at the data boundary.
 */
async function fetchAllInvoices(businessId: string): Promise<ForecastInvoice[]> {
  let allRows: Array<{
    id: string;
    customer_id: string | null;
    invoice_number: string | null;
    status: string | null;
    issue_date: string | null;
    due_date: string | null;
    total_amount: number | string | null;
    amount_paid: number | string | null;
    outstanding_balance: number | string | null;
  }> = [];

  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('invoices')
      .select(
        'id, customer_id, invoice_number, status, issue_date, due_date, total_amount, amount_paid, outstanding_balance',
      )
      .eq('business_id', businessId)
      .order('due_date', { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch invoices: ${error.message}`);
    }

    const batch = data ?? [];
    allRows = allRows.concat(batch);
    if (batch.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      from += PAGE_SIZE;
    }
  }

  // Resolve customer names in batch if there are customer_ids
  const customerIds = Array.from(
    new Set(
      allRows
        .map((inv) => inv.customer_id)
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0),
    ),
  );

  const customerMap = new Map<string, string>();
  if (customerIds.length > 0) {
    const { data: custData, error: custError } = await supabase
      .from('customers')
      .select('id, name')
      .eq('business_id', businessId)
      .in('id', customerIds);

    if (!custError && custData) {
      for (const c of custData) {
        if (c.id && c.name) {
          customerMap.set(c.id, c.name);
        }
      }
    }
  }

  // Map to strongly-typed ForecastInvoice with integer paise
  return allRows.map((row) => ({
    id: row.id,
    invoice_number: row.invoice_number ?? '',
    customer_name: (row.customer_id ? customerMap.get(row.customer_id) : null) ?? 'Customer name unavailable',
    status: row.status ?? 'draft',
    issue_date: row.issue_date ?? '',
    due_date: row.due_date ?? '',
    total_paise: toPaise(row.total_amount),
    amount_paid_paise: toPaise(row.amount_paid),
    outstanding_paise: toPaise(row.outstanding_balance),
  }));
}

/**
 * Fetches all recurring expense schedules using pagination (.range()).
 * Converts recurring amount to integer paise exactly once at the data boundary.
 */
async function fetchAllRecurringExpenses(
  businessId: string,
): Promise<ForecastRecurringSchedule[]> {
  let allRows: Array<{
    id: string;
    description: string | null;
    category: string | null;
    frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
    start_date: string | null;
    end_date: string | null;
    amount: number | string | null;
    is_active: boolean | null;
  }> = [];

  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('recurring_expenses')
      .select(
        'id, description, category, frequency, start_date, end_date, amount, is_active',
      )
      .eq('business_id', businessId)
      .order('start_date', { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch recurring expenses: ${error.message}`);
    }

    const batch = (data as typeof allRows) ?? [];
    allRows = allRows.concat(batch);
    if (batch.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      from += PAGE_SIZE;
    }
  }

  return allRows.map((row) => ({
    id: row.id,
    description: row.description ?? '',
    category: row.category ?? 'Other',
    frequency: row.frequency,
    start_date: row.start_date ?? '',
    end_date: row.end_date ?? null,
    amount_paise: toPaise(row.amount),
    is_active: Boolean(row.is_active),
  }));
}

export interface ForecastRawData {
  invoices: ForecastInvoice[];
  recurringExpenses: ForecastRecurringSchedule[];
}

export const forecastQueryKeys = {
  all: ['forecast'] as const,
  business: (businessId: string | undefined) => ['forecast', businessId] as const,
};

export function useForecastData(businessId: string | undefined) {
  return useQuery<ForecastRawData, Error>({
    queryKey: forecastQueryKeys.business(businessId),
    queryFn: async () => {
      if (!businessId) {
        throw new Error('No business ID provided for forecast query');
      }

      const [invoices, recurringExpenses] = await Promise.all([
        fetchAllInvoices(businessId),
        fetchAllRecurringExpenses(businessId),
      ]);

      return { invoices, recurringExpenses };
    },
    enabled: Boolean(businessId),
  });
}
