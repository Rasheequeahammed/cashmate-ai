import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../hooks/useBusiness";
import { BUSINESS_TYPES, isBusinessType, type BusinessType } from "../lib/businessTypes";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

// ---------------------------------------------------------------------------
// Field-level error shape
// ---------------------------------------------------------------------------
interface FieldErrors {
  name?: string;
  type?: string;
  owner_name?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getSubmitErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (message.includes("already have a business profile")) {
    return "A business profile already exists for your account.";
  }
  return message || "Could not save your business. Please try again.";
}

// ---------------------------------------------------------------------------
// OnboardingPage
// ---------------------------------------------------------------------------
export function OnboardingPage() {
  const { createBusiness } = useBusiness();
  const navigate = useNavigate();

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // UI state
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // -------------------------------------------------------------------------
  // Validation — runs before submit
  // -------------------------------------------------------------------------
  function validate(): FieldErrors {
    const errors: FieldErrors = {};

    if (name.trim().length === 0) {
      errors.name = "Business name is required.";
    }

    if (!isBusinessType(type)) {
      errors.type = "Please select a business type.";
    }

    if (ownerName.trim().length === 0) {
      errors.owner_name = "Owner name is required.";
    }

    return errors;
  }

  // -------------------------------------------------------------------------
  // Submit handler
  // -------------------------------------------------------------------------
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (errors.name || errors.type || errors.owner_name) return;

    setSubmitting(true);
    try {
      // PRD §16.4: trim whitespace before saving.
      // Type narrowing: validate() confirmed isBusinessType(type), but
      // TypeScript cannot see that — guard again so the cast is safe.
      const safeType = type as BusinessType;

      await createBusiness({
        name: name.trim(),
        type: safeType,
        owner_name: ownerName.trim(),
        // Optional fields: send null when blank (PRD §13.1 — nullable columns).
        phone: phone.trim() || null,
        logo_url: logoUrl.trim() || null,
      });

      // PRD FR-BIZ-04: redirect to dashboard on success.
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setFormError(getSubmitErrorMessage(err));
      setSubmitting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    // Mobile-first, single-column, centred layout (PRD §10.2).
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-4">
      <Card>
        <CardHeader>
          <CardTitle>Set up your business</CardTitle>
          <CardDescription>
            Tell us a little about your business to get started. You can update
            these details later from Settings.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Form-level error */}
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            {/* Business Name */}
            <div className="space-y-2">
              <Label htmlFor="onb-name">
                Business name <span aria-hidden="true" className="text-red-500">*</span>
              </Label>
              <Input
                id="onb-name"
                type="text"
                autoComplete="organization"
                required
                placeholder="e.g. Prism Digital Studio"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={fieldErrors.name ? true : undefined}
                aria-describedby={fieldErrors.name ? "onb-name-error" : undefined}
              />
              {fieldErrors.name && (
                <p id="onb-name-error" className="text-sm text-red-600">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Business Type */}
            <div className="space-y-2">
              <Label htmlFor="onb-type">
                Business type <span aria-hidden="true" className="text-red-500">*</span>
              </Label>
              {/*
               * Native <select> is used deliberately:
               *  - No extra dependency required (PRD §11 — no new deps).
               *  - Fully accessible and mobile-friendly out of the box.
               * Styled to match the existing Input component visuals.
               */}
              <select
                id="onb-type"
                required
                value={type}
                onChange={(e) => setType(e.target.value)}
                aria-invalid={fieldErrors.type ? true : undefined}
                aria-describedby={fieldErrors.type ? "onb-type-error" : undefined}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>
                  Select a type…
                </option>
                {BUSINESS_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
              {fieldErrors.type && (
                <p id="onb-type-error" className="text-sm text-red-600">
                  {fieldErrors.type}
                </p>
              )}
            </div>

            {/* Owner Name */}
            <div className="space-y-2">
              <Label htmlFor="onb-owner">
                Owner name <span aria-hidden="true" className="text-red-500">*</span>
              </Label>
              <Input
                id="onb-owner"
                type="text"
                autoComplete="name"
                required
                placeholder="e.g. Arjun Mehra"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                aria-invalid={fieldErrors.owner_name ? true : undefined}
                aria-describedby={
                  fieldErrors.owner_name ? "onb-owner-error" : undefined
                }
              />
              {fieldErrors.owner_name && (
                <p id="onb-owner-error" className="text-sm text-red-600">
                  {fieldErrors.owner_name}
                </p>
              )}
            </div>

            {/* Phone — optional */}
            <div className="space-y-2">
              <Label htmlFor="onb-phone">Phone number</Label>
              <Input
                id="onb-phone"
                type="tel"
                autoComplete="tel"
                placeholder="e.g. +91 98100 00001"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* Logo URL — optional */}
            <div className="space-y-2">
              <Label htmlFor="onb-logo">Logo URL</Label>
              <Input
                id="onb-logo"
                type="url"
                autoComplete="off"
                placeholder="https://example.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Paste a publicly accessible image URL. You can add this later.
              </p>
            </div>

            {/* Submit — size="lg" gives 44px height (PRD §10.2 touch target) */}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? "Setting up…" : "Create business profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
