import { useState } from "react";
import type { Benutzer } from "../domain/types";
import { ROLLEN_LABEL } from "../domain/roles";
import { ms365Aktiv, ms365Anmelden } from "../domain/auth";
import { FluidField } from "../ui/FluidField";

// Anmeldung: Single-Sign-On über Microsoft 365 (FR-SEC-001) wenn konfiguriert,
// sonst Demo-Login (Rolle wählen). Der Demo-Zugang bleibt als Fallback erhalten.
// Optik: Hero-Moment über dem Feuchteschleier — Plakat-Typo, Karte in Glas.
export function Login({ users, onLogin, ms365Fehler }: { users: Benutzer[]; onLogin: (u: Benutzer) => void; ms365Fehler?: string | null }) {
  const mit365 = ms365Aktiv();
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

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
          <p className="login-claim">Nass ist ein Zustand. <em>Trocken ist ein Ergebnis.</em></p>
        </header>
        <div className="login-card">
          <p className="eyebrow">Anmeldung</p>

        {mit365 ? (
          <>
            <button className="btn btn-primary block ms365-btn" onClick={() => void anmelden()} disabled={laedt}>
              <MicrosoftLogo /> {laedt ? "Weiterleitung…" : "Mit Microsoft anmelden"}
            </button>
            {(fehler || ms365Fehler) && <p className="error">{fehler ?? ms365Fehler}</p>}
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
