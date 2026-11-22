import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export type AdminAccessState = "loading" | "admin" | "not-admin" | "error";

export function useAdminAccess() {
  const { user } = useAuth();
  const [state, setState] = useState<AdminAccessState>("loading");

  useEffect(() => {
    let active = true;

    if (!user) {
      setState("not-admin");
      return () => {
        active = false;
      };
    }

    setState("loading");
    void supabase.rpc("is_admin").then(({ data, error }) => {
      if (!active) return;
      setState(error ? "error" : data === true ? "admin" : "not-admin");
    });

    return () => {
      active = false;
    };
  }, [user?.id]);

  return state;
}
