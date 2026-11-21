import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

interface FieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function getErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (message.includes("already registered")) {
    return "An account with this email already exists.";
  }
  return message || "Something went wrong. Please try again.";
}

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!EMAIL_PATTERN.test(email)) {
      errors.email = "Enter a valid email address.";
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = "Password must be at least 8 characters.";
    }
    if (confirmPassword !== password) {
      errors.confirmPassword = "Passwords do not match.";
    }
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (errors.email || errors.password || errors.confirmPassword) return;

    setSubmitting(true);
    try {
      const { needsConfirmation } = await signUp(email, password);
      if (needsConfirmation) {
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setFieldErrors({});
        setConfirmationSent(true);
        setSubmitting(false);
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setFormError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-4">
      <Card>
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
        </CardHeader>
        <CardContent>
          {confirmationSent && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Account created. Check your email and click the confirmation link before logging in.
                </AlertDescription>
              </Alert>
              <p className="text-center text-sm text-slate-600">
                <Link to="/login" className="font-medium text-slate-900 underline underline-offset-4">
                  Go to log in
                </Link>
              </p>
            </div>
          )}

          {!confirmationSent && (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={fieldErrors.email ? true : undefined}
                  aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
                />
                {fieldErrors.email && (
                  <p id="register-email-error" className="text-sm text-red-600">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <Input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={fieldErrors.password ? true : undefined}
                  aria-describedby={fieldErrors.password ? "register-password-error" : undefined}
                />
                {fieldErrors.password && (
                  <p id="register-password-error" className="text-sm text-red-600">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-confirm-password">Confirm password</Label>
                <Input
                  id="register-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  aria-invalid={fieldErrors.confirmPassword ? true : undefined}
                  aria-describedby={
                    fieldErrors.confirmPassword ? "register-confirm-password-error" : undefined
                  }
                />
                {fieldErrors.confirmPassword && (
                  <p id="register-confirm-password-error" className="text-sm text-red-600">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creating account…" : "Create account"}
              </Button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-slate-600">
            <Link to="/login" className="font-medium text-slate-900 underline underline-offset-4">
              Already have an account? Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
