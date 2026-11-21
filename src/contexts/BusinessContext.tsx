import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";

export interface Business {
  id: string;
  user_id: string;
  name: string;
  type: string;
  owner_name: string;
  phone: string | null;
  logo_url: string | null;
}

export interface NewBusinessInput {
  name: string;
  type: string;
  owner_name: string;
  phone: string | null;
  logo_url: string | null;
}

export type BusinessStatus = "idle" | "loading" | "ready" | "error";

export interface BusinessContextValue {
  business: Business | null;
  status: BusinessStatus;
  error: string | null;
  refresh: () => Promise<void>;
  createBusiness: (input: NewBusinessInput) => Promise<Business>;
}

const BUSINESS_COLUMNS = "id, user_id, name, type, owner_name, phone, logo_url";
const LOAD_ERROR_MESSAGE = "Could not load your business profile. Please try again.";

// Exported only so the useBusiness hook (src/hooks/useBusiness.ts) can read it.
export const BusinessContext = createContext<BusinessContextValue | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [business, setBusiness] = useState<Business | null>(null);
  const [status, setStatus] = useState<BusinessStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const loadBusiness = useCallback(async (id: string, isActive: () => boolean) => {
    setStatus("loading");
    setError(null);

    const { data, error: queryError } = await supabase
      .from("businesses")
      .select(BUSINESS_COLUMNS)
      .eq("user_id", id)
      .maybeSingle();

    if (!isActive()) return;

    if (queryError) {
      setStatus("error");
      setError(LOAD_ERROR_MESSAGE);
      return;
    }

    setBusiness((data as Business | null) ?? null);
    setStatus("ready");
  }, []);

  useEffect(() => {
    if (!userId) {
      setBusiness(null);
      setStatus("idle");
      setError(null);
      return;
    }

    let active = true;
    setBusiness(null);
    void loadBusiness(userId, () => active);

    return () => {
      active = false;
    };
  }, [userId, loadBusiness]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    await loadBusiness(userId, () => true);
  }, [userId, loadBusiness]);

  const createBusiness = useCallback(
    async (input: NewBusinessInput): Promise<Business> => {
      if (!userId) {
        throw new Error("You must be signed in.");
      }

      const { data, error: insertError } = await supabase
        .from("businesses")
        .insert({
          user_id: userId,
          name: input.name,
          type: input.type,
          owner_name: input.owner_name,
          phone: input.phone,
          logo_url: input.logo_url,
        })
        .select(BUSINESS_COLUMNS)
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          throw new Error("You already have a business profile.");
        }
        throw new Error(insertError.message || "Could not save your business. Please try again.");
      }

      const created = data as Business;
      setBusiness(created);
      setStatus("ready");
      setError(null);
      return created;
    },
    [userId],
  );

  const value = useMemo<BusinessContextValue>(
    () => ({
      business,
      status,
      error,
      refresh,
      createBusiness,
    }),
    [business, status, error, refresh, createBusiness],
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}
