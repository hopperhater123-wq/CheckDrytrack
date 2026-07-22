import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Benutzer } from "../domain/types";
import { faehigkeiten, type Faehigkeiten } from "../domain/roles";
import {
  aktuelleIdentitaet, aufAuthAenderung, emailAbmelden, emailAnmelden, findeBenutzerZuIdentitaet,
  hatAuthSession, ms365Abmelden, ms365Aktiv, passwortLoginAktiv, type AuthIdentitaet,
} from "../domain/auth";

// Anmeldung: produktiv Single-Sign-On über Microsoft 365 (FR-SEC-001) oder Pflicht-Login
// per E-Mail/Passwort (AUTH_REQUIRED, Pilot-Zugangssperre), sonst Demo-Login (Rolle wählen).
// Alle Wege setzen denselben Benutzer als aktive Session.
interface Session {
  user: Benutzer;
  can: Faehigkeiten;
  logout: () => void;
}

const SessionCtx = createContext<Session | null>(null);
const KEY = "drytrack.session.userId";

export interface AuthState {
  ms365Fehler: string | null;
  /** Pflicht-Login (E-Mail/Passwort) aktiv? */
  authAktiv: boolean;
  /** Besteht eine gültige Auth-Session? (bei ausgeschaltetem Pflicht-Login immer true) */
  authSession: boolean;
  /** E-Mail/Passwort-Anmeldung anstoßen (geteiltes Pilot-Konto). */
  emailLogin: (email: string, passwort: string) => Promise<{ ok: boolean; error?: string }>;
}

export function SessionProvider({ users, children }: { users: Benutzer[]; children: (login: (u: Benutzer) => void, auth: AuthState) => ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem(KEY));
  const [ms365Fehler, setMs365Fehler] = useState<string | null>(null);
  // Auth-Session: ohne Pflicht-Login gilt sofort „vorhanden" (nichts sperrt).
  const [authSession, setAuthSession] = useState<boolean>(() => !passwortLoginAktiv());
  const user = users.find((u) => u.id === userId) ?? null;

  const login = (u: Benutzer) => { localStorage.setItem(KEY, u.id); setUserId(u.id); };
  const logout = () => {
    localStorage.removeItem(KEY);
    setUserId(null);
    if (ms365Aktiv()) void ms365Abmelden();
    else if (passwortLoginAktiv()) { void emailAbmelden(); setAuthSession(false); }
  };

  // Pflicht-Login (E-Mail/Passwort): bestehende Session übernehmen und auf An-/Abmeldung hören.
  useEffect(() => {
    if (!passwortLoginAktiv()) return;
    void hatAuthSession().then(setAuthSession);
    return aufAuthAenderung((id) => setAuthSession(!!id));
  }, []);

  // Microsoft 365: bestehende Session übernehmen und auf die Rückkehr vom OAuth-Redirect reagieren.
  useEffect(() => {
    if (!ms365Aktiv()) return;
    const anwenden = (id: AuthIdentitaet | null) => {
      if (!id) return; // Abmeldung läuft über logout()
      const b = findeBenutzerZuIdentitaet(users, id);
      if (b) { localStorage.setItem(KEY, b.id); setUserId(b.id); setMs365Fehler(null); }
      else setMs365Fehler(`Kein Torrek-Zugang für ${id.email ?? id.name ?? "dieses Microsoft-Konto"}. Bitte an die Disposition wenden.`);
    };
    void aktuelleIdentitaet().then(anwenden);
    return aufAuthAenderung(anwenden);
  }, [users]);

  const authState: AuthState = { ms365Fehler, authAktiv: passwortLoginAktiv(), authSession, emailLogin: emailAnmelden };

  // Zugang nur, wenn eine Auth-Session besteht (falls Pflicht-Login) UND eine Rolle gewählt ist.
  if (!authSession || !user) return <>{children(login, authState)}</>;

  const value: Session = { user, can: faehigkeiten(user.rolle), logout };
  return <SessionCtx.Provider value={value}>{children(login, authState)}</SessionCtx.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession außerhalb eines eingeloggten Kontexts");
  return ctx;
}
