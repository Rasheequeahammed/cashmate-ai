import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { BusinessProvider } from "./contexts/BusinessContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";
import { BusinessGate } from "./components/BusinessGate";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { DashboardPlaceholder } from "./pages/DashboardPlaceholder";

/**
 * Route tree
 *
 * PublicOnlyRoute  — /login, /register
 *   (redirects authenticated users to "/")
 *
 * ProtectedRoute   — auth check only (unchanged)
 *   BusinessProvider + BusinessGate — business-profile check
 *     /onboarding  — first-time setup
 *     /dashboard   — main app (placeholder until Feature 05)
 *   /              — redirects to /dashboard
 *                   (satisfies PublicOnlyRoute → "/" → "/dashboard" chain)
 *
 * *            — catch-all → "/"
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ----------------------------------------------------------------
              Public-only routes — unauthenticated users only.
              PublicOnlyRoute.tsx is not modified; it redirects to "/",
              which in turn redirects to "/dashboard" below.
          ---------------------------------------------------------------- */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* ----------------------------------------------------------------
              Auth-protected routes.
              ProtectedRoute.tsx is not modified; it handles auth only.
          ---------------------------------------------------------------- */}
          <Route element={<ProtectedRoute />}>
            {/* Business-profile subtree:
                BusinessProvider supplies the context;
                BusinessGate enforces the onboarding redirect. */}
            <Route
              element={
                <BusinessProvider>
                  <BusinessGate />
                </BusinessProvider>
              }
            >
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/dashboard" element={<DashboardPlaceholder />} />
              {/* Future feature routes (customers, invoices, expenses, etc.)
                  will be added here as siblings. */}
            </Route>

            {/* Root redirect — authenticated users land here from
                PublicOnlyRoute's default redirect. BusinessGate is not
                involved; the redirect happens before the profile check. */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Catch-all — sends unknown paths back through the root redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
