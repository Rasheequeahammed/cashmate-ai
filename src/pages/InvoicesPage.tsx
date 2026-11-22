import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { useBusiness } from "../hooks/useBusiness";
import { supabase } from "../lib/supabase";
import { fetchCustomers, type CustomerSummary } from "../lib/dashboard/fetchers";
import { Navbar } from "../components/Navbar";
import { formatINR, parseToPaise } from "../lib/finance/money";
import { todayIST } from "../lib/finance/dateWindows";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { PaymentReminderModal, type ReminderInvoiceData } from "../components/reminders/PaymentReminderModal";
import { MessageSquare } from "lucide-react";
import { cn } from "../lib/utils";

interface InvoiceRecord {
  id: string;
  business_id: string;
  customer_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: "draft" | "sent" | "partially_paid" | "paid" | "overdue";
  subtotal: number;
  total_amount: number;
  amount_paid: number;
  outstanding_balance: number;
  notes: string | null;
  created_at: string;
  customer_name?: string;
}

interface LineItemInput {
  description: string;
  quantity: number;
  unit_price: string;
}

export function InvoicesPage() {
  const { user, signOut } = useAuth();
  const { business } = useBusiness();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Create Invoice state
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(() => todayIST(new Date()));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return todayIST(d);
  });
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    { description: "", quantity: 1, unit_price: "" },
  ]);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceSuccess, setInvoiceSuccess] = useState<string | null>(null);

  // Payment Modal state
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => todayIST(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer" | "upi" | "other">("upi");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  // Reminder Modal state
  const [selectedReminderInvoice, setSelectedReminderInvoice] = useState<ReminderInvoiceData | null>(null);

  // 1. Fetch Customers using shared fetcher and unified queryKey
  const {
    data: customers = [],
    isLoading: isCustomersLoading,
    isError: isCustomersError,
    error: customersError,
    refetch: refetchCustomers,
  } = useQuery<CustomerSummary[]>({
    queryKey: ["customers", business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      return fetchCustomers(business.id);
    },
    enabled: Boolean(business?.id),
    staleTime: 0, // Always ensure fresh customer list
  });

  // Automatically select the first customer when list loads or changes
  useEffect(() => {
    if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  // 2. Fetch Invoices with customer name mapping
  const { data: invoices = [], isLoading, isError, error } = useQuery<InvoiceRecord[]>({
    queryKey: ["invoices", business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      const { data: invData, error: invErr } = await supabase
        .from("invoices")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (invErr) throw new Error(invErr.message);

      const rawInvoices = invData ?? [];
      const customerIds = Array.from(
        new Set(rawInvoices.map((i) => i.customer_id).filter(Boolean)),
      );

      const customerMap = new Map<string, string>();
      if (customerIds.length > 0) {
        const { data: custData } = await supabase
          .from("customers")
          .select("id, name")
          .eq("business_id", business.id)
          .in("id", customerIds);

        for (const c of custData ?? []) {
          customerMap.set(c.id, c.name);
        }
      }

      return rawInvoices.map((inv) => ({
        ...inv,
        customer_name: customerMap.get(inv.customer_id) ?? "Customer name unavailable",
      }));
    },
    enabled: Boolean(business?.id),
  });

  // Calculate invoice subtotal and total using integer paise
  const { subtotalPaise, totalPaise } = useMemo(() => {
    let subtotal = 0;
    for (const item of lineItems) {
      const q = Math.max(0, Number(item.quantity) || 0);
      const unitPaise = parseToPaise(item.unit_price) ?? 0;
      subtotal += Math.round(q * unitPaise);
    }
    return { subtotalPaise: subtotal, totalPaise: subtotal };
  }, [lineItems]);

  // Open the create invoice form and refresh customer list
  function openCreateForm() {
    void refetchCustomers();
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const nextNum = String(invoices.length + 1).padStart(3, "0");
    setInvoiceNumber(`INV-${yyyymm}-${nextNum}`);
    if (customers.length > 0) {
      setSelectedCustomerId(customers[0].id);
    }
    setIsCreating(true);
  }

  function handleLineItemChange(index: number, field: keyof LineItemInput, value: string | number) {
    setLineItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, { description: "", quantity: 1, unit_price: "" }]);
  }

  function removeLineItem(index: number) {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  // 3. Create Invoice Mutation (Draft -> Items -> Issued/Sent)
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!business?.id) throw new Error("No active business selected.");
      if (!selectedCustomerId) throw new Error("Please select a customer.");
      if (!invoiceNumber.trim()) throw new Error("Invoice number is required.");
      if (!issueDate) throw new Error("Issue date is required.");
      if (!dueDate) throw new Error("Due date is required.");
      if (dueDate < issueDate) throw new Error("Due date cannot be earlier than issue date.");

      // Validate line items
      const validItems = lineItems.map((item) => {
        const desc = item.description.trim();
        if (!desc) throw new Error("Line item description cannot be blank.");
        const q = Number(item.quantity);
        if (!q || q <= 0) throw new Error("Line item quantity must be greater than 0.");
        const uPaise = parseToPaise(item.unit_price);
        if (uPaise === null || uPaise < 0) throw new Error("Valid line item unit price is required.");
        return {
          description: desc,
          quantity: q,
          unit_price: uPaise / 100,
          line_total: Math.round(q * uPaise) / 100,
        };
      });

      if (validItems.length === 0) throw new Error("At least one line item is required.");

      // Step A: Insert into public.invoices (MUST be draft status per trigger maintain_invoice_state)
      const { data: invResult, error: invInsertError } = await supabase
        .from("invoices")
        .insert({
          business_id: business.id,
          customer_id: selectedCustomerId,
          invoice_number: invoiceNumber.trim(),
          issue_date: issueDate,
          due_date: dueDate,
          status: "draft",
          subtotal: subtotalPaise / 100,
          total_amount: totalPaise / 100,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (invInsertError) throw new Error(invInsertError.message);
      const newInvoiceId = invResult.id;

      try {
        // Step B: Insert into public.invoice_items while invoice is draft
        const itemsToInsert = validItems.map((item, idx) => ({
          invoice_id: newInvoiceId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
          sort_order: idx,
        }));

        const { error: itemsInsertError } = await supabase
          .from("invoice_items")
          .insert(itemsToInsert);

        if (itemsInsertError) throw new Error(itemsInsertError.message);

        // Step C: Issue the invoice: transition draft -> sent so it's eligible for payments
        const { error: issueError } = await supabase
          .from("invoices")
          .update({ status: "sent" })
          .eq("id", newInvoiceId);

        if (issueError) throw new Error(issueError.message);
      } catch (err) {
        // Clean up draft invoice if item insertion or issue fails
        await supabase.from("invoices").delete().eq("id", newInvoiceId);
        throw err;
      }

      return invResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setIsCreating(false);
      setLineItems([{ description: "", quantity: 1, unit_price: "" }]);
      setNotes("");
      setInvoiceError(null);
      setInvoiceSuccess("Invoice created and issued successfully!");
      setTimeout(() => setInvoiceSuccess(null), 3000);
    },
    onError: (err: Error) => {
      setInvoiceError(err.message);
    },
  });

  // 4. Issue Draft Invoice Mutation (for any draft invoice)
  const issueDraftMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error: issueErr } = await supabase
        .from("invoices")
        .update({ status: "sent" })
        .eq("id", invoiceId);
      if (issueErr) throw new Error(issueErr.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setInvoiceSuccess("Draft invoice issued successfully!");
      setTimeout(() => setInvoiceSuccess(null), 3000);
    },
    onError: (err: Error) => {
      setInvoiceError(err.message);
    },
  });

  // 5. Record Payment Mutation via RPC
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!business?.id || !paymentInvoice) {
        throw new Error("Missing business or invoice context.");
      }

      const pPaise = parseToPaise(paymentAmount);
      if (pPaise === null || pPaise <= 0) {
        throw new Error("Payment amount must be greater than zero.");
      }

      const outstandingPaise = Math.round(paymentInvoice.outstanding_balance * 100);
      if (pPaise > outstandingPaise) {
        throw new Error(
          `Payment amount cannot exceed outstanding balance (${formatINR(outstandingPaise)})`,
        );
      }

      const amountRupees = pPaise / 100;

      // Invoke the authoritative record_payment RPC
      const { data, error: rpcError } = await supabase.rpc("record_payment", {
        p_invoice_id: paymentInvoice.id,
        p_business_id: business.id,
        p_amount: amountRupees,
        p_date: paymentDate,
        p_method: paymentMethod,
        p_notes: paymentNotes.trim() || null,
      });

      if (rpcError) {
        // Map server-side RPC error codes to friendly messages
        if (rpcError.message.includes("payment_amount_invalid")) {
          throw new Error("Amount must be greater than 0");
        }
        if (rpcError.message.includes("payment_exceeds_balance")) {
          throw new Error("Amount exceeds outstanding balance");
        }
        if (rpcError.message.includes("payment_invoice_draft")) {
          throw new Error("Cannot record payment against a draft invoice. Issue it first.");
        }
        throw new Error(rpcError.message);
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate relevant query caches to immediately refresh the dashboard & invoices
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setPaymentInvoice(null);
      setPaymentAmount("");
      setPaymentNotes("");
      setPaymentError(null);
      setPaymentSuccess("Payment recorded successfully! Dashboard metrics updated.");
      setTimeout(() => setPaymentSuccess(null), 4000);
    },
    onError: (err: Error) => {
      setPaymentError(err.message);
    },
  });

  function openPaymentModal(invoice: InvoiceRecord) {
    setPaymentInvoice(invoice);
    setPaymentAmount(invoice.outstanding_balance.toFixed(2));
    setPaymentDate(todayIST(new Date()));
    setPaymentMethod("upi");
    setPaymentNotes("");
    setPaymentError(null);
  }

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  CASHMATE AI
                </span>
                <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  Invoices
                </span>
              </div>
              {business && (
                <h1 className="mt-1 text-sm font-medium text-slate-600 sm:text-base">
                  {business.name}
                </h1>
              )}
            </div>
            <Navbar />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-600">{user?.email ?? ""}</span>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="min-h-[44px] min-w-[44px] px-4 text-sm font-medium"
            >
              Log out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Invoices
            </h2>
            <p className="text-sm text-slate-500">
              Create invoices, manage balances, and record payments.
            </p>
          </div>
          <Button
            onClick={() => (isCreating ? setIsCreating(false) : openCreateForm())}
            className="min-h-[44px] px-4 text-sm font-medium"
          >
            {isCreating ? "Cancel" : "+ Create Invoice"}
          </Button>
        </div>

        {invoiceSuccess && (
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
            <AlertDescription>{invoiceSuccess}</AlertDescription>
          </Alert>
        )}
        {paymentSuccess && (
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
            <AlertDescription>{paymentSuccess}</AlertDescription>
          </Alert>
        )}

        {/* ── Create Invoice Form Card ────────────────────────────────────── */}
        {isCreating && (
          <Card className="border-indigo-100 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800">
                New Invoice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createInvoiceMutation.mutate();
                }}
                className="space-y-6"
              >
                {invoiceError && (
                  <Alert variant="destructive">
                    <AlertDescription>{invoiceError}</AlertDescription>
                  </Alert>
                )}

                {/* Customer, Invoice #, Dates */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-customer">
                      Customer <span className="text-rose-500">*</span>
                    </Label>
                    {isCustomersLoading ? (
                      <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-500">
                        <span className="inline-block animate-pulse">Loading customers…</span>
                      </div>
                    ) : isCustomersError ? (
                      <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-600">
                        <span>Failed to load customers: {customersError?.message ?? "Unknown error"}. </span>
                        <button
                          type="button"
                          onClick={() => void refetchCustomers()}
                          className="font-medium underline hover:text-red-800"
                        >
                          Retry
                        </button>
                      </div>
                    ) : customers.length === 0 ? (
                      <div className="space-y-1">
                        <p className="text-xs text-rose-500">
                          No customers found. Please add a customer first.
                        </p>
                        <button
                          type="button"
                          onClick={() => void refetchCustomers()}
                          className="text-xs text-indigo-600 underline hover:text-indigo-800"
                        >
                          Check again (Refresh)
                        </button>
                      </div>
                    ) : (
                      <select
                        id="inv-customer"
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        required
                      >
                        <option value="">Select customer...</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inv-number">
                      Invoice Number <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="inv-number"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inv-issue-date">Issue Date</Label>
                    <Input
                      id="inv-issue-date"
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inv-due-date">Due Date</Label>
                    <Input
                      id="inv-due-date"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-slate-800">
                      Line Items
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLineItem}
                      className="min-h-[36px]"
                    >
                      + Add Item
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {lineItems.map((item, index) => {
                      const q = Number(item.quantity) || 0;
                      const uPaise = parseToPaise(item.unit_price) ?? 0;
                      const linePaise = Math.round(q * uPaise);

                      return (
                        <div
                          key={index}
                          className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center"
                        >
                          <div className="flex-1 space-y-1">
                            <span className="text-[11px] font-medium text-slate-500">
                              Description
                            </span>
                            <Input
                              placeholder="e.g. Web Development Services"
                              value={item.description}
                              onChange={(e) =>
                                handleLineItemChange(index, "description", e.target.value)
                              }
                              required
                            />
                          </div>
                          <div className="w-full sm:w-24 space-y-1">
                            <span className="text-[11px] font-medium text-slate-500">
                              Qty
                            </span>
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleLineItemChange(index, "quantity", Number(e.target.value))
                              }
                              required
                            />
                          </div>
                          <div className="w-full sm:w-36 space-y-1">
                            <span className="text-[11px] font-medium text-slate-500">
                              Unit Price (₹)
                            </span>
                            <Input
                              placeholder="e.g. 500.00"
                              value={item.unit_price}
                              onChange={(e) =>
                                handleLineItemChange(index, "unit_price", e.target.value)
                              }
                              required
                            />
                          </div>
                          <div className="flex items-center justify-between pt-1 sm:w-32 sm:justify-end sm:pt-4">
                            <span className="text-sm font-semibold text-slate-800">
                              {formatINR(linePaise)}
                            </span>
                            {lineItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeLineItem(index)}
                                className="ml-3 min-h-[36px] text-xs font-medium text-rose-500 hover:text-rose-700"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-2 text-right">
                    <div>
                      <div className="text-xs text-slate-500">Total Invoice Amount</div>
                      <div className="text-xl font-bold text-slate-900">
                        {formatINR(totalPaise)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="inv-notes">Notes / Terms (Optional)</Label>
                  <Input
                    id="inv-notes"
                    placeholder="Payment terms, bank details, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreating(false)}
                    className="min-h-[44px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createInvoiceMutation.isPending ||
                      isCustomersLoading ||
                      customers.length === 0 ||
                      !selectedCustomerId
                    }
                    className="min-h-[44px]"
                  >
                    {createInvoiceMutation.isPending ? "Creating…" : "Create & Issue Invoice"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Record Payment Modal / Overlay ───────────────────────────────── */}
        {paymentInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-lg bg-white shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-slate-900">
                  Record Payment
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Applying payment against invoice{" "}
                  <span className="font-semibold">{paymentInvoice.invoice_number}</span> (
                  {paymentInvoice.customer_name})
                </p>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    recordPaymentMutation.mutate();
                  }}
                  className="space-y-4"
                >
                  {paymentError && (
                    <Alert variant="destructive">
                      <AlertDescription>{paymentError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="rounded-lg bg-slate-50 p-3 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Amount:</span>
                      <span className="font-medium">
                        {formatINR(Math.round(paymentInvoice.total_amount * 100))}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Already Paid:</span>
                      <span className="font-medium">
                        {formatINR(Math.round(paymentInvoice.amount_paid * 100))}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-900">
                      <span>Outstanding Balance:</span>
                      <span className="text-rose-600">
                        {formatINR(Math.round(paymentInvoice.outstanding_balance * 100))}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pay-amount">
                      Payment Amount (₹) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="pay-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={paymentInvoice.outstanding_balance}
                      placeholder="e.g. 1000.00"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="pay-date">Payment Date</Label>
                      <Input
                        id="pay-date"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pay-method">Payment Method</Label>
                      <select
                        id="pay-method"
                        value={paymentMethod}
                        onChange={(e) =>
                          setPaymentMethod(
                            e.target.value as "cash" | "bank_transfer" | "upi" | "other",
                          )
                        }
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      >
                        <option value="upi">UPI</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cash">Cash</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pay-notes">Notes / Reference (Optional)</Label>
                    <Input
                      id="pay-notes"
                      placeholder="Transaction reference, cheque #, etc."
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPaymentInvoice(null)}
                      className="min-h-[44px]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={recordPaymentMutation.isPending}
                      className="min-h-[44px]"
                    >
                      {recordPaymentMutation.isPending ? "Recording…" : "Confirm Payment"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {error?.message ?? "Failed to load invoices."}
            </AlertDescription>
          </Alert>
        )}

        {/* Invoices Listing */}
        {!isLoading && !isError && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-800">
                  All Invoices
                </CardTitle>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {invoices.length} total
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  <p className="font-medium text-slate-700">No invoices yet</p>
                  <p className="mt-1 max-w-sm text-xs text-slate-400">
                    Create an invoice above to issue bills to customers and record payments.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {invoices.map((inv) => {
                    const statusBadgeStyles = {
                      draft: "bg-slate-100 text-slate-700 border-slate-200",
                      sent: "bg-blue-50 text-blue-700 border-blue-200",
                      partially_paid: "bg-amber-50 text-amber-700 border-amber-200",
                      paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
                      overdue: "bg-rose-50 text-rose-700 border-rose-200",
                    }[inv.status];

                    const canRecordPayment =
                      inv.status !== "draft" && inv.outstanding_balance > 0;

                    return (
                      <div
                        key={inv.id}
                        className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {inv.invoice_number}
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize",
                                statusBadgeStyles,
                              )}
                            >
                              {inv.status.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-700">
                            {inv.customer_name}
                          </p>
                          <div className="flex flex-wrap gap-x-4 text-xs text-slate-400">
                            <span>Issued: {inv.issue_date}</span>
                            <span>Due: {inv.due_date}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-start gap-2 sm:items-end">
                          <div className="text-left sm:text-right">
                            <div className="font-semibold text-slate-900">
                              Total: {formatINR(Math.round(inv.total_amount * 100))}
                            </div>
                            {inv.amount_paid > 0 && (
                              <div className="text-xs text-emerald-600">
                                Paid: {formatINR(Math.round(inv.amount_paid * 100))}
                              </div>
                            )}
                            {inv.outstanding_balance > 0 && (
                              <div className="text-xs font-medium text-rose-600">
                                Balance: {formatINR(Math.round(inv.outstanding_balance * 100))}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {inv.status === "draft" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => issueDraftMutation.mutate(inv.id)}
                                disabled={issueDraftMutation.isPending}
                                className="min-h-[36px]"
                              >
                                Issue Invoice
                              </Button>
                            )}

                            {canRecordPayment && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setSelectedReminderInvoice({
                                      invoiceId: inv.id,
                                      invoiceNumber: inv.invoice_number,
                                      customerName: inv.customer_name,
                                      outstandingPaise: Math.round(inv.outstanding_balance * 100),
                                      dueDate: inv.due_date,
                                      businessName: business?.name,
                                    })
                                  }
                                  className="min-h-[36px] border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                >
                                  <MessageSquare className="h-3.5 w-3.5 mr-1" />
                                  Reminder
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => openPaymentModal(inv)}
                                  className="min-h-[36px] bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  Record Payment
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {/* Payment Reminder Generator Modal */}
        <PaymentReminderModal
          invoice={selectedReminderInvoice}
          onClose={() => setSelectedReminderInvoice(null)}
        />
      </main>
    </div>
  );
}
