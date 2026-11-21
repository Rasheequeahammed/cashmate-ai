import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useBusiness } from "../hooks/useBusiness";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";

/**
 * BusinessGate — layout component that enforces the business-profile
 * onboarding check for all protected routes.
 *
 * Responsibility: business-profile state only.
 * Authentication is handled exclusively by ProtectedRoute (unchanged).
 *
 * State machine:
 *   auth.loading           → full-screen spinner (defensive; ProtectedRoute resolves this first)
 *   business.status=loading → full-screen spinner
 *   business.status=error   → error message + Retry button (calls refresh())
 *   business=null, path≠/onboarding → redirect to /onboarding
 *   business≠null, path=/onboarding → redirect to /dashboard (already set up)
 *   otherwise               → render <Outlet />
 */
export function BusinessGate() {
  const { loading: authLoading } = useAuth();
  const { business, status, error, refresh } = useBusiness();
  const location = useLocation();

  // Defensive guard: should already be resolved by ProtectedRoute, but
  // avoid a flash of incorrect state if the two contexts race.
  if (authLoading) {
    return <FullScreenSpinner message="Loading…" />;
  }

  // Business profile is being fetched from Supabase.
  if (status === "loading" || status === "idle") {
    return <FullScreenSpinner message="Loading your profile…" />;
  }

  // Database / network error while fetching the business profile.
  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
        <Alert variant="destructive" className="max-w-sm text-left">
          <AlertDescription>
            {error ?? "Could not load your business profile. Please try again."}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  // status === "ready" from here on.

  const isOnboardingPath = location.pathname === "/onboarding";

  // No business profile exists → send to onboarding (unless already there).
  if (business === null && !isOnboardingPath) {
    return <Navigate to="/onboarding" replace />;
  }

  // Business profile already exists → send away from onboarding to dashboard.
  if (business !== null && isOnboardingPath) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

function FullScreenSpinner({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center text-slate-500">
      {message}
    </div>
  );
}
