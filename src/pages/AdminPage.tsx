import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Download,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Business } from "../contexts/BusinessContext";
import { useAdminAccess } from "../hooks/useAdminAccess";
import { useAuth } from "../hooks/useAuth";
import { BUSINESS_TYPES } from "../lib/businessTypes";
import { supabase } from "../lib/supabase";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";

const BUSINESS_COLUMNS = "id, user_id, name, type, owner_name, phone, logo_url, created_at";
type AdminBusiness = Business & { created_at: string };

export function AdminPage() {
  const access = useAdminAccess();
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("businesses")
      .select(BUSINESS_COLUMNS)
      .order("created_at", { ascending: false });

    if (queryError) {
      setError("Could not load business profiles. Confirm the admin migration has been applied.");
      setLoading(false);
      return;
    }

    setBusinesses((data ?? []) as AdminBusiness[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (access === "admin") void loadBusinesses();
  }, [access, loadBusinesses]);

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredBusinesses = businesses.filter((business) => {
    const matchesSearch = !normalizedSearch ||
      [business.name, business.owner_name, business.phone ?? ""]
        .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
    const matchesType = typeFilter === "all" || business.type === typeFilter;
    return matchesSearch && matchesType;
  });
  const recentCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentBusinesses = businesses.filter(
    (business) => new Date(business.created_at).getTime() >= recentCutoff,
  ).length;
  const businessTypeCount = new Set(businesses.map((business) => business.type)).size;

  function exportCsv() {
    const rows = [
      ["Business", "Owner", "Type", "Phone", "Created"],
      ...filteredBusinesses.map((business) => [
        business.name,
        business.owner_name,
        business.type,
        business.phone ?? "",
        new Date(business.created_at).toISOString(),
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cashmate-businesses.csv";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (access === "loading") {
    return <AdminState message="Checking administrator access…" />;
  }

  if (access === "not-admin") {
    return <AdminState title="Administrator access required" message="This account is not assigned an administrator role." />;
  }

  if (access === "error") {
    return <AdminState title="Could not verify administrator access" message="Apply the admin migration and check your Supabase connection, then try again." />;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/dashboard" className="mb-3 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950">
              <ArrowLeft size={16} /> Back to app
            </Link>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-900 p-2 text-white"><ShieldCheck size={22} /></div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-950">Administration</h1>
                <p className="text-sm text-slate-600">Signed in as {user?.email}</p>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => void loadBusinesses()} disabled={loading}>
            <RefreshCw size={16} /> Refresh
          </Button>
        </div>

        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

        <section aria-label="Platform overview" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard title="Business profiles" value={businesses.length} hint="All registered businesses" icon={<Building2 size={18} />} />
          <MetricCard title="New in 30 days" value={recentBusinesses} hint="Recent onboarding activity" icon={<Users size={18} />} />
          <MetricCard title="Business types" value={businessTypeCount} hint="Types represented" icon={<BriefcaseBusiness size={18} />} />
        </section>

        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Business profiles</CardTitle>
              <p className="mt-1 text-sm text-slate-600">Read-only view of profiles registered in CASHMATE AI.</p>
            </div>
            <Button variant="outline" onClick={exportCsv} disabled={filteredBusinesses.length === 0 || loading}>
              <Download size={16} /> Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
              <label className="relative block">
                <span className="sr-only">Search businesses, owners, or phone numbers</span>
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search businesses, owners, phones…" className="pl-9" />
              </label>
              <label>
                <span className="sr-only">Filter by business type</span>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  <option value="all">All business types</option>
                  {BUSINESS_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
            </div>

            {loading ? <p className="py-10 text-center text-sm text-slate-500">Loading business profiles…</p>
              : businesses.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No business profiles yet.</p>
              : filteredBusinesses.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No profiles match those filters.</p>
              : (
                <div className="overflow-x-auto">
                  <p className="mb-3 text-sm text-slate-500">Showing {filteredBusinesses.length} of {businesses.length} profiles</p>
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-3 font-medium">Business</th>
                        <th className="px-3 py-3 font-medium">Owner</th>
                        <th className="px-3 py-3 font-medium">Type</th>
                        <th className="px-3 py-3 font-medium">Phone</th>
                        <th className="px-3 py-3 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredBusinesses.map((business) => (
                        <tr key={business.id} className="text-slate-700">
                          <td className="px-3 py-4 font-medium text-slate-950">{business.name}</td>
                          <td className="px-3 py-4">{business.owner_name}</td>
                          <td className="px-3 py-4">{business.type}</td>
                          <td className="px-3 py-4">{business.phone || "—"}</td>
                          <td className="px-3 py-4">{new Date(business.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function MetricCard({ title, value, hint, icon }: { title: string; value: number; hint: string; icon: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        <span className="rounded-lg bg-slate-100 p-2 text-slate-700">{icon}</span>
      </CardContent>
    </Card>
  );
}

function csvCell(value: string): string {
  const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

function AdminState({ title = "CASHMATE AI", message }: { title?: string; message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">{message}</p>
          <Link to="/dashboard"><Button variant="outline">Back to app</Button></Link>
        </CardContent>
      </Card>
    </main>
  );
}
