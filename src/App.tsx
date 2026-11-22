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
import { CustomersPage } from "./pages/CustomersPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { AdminPage } from "./pages/AdminPage";
import { ForecastPage } from "./pages/ForecastPage";


/**
 * Route tree
 *
 * PublicOnlyRoute  — /login, /register
 *   (redirects authenticated users to "/")
 *
 * ProtectedRoute   — auth check only (unchanged)
 *   BusinessProvider + BusinessGate — business-profile check
 *     /onboarding  — first-time setup
 *     /dashboard   — main dashboard
 *     /customers   — customer management
 *     /invoices    — invoice creation & payment recording
 *     /expenses    — expense management (one-time & recurring)
 *     /payments    — redirects to /invoices
 *   /              — redirects to /dashboard
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
          ---------------------------------------------------------------- */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* ----------------------------------------------------------------
              Auth-protected routes.
          ---------------------------------------------------------------- */}
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminPage />} />
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
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/forecast" element={<ForecastPage />} />
              <Route path="/payments" element={<Navigate to="/invoices" replace />} />
            </Route>

            {/* Root redirect — authenticated users land here from
                PublicOnlyRoute's default redirect. */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Catch-all — sends unknown paths back through the root redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
