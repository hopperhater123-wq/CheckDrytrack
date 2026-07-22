import { useState } from "react";
import type { Benutzer } from "../domain/types";
import type { AuthState } from "../app/session";
import { ROLLEN_LABEL } from "../domain/roles";
import { ms365Aktiv, ms365Anmelden } from "../domain/auth";
import { FluidField } from "../ui/FluidField";
import { AnimatedText } from "../ui/AnimatedText";

// Anmeldung: Pflicht-Login per E-Mail/Passwort (AUTH_REQUIRED, Pilot-Zugangssperre) oder
// Single-Sign-On über Microsoft 365 (FR-SEC-001) wenn konfiguriert, sonst Demo-Login
// (Rolle wählen). Optik: Hero-Moment über dem Feuchteschleier — Plakat-Typo, Karte in Glas.
export function Login({ users, onLogin, auth, introAktiv = false }: { users: Benutzer[]; onLogin: (u: Benutzer) => void; auth?: AuthState; introAktiv?: boolean }) {
  const mit365 = ms365Aktiv();
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  // Pflicht-Login noch offen? Dann zuerst das E-Mail/Passwort-Tor zeigen (vor der Rollenwahl).
  const brauchtLogin = !!auth?.authAktiv && !auth.authSession;

  const anmelden = async () => {
    setFehler(null); setLaedt(true);
    const res = await ms365Anmelden();
    if (!res.ok) { setFehler(res.error ?? "Anmeldung nicht möglich."); setLaedt(false); }
    // Erfolg ⇒ Redirect zu Microsoft; die App kehrt danach angemeldet zurück.
  };

  return (
    <div className="login">
      <FluidField variante="hero" />
      <div className="login-inner">
        <header className="login-hero">
          <p className="eyebrow login-eyebrow">Feldinstrument · Gebäudetrocknung</p>
          <h1 className="login-title">Torrek</h1>
          <AnimatedText
            className="login-claim"
            delay={0.15}
            start={!introAktiv}
            segments={[
              { text: "Nass ist ein Zustand. " },
              { text: "Trocken ist ein Ergebnis.", className: "claim-dry" },
            ]}
          />
        </header>
        <div className="login-card">
          <p className="eyebrow">Anmeldung</p>

        {brauchtLogin ? (
          <EmailPasswortFormular login={auth!.emailLogin} />
        ) : mit365 ? (
          <>
            <button className="btn btn-primary block ms365-btn" onClick={() => void anmelden()} disabled={laedt}>
              <MicrosoftLogo /> {laedt ? "Weiterleitung…" : "Mit Microsoft anmelden"}
            </button>
            {(fehler || auth?.ms365Fehler) && <p className="error">{fehler ?? auth?.ms365Fehler}</p>}
            <details className="login-demo">
              <summary>Demo-Zugang (ohne Microsoft)</summary>
              <div className="login-users">
                {users.map((u) => (
                  <button key={u.id} className="login-user" onClick={() => onLogin(u)}>
                    <span className="login-user-name">{u.name}</span>
                    <span className="badge">{ROLLEN_LABEL[u.rolle]}</span>
                  </button>
                ))}
              </div>
            </details>
          </>
        ) : (
          <>
            <p className="login-hint">
              Produktiv erfolgt die Anmeldung über <strong>Microsoft 365</strong> (FR-SEC-001).
              Für diese Demo: Rolle wählen.
            </p>
            <div className="login-users">
              {users.map((u) => (
                <button key={u.id} className="login-user" onClick={() => onLogin(u)}>
                  <span className="login-user-name">{u.name}</span>
                  <span className="badge">{ROLLEN_LABEL[u.rolle]}</span>
                </button>
              ))}
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}

// Pilot-Zugangssperre: geteiltes E-Mail/Passwort-Konto (Supabase Auth). Nach erfolgreicher
// Anmeldung entfällt diese Karte automatisch (die Session-Erkennung schaltet zur Rollenwahl weiter).
function EmailPasswortFormular({ login }: { login: (email: string, passwort: string) => Promise<{ ok: boolean; error?: string }> }) {
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const absenden = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !passwort) return;
    setFehler(null); setLaedt(true);
    const res = await login(email, passwort);
    if (!res.ok) { setFehler(res.error ?? "Anmeldung nicht möglich."); setLaedt(false); }
    // Erfolg ⇒ die Session-Erkennung in SessionProvider blendet dieses Formular aus.
  };

  return (
    <form className="login-form" onSubmit={(e) => void absenden(e)}>
      <p className="login-hint">Bitte mit dem Firmen-Zugang anmelden.</p>
      <label className="field"><span>E-Mail</span>
        <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@firma.de" required />
      </label>
      <label className="field"><span>Passwort</span>
        <input type="password" autoComplete="current-password" value={passwort} onChange={(e) => setPasswort(e.target.value)} required />
      </label>
      <button className="btn btn-primary block" type="submit" disabled={laedt}>{laedt ? "Anmelden…" : "Anmelden"}</button>
      {fehler && <p className="error">{fehler}</p>}
    </form>
  );
}

// Microsoft-Vierfarb-Logo (offizielle Kachel-Optik), inline als SVG.
function MicrosoftLogo() {
  return (
    <svg width="17" height="17" viewBox="0 0 23 23" aria-hidden="true" style={{ flex: "0 0 auto" }}>
      <path fill="#f25022" d="M1 1h10v10H1z" />
      <path fill="#7fba00" d="M12 1h10v10H12z" />
      <path fill="#00a4ef" d="M1 12h10v10H1z" />
      <path fill="#ffb900" d="M12 12h10v10H12z" />
    </svg>
  );
}
