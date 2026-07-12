import type { Benutzer } from "../domain/types";
import { ROLLEN_LABEL } from "../domain/roles";
import { Icon } from "../ui/Icon";

// Demo-Login. Produktiv: Single-Sign-On über Microsoft 365 (FR-SEC-001, kein separates Passwort).
export function Login({ users, onLogin }: { users: Benutzer[]; onLogin: (u: Benutzer) => void }) {
  return (
    <div className="login">
      <div className="login-card">
        <div className="login-brand"><span className="logo"><Icon name="droplet" size={20} strokeWidth={2} /></span> DryTrack</div>
        <p className="login-sub">Digitale Arbeitsplattform für Gebäudetrocknung</p>
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
      </div>
    </div>
  );
}
