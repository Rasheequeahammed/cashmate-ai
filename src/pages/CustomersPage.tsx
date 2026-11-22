import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { useBusiness } from "../hooks/useBusiness";
import { supabase } from "../lib/supabase";
import { Navbar } from "../components/Navbar";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { normalizeInternationalPhone } from "../lib/finance/phone";

interface Customer {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export function CustomersPage() {
  const { user, signOut } = useAuth();
  const { business } = useBusiness();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [editingPhoneCustomerId, setEditingPhoneCustomerId] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState("");

  const { data: customers = [], isLoading, isError, error } = useQuery({
    queryKey: ["customers", business?.id],
    queryFn: async (): Promise<Customer[]> => {
      if (!business?.id) return [];
      const { data, error: qErr } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (qErr) throw new Error(qErr.message);
      return data ?? [];
    },
    enabled: Boolean(business?.id),
  });

  const createCustomerMutation = useMutation({
    mutationFn: async () => {
      if (!business?.id) throw new Error("No active business selected.");
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("Customer name is required.");
      const normalizedPhone = normalizeInternationalPhone(phone);
      if (!normalizedPhone) {
        throw new Error("Enter a valid mobile number with country code, such as +91 98765 43210.");
      }

      const { data, error: insertErr } = await supabase
        .from("customers")
        .insert({
          business_id: business.id,
          name: trimmedName,
          email: email.trim() || null,
          phone: normalizedPhone,
          address: address.trim() || null,
        })
        .select()
        .single();

      if (insertErr) throw new Error(insertErr.message);
      return data;
    },
    onSuccess: () => {
      // Invalidate all customer queries everywhere across the app
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });

      setName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setFormError(null);
      setFormSuccess("Customer added successfully!");
      setIsAdding(false);
      setTimeout(() => setFormSuccess(null), 3000);
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const updatePhoneMutation = useMutation({
    mutationFn: async ({ customerId, phoneNumber }: { customerId: string; phoneNumber: string }) => {
      if (!business?.id) throw new Error("No active business selected.");
      const normalizedPhone = normalizeInternationalPhone(phoneNumber);
      if (!normalizedPhone) {
        throw new Error("Enter a valid mobile number with country code, such as +91 98765 43210.");
      }

      const { error: updateError } = await supabase
        .from("customers")
        .update({ phone: normalizedPhone })
        .eq("id", customerId)
        .eq("business_id", business.id);

      if (updateError) throw new Error(updateError.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", business?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setEditingPhoneCustomerId(null);
      setEditingPhone("");
      setFormError(null);
      setFormSuccess("Customer mobile number updated.");
      setTimeout(() => setFormSuccess(null), 3000);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    createCustomerMutation.mutate();
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
                  Customers
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
              Customers
            </h2>
            <p className="text-sm text-slate-500">
              Manage client records to issue invoices and track receivables.
            </p>
          </div>
          <Button
            onClick={() => setIsAdding(!isAdding)}
            className="min-h-[44px] px-4 text-sm font-medium"
          >
            {isAdding ? "Cancel" : "+ Add Customer"}
          </Button>
        </div>

        {formSuccess && (
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
            <AlertDescription>{formSuccess}</AlertDescription>
          </Alert>
        )}

        {/* Add Customer Card Form */}
        {isAdding && (
          <Card className="border-indigo-100 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800">
                Create New Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-name">
                      Customer / Company Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="customer-name"
                      placeholder="e.g. Acme Corp"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-email">Email (Optional)</Label>
                    <Input
                      id="customer-email"
                      type="email"
                      placeholder="billing@acme.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-phone">
                      Mobile number <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="customer-phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                    <p className="text-xs text-slate-500">Include country code for WhatsApp reminders.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-address">Address (Optional)</Label>
                    <Input
                      id="customer-address"
                      placeholder="City, State"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAdding(false)}
                    className="min-h-[44px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCustomerMutation.isPending}
                    className="min-h-[44px]"
                  >
                    {createCustomerMutation.isPending ? "Saving…" : "Save Customer"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {error?.message ?? "Failed to load customers."}
            </AlertDescription>
          </Alert>
        )}

        {/* Customers Listing */}
        {!isLoading && !isError && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-800">
                  All Customers
                </CardTitle>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {customers.length} total
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {customers.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  <p className="font-medium text-slate-700">No customers yet</p>
                  <p className="mt-1 max-w-sm text-xs text-slate-400">
                    Add your first customer above to begin creating invoices and tracking receivables.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          {c.email && <span>{c.email}</span>}
                          {c.phone && <span>{c.phone}</span>}
                          {c.address && <span>{c.address}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {editingPhoneCustomerId === c.id ? (
                          <form
                            className="flex flex-wrap items-center gap-2"
                            onSubmit={(event) => {
                              event.preventDefault();
                              setFormError(null);
                              updatePhoneMutation.mutate({ customerId: c.id, phoneNumber: editingPhone });
                            }}
                          >
                            <Input
                              aria-label={`Mobile number for ${c.name}`}
                              type="tel"
                              autoComplete="tel"
                              placeholder="+91 98765 43210"
                              value={editingPhone}
                              onChange={(event) => setEditingPhone(event.target.value)}
                              required
                              className="w-52"
                            />
                            <Button type="submit" size="sm" disabled={updatePhoneMutation.isPending}>
                              Save
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingPhoneCustomerId(null);
                                setEditingPhone("");
                                setFormError(null);
                              }}
                            >
                              Cancel
                            </Button>
                          </form>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setFormError(null);
                              setEditingPhoneCustomerId(c.id);
                              setEditingPhone(c.phone ?? "");
                            }}
                          >
                            {c.phone ? "Edit mobile" : "Add mobile"}
                          </Button>
                        )}
                        <div className="text-xs text-slate-400">
                          Added {new Date(c.created_at).toLocaleDateString("en-IN")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {formError && !isAdding && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
