import { useContext } from "react";
import { BusinessContext, type BusinessContextValue } from "../contexts/BusinessContext";

export function useBusiness(): BusinessContextValue {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
}
