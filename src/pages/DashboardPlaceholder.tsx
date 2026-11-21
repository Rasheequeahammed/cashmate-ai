import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useBusiness } from "../hooks/useBusiness";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";

function getSignOutError(err: unknown): string {
  return err instanceof Error && err.message
    ? err.message
    : "Could not log out. Please try again.";
}

/**
 * DashboardPlaceholder
 *
 * Minimal authenticated landing page that serves as the redirect target
 * after business onboarding and after login for returning users.
 *
 * Full dashboard content (KPI cards, charts, recent invoices) is
 * implemented in Feature 05 and will replace this placeholder.
 */
export function DashboardPlaceholder() {
  const { user, signOut } = useAuth();
  const { business } = useBusiness();
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogout() {
    setError(null);
    setSubmitting(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (err) {
      setError(getSignOutError(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-2xl font-semibold">CASHMATE AI</h1>

      {business && (
        <p className="text-lg font-medium text-slate-800">{business.name}</p>
      )}

      <p className="text-slate-600">Signed in as {user?.email ?? ""}</p>

      <p className="max-w-md text-sm text-slate-500">
        Dashboard placeholder — full dashboard (KPI cards, charts, recent
        invoices) will be implemented in Feature 05.
      </p>

      {error && (
        <Alert variant="destructive" className="max-w-sm text-left">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button variant="outline" onClick={handleLogout} disabled={submitting}>
        {submitting ? "Logging out…" : "Log out"}
      </Button>
    </div>
  );
}
