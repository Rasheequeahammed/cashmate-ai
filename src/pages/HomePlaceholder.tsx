import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";

function getErrorMessage(err: unknown): string {
  return err instanceof Error && err.message
    ? err.message
    : "Could not log out. Please try again.";
}

export function HomePlaceholder() {
  const { user, signOut } = useAuth();
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
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-2xl font-semibold">CASHMATE AI</h1>
      <p className="text-slate-700">Signed in as {user?.email ?? ""}</p>
      <p className="max-w-md text-sm text-slate-500">
        Dashboard placeholder. Business onboarding and dashboard features are not implemented yet.
      </p>

      {error && (
        <Alert variant="destructive" className="max-w-sm text-left">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button variant="outline" onClick={handleLogout} disabled={submitting}>
        Logout
      </Button>
    </div>
  );
}
