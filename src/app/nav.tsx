import { createContext, useContext } from "react";

export type Route =
  | { name: "dashboard" }
  | { name: "projekte" }
  | { name: "projekt"; id: string }
  | { name: "geraete" }
  | { name: "geraet"; inv: string }
  | { name: "scan" }
  | { name: "einstellungen" };

export const NavCtx = createContext<(r: Route) => void>(() => {});
export function useNav() {
  return useContext(NavCtx);
}
