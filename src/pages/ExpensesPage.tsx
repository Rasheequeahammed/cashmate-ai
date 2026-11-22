import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { useBusiness } from "../hooks/useBusiness";
import { supabase } from "../lib/supabase";
import { Navbar } from "../components/Navbar";
import { formatINR, parseToPaise } from "../lib/finance/money";
import { todayIST } from "../lib/finance/dateWindows";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Salaries",
  "Utilities",
  "Marketing",
  "Travel",
  "Supplies",
  "Software",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const RECURRING_FREQUENCIES = [
  "weekly",
  "monthly",
  "quarterly",
  "annually",
] as const;

export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

export interface OneTimeExpense {
  id: string;
  business_id: string;
  description: string;
  amount: number;
  expense_date: string;
  category: string;
  expense_type: string;
  notes: string | null;
  created_at: string;
}

export interface RecurringExpense {
  id: string;
  business_id: string;
  description: string;
  amount: number;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  category: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export function ExpensesPage() {
  const { user, signOut } = useAuth();
  const { business } = useBusiness();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filter States
  const [typeFilter, setTypeFilter] = useState<"all" | "one_time" | "recurring">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Notifications
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form Modals
  const [isAddingOneTime, setIsAddingOneTime] = useState(false);
  const [editingOneTime, setEditingOneTime] = useState<OneTimeExpense | null>(null);

  const [isAddingRecurring, setIsAddingRecurring] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null);

  // One-time Form Fields
  const [otDescription, setOtDescription] = useState("");
  const [otAmount, setOtAmount] = useState("");
  const [otDate, setOtDate] = useState(() => todayIST(new Date()));
  const [otCategory, setOtCategory] = useState<ExpenseCategory>("Rent");
  const [otNotes, setOtNotes] = useState("");

  // Recurring Form Fields
  const [recDescription, setRecDescription] = useState("");
  const [recAmount, setRecAmount] = useState("");
  const [recFrequency, setRecFrequency] = useState<RecurringFrequency>("monthly");
  const [recStartDate, setRecStartDate] = useState(() => todayIST(new Date()));
  const [recEndDate, setRecEndDate] = useState("");
  const [recCategory, setRecCategory] = useState<ExpenseCategory>("Rent");
  const [recIsActive, setRecIsActive] = useState(true);
  const [recNotes, setRecNotes] = useState("");

