// Microsoft-365-Anmeldung (FR-SEC-001) über Supabase Auth mit dem Azure-Provider (Entra ID).
// Nur der Client-Login-Fluss: Redirect anstoßen, Rück-Session lesen, auf Änderungen hören,
// die Entra-Identität auf einen DryTrack-Benutzer abbilden. RLS/DB bleibt hiervon unberührt.
//
// Aktiv nur, wenn MS365_LOGIN=true UND ein Supabase-Client konfiguriert ist — sonst greift
// weiterhin der Demo-Login (Rolle wählen). So bleibt die App ohne Azure-Konfiguration nutzbar.

import { getSupabaseClient } from "./remote";
import { AUTH_REQUIRED, MS365_LOGIN } from "../config";
import type { Benutzer } from "./types";

export interface AuthIdentitaet {
  /** Stabile Entra-Objekt-ID (oid) bzw. Subject — Schlüssel für das Benutzer-Mapping. */
  microsoft_account_id: string;
  email: string | null;
  name: string | null;
}

/** Ist der Microsoft-365-Login aktiv (konfiguriert)? Sonst Demo-Login. */
export function ms365Aktiv(): boolean {
  return MS365_LOGIN && !!getSupabaseClient();
}

/** Startet den OAuth-Redirect zu Microsoft 365. Kehrt nach erfolgreicher Anmeldung zur App zurück. */
export async function ms365Anmelden(): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "Microsoft-365-Anmeldung ist nicht konfiguriert." };
  const { error } = await sb.auth.signInWithOAuth({
    provider: "azure",
    options: {
      scopes: "openid email profile",
      redirectTo: window.location.origin + window.location.pathname,
    },
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Meldet die Microsoft-365-Session ab (best effort). */
export async function ms365Abmelden(): Promise<void> {
  await getSupabaseClient()?.auth.signOut();
}

// --- E-Mail/Passwort-Login (Pilot-Zugangssperre, AUTH_REQUIRED) -----------------

/** Ist die Pflicht-Anmeldung mit E-Mail/Passwort aktiv (konfiguriert)? */
export function passwortLoginAktiv(): boolean {
  return AUTH_REQUIRED && !!getSupabaseClient();
}

/** Meldet mit E-Mail + Passwort an (geteiltes Pilot-Konto, Supabase Auth). */
export async function emailAnmelden(email: string, passwort: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "Anmeldung ist nicht konfiguriert." };
  const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: passwort });
  if (!error) return { ok: true };
  // Supabase-Fehlermeldungen sind englisch — die häufigste verständlich übersetzen.
  const msg = /invalid login credentials/i.test(error.message)
    ? "E-Mail oder Passwort stimmt nicht."
    : /email not confirmed/i.test(error.message)
      ? "Konto noch nicht bestätigt — bitte im Supabase-Dashboard Auto-Confirm setzen."
      : error.message;
  return { ok: false, error: msg };
}

/** Meldet die E-Mail/Passwort-Session ab (best effort). */
export async function emailAbmelden(): Promise<void> {
  await getSupabaseClient()?.auth.signOut();
}

/** Besteht aktuell überhaupt eine gültige Supabase-Auth-Session (E-Mail oder MS365)? */
export async function hatAuthSession(): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;
  const { data } = await sb.auth.getSession();
  return !!data.session;
}

function ausSupabaseUser(u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined): AuthIdentitaet | null {
  if (!u) return null;
  const meta = u.user_metadata ?? {};
  return {
    microsoft_account_id: (meta.oid as string) || (meta.sub as string) || u.id,
    email: u.email ?? (meta.email as string) ?? null,
    name: (meta.name as string) || (meta.full_name as string) || null,
  };
}

/** Aktuelle Microsoft-365-Identität aus der bestehenden Session (nach Redirect/Reload). */
export async function aktuelleIdentitaet(): Promise<AuthIdentitaet | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return ausSupabaseUser(data.session?.user);
}

/** Auf An-/Abmeldungen hören (z. B. Rückkehr vom OAuth-Redirect). Liefert eine Unsubscribe-Funktion. */
export function aufAuthAenderung(cb: (id: AuthIdentitaet | null) => void): () => void {
  const sb = getSupabaseClient();
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((_event, session) => cb(ausSupabaseUser(session?.user)));
  return () => data.subscription.unsubscribe();
}

/**
 * Bildet eine Microsoft-365-Identität auf einen DryTrack-Benutzer ab (reine Funktion, testbar).
 * Priorität: exakte microsoft_account_id → sonst E-Mail-Gleichheit (Fallback bei Erst-Provisionierung).
 */
export function findeBenutzerZuIdentitaet(users: Benutzer[], id: AuthIdentitaet): Benutzer | null {
  const perId = users.find((u) => u.microsoft_account_id && u.microsoft_account_id === id.microsoft_account_id);
  if (perId) return perId;
  if (id.email) {
    const perMail = users.find((u) => u.microsoft_account_id.toLowerCase() === id.email!.toLowerCase());
    if (perMail) return perMail;
  }
  return null;
}
