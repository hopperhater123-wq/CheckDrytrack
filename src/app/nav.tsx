import { createContext, useContext } from "react";

export type Route =
  | { name: "heute" }
  | { name: "besuch"; projektId: string; terminId?: string }
  | { name: "dashboard" }
  | { name: "projekte"; neu?: boolean }
  | { name: "projekt"; id: string }
  | { name: "geraete" }
  | { name: "geraet"; inv: string }
  | { name: "scan" }
  | { name: "termine" }
  | { name: "bestellungen" }
  | { name: "einstellungen" };

export const NavCtx = createContext<(r: Route) => void>(() => {});
export function useNav() {
  return useContext(NavCtx);
}
