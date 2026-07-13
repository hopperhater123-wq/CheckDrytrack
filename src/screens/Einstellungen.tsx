import { useEffect, useState } from "react";
import { useDB } from "../app/useStore";
import { useSession } from "../app/session";
import { store } from "../domain/store";
import { ROLLEN_LABEL } from "../domain/roles";
import { Icon } from "../ui/Icon";

// beforeinstallprompt ist Chromium-only und untypisiert.
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

function InstallCard() {
  const [evt, setEvt] = useState<InstallPromptEvent | null>(null);
  const [installiert, setInstalliert] = useState(
    () => window.matchMedia("(display-mode: standalone)").matches,
  );

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as InstallPromptEvent); };
    const onInstalled = () => { setInstalliert(true); setEvt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return (
    <section className="card">
      <div className="card-head"><h2>Als App installieren</h2>
        {installiert && <span className="chip chip-live">installiert</span>}
      </div>
      {installiert ? (
        <p className="muted small">DryTrack läuft als installierte App — Startbildschirm-Icon, Vollbild, offline.</p>
      ) : evt ? (
        <>
          <p className="muted small">DryTrack aufs Handy oder den Desktop holen: eigenes Icon, Vollbild ohne Browser-Leiste, funktioniert offline.</p>
          <button className="btn btn-primary" onClick={() => evt.prompt()}>
            <Icon name="droplet" size={16} /> Jetzt installieren
          </button>
        </>
      ) : (
        <p className="muted small">
          <strong>iPhone/iPad:</strong> In Safari „Teilen" → „Zum Home-Bildschirm". ·{" "}
          <strong>Android/Chrome:</strong> Menü ⋮ → „App installieren".
          Voraussetzung: Die App läuft über HTTPS (nicht in dieser eingebetteten Demo).
        </p>
      )}
    </section>
  );
}

export function Einstellungen() {
  const db = useDB();
  const { user, can } = useSession();

  const faehigkeiten: [string, boolean][] = [
    ["Geräte scannen/erfassen", can.geraeteScannen],
    ["Alle Erfassungen einsehen", can.alleErfassungenEinsehen],
    ["Projekt anlegen", can.projektAnlegen],
    ["Projekt bearbeiten/schließen", can.projektBearbeiten],
    ["Geräte-Stammdaten verwalten", can.geraeteStammdatenVerwalten],
    ["Mitarbeiter verwalten", can.mitarbeiterVerwalten],
    ["Export / Reporting", can.exportReporting],
    ["Kennzahlen / Analytics", can.analytics],
    ["Kosten / KVA sichtbar", can.kostenSichtbar],
  ];

  const freigabegrenze = db.firmen_einstellung.find((f) => f.schluessel === "freigabegrenze_eur")?.wert;

  return (
    <div className="screen">
      <h1>Mehr</h1>

      <InstallCard />

      <section className="card">
        <div className="card-head"><h2>Angemeldet als</h2></div>
        <dl className="facts">
          <div><dt>Name</dt><dd>{user.name}</dd></div>
          <div><dt>Rolle</dt><dd>{ROLLEN_LABEL[user.rolle]}</dd></div>
          <div><dt>Microsoft 365</dt><dd>{user.microsoft_account_id}</dd></div>
        </dl>
      </section>

      <section className="card">
        <div className="card-head"><h2>Ihre Berechtigungen</h2></div>
        <div className="matrix">
          {faehigkeiten.map(([label, ok]) => (
            <div key={label} className="matrix-row">
              <span>{label}</span>
              <span className={ok ? "yes" : "no"}>{ok ? "✓" : "✕"}</span>
            </div>
          ))}
        </div>
        <p className="muted small">Rollenwechsel ist ausschließlich Admins vorbehalten (FR-ROLE-002).</p>
      </section>

      <section className="card">
        <div className="card-head"><h2>Firmen-Einstellungen</h2></div>
        <dl className="facts">
          <div><dt>Freigabegrenze</dt><dd>{freigabegrenze ? `${Number(freigabegrenze).toLocaleString("de-DE")} €` : "—"} (FR-PROJ-011)</dd></div>
        </dl>
      </section>

      <section className="card">
        <div className="card-head"><h2>Daten</h2></div>
        <p className="muted small">Alle Daten liegen offline im Browser (Offline-First, 000 Vision). Zum Zurücksetzen auf die Demo-Daten:</p>
        <button className="btn" onClick={() => { if (confirm("Demo-Daten zurücksetzen? Lokale Änderungen gehen verloren.")) store.reset(); }}>Demo-Daten zurücksetzen</button>
      </section>

      <p className="footer-note">DryTrack · Umsetzung aus den Notion-Docs (000 Vision → 017 Deployment). Arbeitstitel.</p>
    </div>
  );
}
