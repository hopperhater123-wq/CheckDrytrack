// Supabase-Zugang (Projekt "DryTRack", eu-central-1).
// Der Publishable Key ist für Clients bestimmt (Zugriff regeln RLS-Policies).
// Leere Werte ⇒ App läuft rein lokal (localStorage), z. B. in der eingebetteten Demo.
export const SUPABASE_URL = "https://zkuawtrwtmxhayshuxzv.supabase.co";
export const SUPABASE_KEY = "sb_publishable_QIzIK2jrkf-IbPaOlYBAtQ_5tRgAnSP";

// Single-Sign-On über Microsoft 365 / Entra ID (FR-SEC-001).
// false ⇒ Demo-Login (Rolle wählen). true ⇒ „Mit Microsoft anmelden" über Supabase Auth
// (Azure-Provider). Aktivierung setzt eine Azure-App-Registrierung + den in Supabase
// konfigurierten Azure-Provider voraus; erst dann sinnvoll zusammen mit RLS scharf schalten.
export const MS365_LOGIN = false;

// Pflicht-Anmeldung mit E-Mail/Passwort (Supabase Auth) — schlanke Zugangssperre für den
// Pilotbetrieb. true ⇒ die App verlangt vor allem anderen ein Login; dadurch wird der
// öffentliche anon-Key wertlos (RLS auf „nur eingeloggt" umgestellt). Danach wählt man
// weiterhin seine Rolle für die Ansicht. Steuerung über die Build-Umgebung, damit der
// hermetische E2E-Test und die eingebettete Demo unangetastet bleiben (Default: aus).
export const AUTH_REQUIRED = import.meta.env.VITE_AUTH_REQUIRED === "true";
