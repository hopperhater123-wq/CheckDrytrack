import { useSyncExternalStore } from "react";
import { store } from "../domain/store";
import type { DryTrackDB } from "../domain/types";

/** Reaktiver Zugriff auf die gesamte DB. Rerendert bei jeder Mutation (auch aus anderen Tabs). */
export function useDB(): DryTrackDB {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
