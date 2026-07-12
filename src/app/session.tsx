import { createContext, useContext, useState, type ReactNode } from "react";
import type { Benutzer } from "../domain/types";
import { faehigkeiten, type Faehigkeiten } from "../domain/roles";

// Login-Stub: In Produktion läuft der Login über Microsoft 365 (FR-SEC-001).
// Hier wählt man zu Demozwecken einen Benutzer/eine Rolle.
interface Session {
  user: Benutzer;
  can: Faehigkeiten;
  logout: () => void;
}

const SessionCtx = createContext<Session | null>(null);
const KEY = "drytrack.session.userId";

export function SessionProvider({ users, children }: { users: Benutzer[]; children: (login: (u: Benutzer) => void) => ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem(KEY));
  const user = users.find((u) => u.id === userId) ?? null;

  const login = (u: Benutzer) => { localStorage.setItem(KEY, u.id); setUserId(u.id); };
  const logout = () => { localStorage.removeItem(KEY); setUserId(null); };

  if (!user) return <>{children(login)}</>;

  const value: Session = { user, can: faehigkeiten(user.rolle), logout };
  return <SessionCtx.Provider value={value}>{children(login)}</SessionCtx.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession außerhalb eines eingeloggten Kontexts");
  return ctx;
}