  // 1. Fetch One-Time Expenses (Actual paid expenses)
  const {
    data: oneTimeExpenses = [],
    isLoading: isOtLoading,
    isError: isOtError,
    error: otError,
  } = useQuery<OneTimeExpense[]>({
    queryKey: ["expenses", business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("business_id", business.id)
        .order("expense_date", { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: Boolean(business?.id),
  });

  // 2. Fetch Recurring Expenses (Forecast schedules only)
  const {
    data: recurringExpenses = [],
    isLoading: isRecLoading,
    isError: isRecError,
    error: recError,
  } = useQuery<RecurringExpense[]>({
    queryKey: ["recurring_expenses", business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      const { data, error } = await supabase
        .from("recurring_expenses")
        .select("*")
        .eq("business_id", business.id)
        .order("start_date", { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: Boolean(business?.id),
  });

  function showSuccess(msg: string) {
    setActionSuccess(msg);
    setActionError(null);
    setTimeout(() => setActionSuccess(null), 3500);
  }

  function showError(msg: string) {
    setActionError(msg);
  }

  // ── One-Time Expense Mutations ───────────────────────────────────────────
  const saveOneTimeMutation = useMutation({
    mutationFn: async () => {
      if (!business?.id) throw new Error("No active business selected.");
      const desc = otDescription.trim();
      if (!desc) throw new Error("Description is required.");

      const paise = parseToPaise(otAmount);
      if (paise === null || paise <= 0) {
        throw new Error("Amount must be greater than 0.");
      }
      if (!otDate) throw new Error("Expense date is required.");

      const amountRupees = paise / 100;

      if (editingOneTime) {
        // Update existing expense
        const { error } = await supabase
          .from("expenses")
          .update({
            description: desc,
            amount: amountRupees,
            expense_date: otDate,
            category: otCategory,
            notes: otNotes.trim() || null,
          })
          .eq("id", editingOneTime.id)
          .eq("business_id", business.id);

        if (error) throw new Error(error.message);
      } else {
        // Insert new one-time expense (expense_type is locked to 'one_time')
        const { error } = await supabase.from("expenses").insert({
          business_id: business.id,
          description: desc,
          amount: amountRupees,
          expense_date: otDate,
          category: otCategory,
          expense_type: "one_time",
          notes: otNotes.trim() || null,
        });

        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      // Invalidate both expenses and dashboard queries so cash flow recalculates live
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setIsAddingOneTime(false);
      setEditingOneTime(null);
      resetOneTimeForm();
      showSuccess(
        editingOneTime
          ? "Expense updated successfully!"
          : "Expense recorded successfully! Dashboard metrics updated.",
      );
    },
    onError: (err: Error) => showError(err.message),
  });

  const deleteOneTimeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!business?.id) throw new Error("No active business.");
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id)
        .eq("business_id", business.id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      showSuccess("Expense deleted.");
    },
    onError: (err: Error) => showError(err.message),
  });

  // ── Recurring Expense Schedule Mutations ─────────────────────────────────
  const saveRecurringMutation = useMutation({
    mutationFn: async () => {
      if (!business?.id) throw new Error("No active business selected.");
      const desc = recDescription.trim();
      if (!desc) throw new Error("Description is required.");

      const paise = parseToPaise(recAmount);
      if (paise === null || paise <= 0) {
        throw new Error("Amount must be greater than 0.");
      }
      if (!recStartDate) throw new Error("Start date is required.");
      if (recEndDate && recEndDate < recStartDate) {
        throw new Error("End date cannot be earlier than start date.");
      }

      const amountRupees = paise / 100;

      if (editingRecurring) {
        const { error } = await supabase
          .from("recurring_expenses")
          .update({
            description: desc,
            amount: amountRupees,
            frequency: recFrequency,
            start_date: recStartDate,
            end_date: recEndDate || null,
            category: recCategory,
            is_active: recIsActive,
            notes: recNotes.trim() || null,
          })
          .eq("id", editingRecurring.id)
          .eq("business_id", business.id);

        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("recurring_expenses").insert({
          business_id: business.id,
          description: desc,
          amount: amountRupees,
          frequency: recFrequency,
          start_date: recStartDate,
          end_date: recEndDate || null,
          category: recCategory,
          is_active: recIsActive,
          notes: recNotes.trim() || null,
        });

        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_expenses"] });
      setIsAddingRecurring(false);
      setEditingRecurring(null);
      resetRecurringForm();
      showSuccess(
        editingRecurring
          ? "Recurring schedule updated!"
          : "Recurring schedule created! (Used for future forecast projections).",
      );
    },
    onError: (err: Error) => showError(err.message),
  });

  const deleteRecurringMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!business?.id) throw new Error("No active business.");
      const { error } = await supabase
        .from("recurring_expenses")
        .delete()
        .eq("id", id)
        .eq("business_id", business.id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_expenses"] });
      showSuccess("Recurring schedule deleted.");
    },
    onError: (err: Error) => showError(err.message),
  });

  const toggleRecurringActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (!business?.id) throw new Error("No active business.");
      const { error } = await supabase
        .from("recurring_expenses")
        .update({ is_active })
        .eq("id", id)
        .eq("business_id", business.id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_expenses"] });
      showSuccess("Schedule status updated.");
    },
    onError: (err: Error) => showError(err.message),
  });

  // Helpers to reset / open forms
  function resetOneTimeForm() {
    setOtDescription("");
    setOtAmount("");
    setOtDate(todayIST(new Date()));
    setOtCategory("Rent");
    setOtNotes("");
    setActionError(null);
  }

  function openAddOneTime() {
    resetOneTimeForm();
    setEditingOneTime(null);
    setIsAddingOneTime(true);
    setIsAddingRecurring(false);
  }

  function openEditOneTime(expense: OneTimeExpense) {
    setEditingOneTime(expense);
    setOtDescription(expense.description);
    setOtAmount(expense.amount.toFixed(2));
    setOtDate(expense.expense_date);
    setOtCategory(
      EXPENSE_CATEGORIES.includes(expense.category as ExpenseCategory)
        ? (expense.category as ExpenseCategory)
        : "Other",
    );
    setOtNotes(expense.notes ?? "");
    setIsAddingOneTime(true);
    setIsAddingRecurring(false);
  }

  function resetRecurringForm() {
    setRecDescription("");
    setRecAmount("");
    setRecFrequency("monthly");
    setRecStartDate(todayIST(new Date()));
    setRecEndDate("");
    setRecCategory("Rent");
    setRecIsActive(true);
    setRecNotes("");
    setActionError(null);
  }

  function openAddRecurring() {
    resetRecurringForm();
    setEditingRecurring(null);
    setIsAddingRecurring(true);
    setIsAddingOneTime(false);
  }

  function openEditRecurring(item: RecurringExpense) {
    setEditingRecurring(item);
    setRecDescription(item.description);
    setRecAmount(item.amount.toFixed(2));
    setRecFrequency(item.frequency);
    setRecStartDate(item.start_date);
    setRecEndDate(item.end_date ?? "");
    setRecCategory(
      EXPENSE_CATEGORIES.includes(item.category as ExpenseCategory)
        ? (item.category as ExpenseCategory)
        : "Other",
    );
    setRecIsActive(item.is_active);
    setRecNotes(item.notes ?? "");
    setIsAddingRecurring(true);
    setIsAddingOneTime(false);
  }

  // Pre-fill a one-time actual expense when paying a recurring schedule (PRD §5.7 FR-EXP-04)
  function recordRecurringAsPaid(schedule: RecurringExpense) {
    resetOneTimeForm();
    setEditingOneTime(null);
    setOtDescription(`${schedule.description} (${schedule.frequency} payment)`);
    setOtAmount(schedule.amount.toFixed(2));
    setOtDate(todayIST(new Date()));
    setOtCategory(
      EXPENSE_CATEGORIES.includes(schedule.category as ExpenseCategory)
        ? (schedule.category as ExpenseCategory)
        : "Other",
    );
    setOtNotes(`Paid from recurring schedule: ${schedule.description}`);
    setIsAddingOneTime(true);
    setIsAddingRecurring(false);
  }

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  // Filtered views
  const filteredOneTime = useMemo(() => {
    return oneTimeExpenses.filter((e) => {
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
      return true;
    });
  }, [oneTimeExpenses, categoryFilter]);

  const filteredRecurring = useMemo(() => {
    return recurringExpenses.filter((e) => {
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
      return true;
    });
  }, [recurringExpenses, categoryFilter]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Top Header Bar ─────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  CASHMATE AI
                </span>
                <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  Expenses
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

      {/* ── Main Content Area ──────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Expense Management
            </h2>
            <p className="text-sm text-slate-500">
              Record actual paid expenses and manage recurring schedules for forecasting.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={openAddOneTime}
              className="min-h-[44px] px-4 text-sm font-medium"
            >
              + Record Expense
            </Button>
            <Button
              variant="outline"
              onClick={openAddRecurring}
              className="min-h-[44px] px-4 text-sm font-medium"
            >
              + Recurring Schedule
            </Button>
          </div>
        </div>

        {actionSuccess && (
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
            <AlertDescription>{actionSuccess}</AlertDescription>
          </Alert>
        )}

        {actionError && (
          <Alert variant="destructive">
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        {/* ── Form: One-time Expense Modal/Card ───────────────────────────── */}
        {isAddingOneTime && (
          <Card className="border-indigo-100 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800">
                {editingOneTime ? "Edit One-Time Expense" : "Record One-Time Expense"}
              </CardTitle>
              <p className="text-xs text-slate-500">
                Actual money paid out. Updates current month expenses and net cash movement.
              </p>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveOneTimeMutation.mutate();
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="ot-desc">
                      Description <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="ot-desc"
                      placeholder="e.g. Office Rent, Cloud Server Subscription"
                      value={otDescription}
                      onChange={(e) => setOtDescription(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ot-amount">
                      Amount (₹) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="ot-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="e.g. 5000.00"
                      value={otAmount}
                      onChange={(e) => setOtAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ot-date">
                      Expense Date <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="ot-date"
                      type="date"
                      value={otDate}
                      onChange={(e) => setOtDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ot-cat">
                      Category <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      id="ot-cat"
                      value={otCategory}
                      onChange={(e) => setOtCategory(e.target.value as ExpenseCategory)}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-3">
                    <Label htmlFor="ot-notes">Notes (Optional)</Label>
                    <Input
                      id="ot-notes"
                      placeholder="Vendor name, receipt link, or payment details"
                      value={otNotes}
                      onChange={(e) => setOtNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddingOneTime(false);
                      setEditingOneTime(null);
                    }}
                    className="min-h-[44px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saveOneTimeMutation.isPending}
                    className="min-h-[44px]"
                  >
                    {saveOneTimeMutation.isPending
                      ? "Saving…"
                      : editingOneTime
                        ? "Update Expense"
                        : "Save Expense"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Form: Recurring Expense Schedule Modal/Card ────────────────── */}
        {isAddingRecurring && (
          <Card className="border-indigo-100 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800">
                {editingRecurring
                  ? "Edit Recurring Expense Schedule"
                  : "New Recurring Expense Schedule"}
              </CardTitle>
              <p className="text-xs text-slate-500">
                Forecast schedule definitions only. Used exclusively to project future outflows.
                Does not modify actual expenses until manually recorded.
              </p>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveRecurringMutation.mutate();
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="rec-desc">
                      Description <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="rec-desc"
                      placeholder="e.g. Monthly Office Lease, Software Licenses"
                      value={recDescription}
                      onChange={(e) => setRecDescription(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="rec-amount">
                      Recurring Amount (₹) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="rec-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="e.g. 15000.00"
                      value={recAmount}
                      onChange={(e) => setRecAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="rec-freq">
                      Frequency <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      id="rec-freq"
                      value={recFrequency}
                      onChange={(e) => setRecFrequency(e.target.value as RecurringFrequency)}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 capitalize"
                    >
                      {RECURRING_FREQUENCIES.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="rec-start">
                      Start Date <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="rec-start"
                      type="date"
                      value={recStartDate}
                      onChange={(e) => setRecStartDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="rec-end">End Date (Optional)</Label>
                    <Input
                      id="rec-end"
                      type="date"
                      value={recEndDate}
                      onChange={(e) => setRecEndDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="rec-cat">Category</Label>
                    <select
                      id="rec-cat"
                      value={recCategory}
                      onChange={(e) => setRecCategory(e.target.value as ExpenseCategory)}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="rec-active"
                      checked={recIsActive}
                      onChange={(e) => setRecIsActive(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Label htmlFor="rec-active" className="cursor-pointer font-medium">
                      Active for forecast projections
                    </Label>
                  </div>

                  <div className="space-y-1.5 sm:col-span-4">
                    <Label htmlFor="rec-notes">Notes (Optional)</Label>
                    <Input
                      id="rec-notes"
                      placeholder="Contract terms or billing schedule details"
                      value={recNotes}
                      onChange={(e) => setRecNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddingRecurring(false);
                      setEditingRecurring(null);
                    }}
                    className="min-h-[44px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saveRecurringMutation.isPending}
                    className="min-h-[44px]"
                  >
                    {saveRecurringMutation.isPending
                      ? "Saving…"
                      : editingRecurring
                        ? "Update Schedule"
                        : "Save Schedule"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Filter Bar ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Type:
            </span>
            <Button
              variant={typeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("all")}
              className="min-h-[36px]"
            >
              All Types ({oneTimeExpenses.length + recurringExpenses.length})
            </Button>
            <Button
              variant={typeFilter === "one_time" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("one_time")}
              className="min-h-[36px]"
            >
              One-Time Actuals ({oneTimeExpenses.length})
            </Button>
            <Button
              variant={typeFilter === "recurring" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("recurring")}
              className="min-h-[36px]"
            >
              Recurring Schedules ({recurringExpenses.length})
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Category:
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex h-9 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
            >
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Loading and Error States ───────────────────────────────────── */}
        {(isOtLoading || isRecLoading) && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        )}

        {(isOtError || isRecError) && (
          <Alert variant="destructive">
            <AlertDescription>
              {otError?.message || recError?.message || "Failed to load expenses."}
            </AlertDescription>
          </Alert>
        )}

        {/* ── Actual Paid Expenses Section ──────────────────────────────── */}
        {(typeFilter === "all" || typeFilter === "one_time") && !isOtLoading && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-slate-800">
                    Actual Paid Expenses
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    One-time paid transactions affecting current cash flow and historical actuals.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {filteredOneTime.length} records
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {filteredOneTime.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
                  <p>No one-time expenses recorded matching this filter.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredOneTime.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {item.description}
                          </span>
                          <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {item.category}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 text-xs text-slate-500">
                          <span>Paid: {item.expense_date}</span>
                          {item.notes && <span>Note: {item.notes}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-semibold text-slate-900">
                            {formatINR(Math.round(item.amount * 100))}
                          </div>
                          <div className="text-[11px] text-slate-400">One-time</div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditOneTime(item)}
                            className="min-h-[36px] text-xs text-slate-600 hover:text-slate-900"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Delete expense "${item.description}"?`)) {
                                deleteOneTimeMutation.mutate(item.id);
                              }
                            }}
                            className="min-h-[36px] text-xs text-rose-600 hover:text-rose-700"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Recurring Forecast Schedules Section ──────────────────────── */}
        {(typeFilter === "all" || typeFilter === "recurring") && !isRecLoading && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-slate-800">
                    Recurring Expense Schedules
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Forecast definitions projecting future outflows. Not counted in actuals until paid.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {filteredRecurring.length} schedules
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRecurring.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
                  <p>No recurring expense schedules recorded matching this filter.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredRecurring.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {item.description}
                          </span>
                          <span className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 capitalize">
                            {item.frequency}
                          </span>
                          <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {item.category}
                          </span>
                          {!item.is_active && (
                            <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 text-xs text-slate-500">
                          <span>Starts: {item.start_date}</span>
                          {item.end_date && <span>Ends: {item.end_date}</span>}
                          {item.notes && <span>Note: {item.notes}</span>}
                        </div>
                      </div>

                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <div className="text-left sm:text-right">
                          <div className="font-semibold text-slate-900">
                            {formatINR(Math.round(item.amount * 100))}
                            <span className="text-xs font-normal text-slate-500">
                              {" "}
                              / {item.frequency}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => recordRecurringAsPaid(item)}
                            className="min-h-[36px] text-xs font-medium text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                          >
                            Record as Paid
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              toggleRecurringActiveMutation.mutate({
                                id: item.id,
                                is_active: !item.is_active,
                              })
                            }
                            className="min-h-[36px] text-xs text-slate-600 hover:text-slate-900"
                          >
                            {item.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditRecurring(item)}
                            className="min-h-[36px] text-xs text-slate-600 hover:text-slate-900"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Delete recurring schedule "${item.description}"?`)) {
                                deleteRecurringMutation.mutate(item.id);
                              }
                            }}
                            className="min-h-[36px] text-xs text-rose-600 hover:text-rose-700"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
