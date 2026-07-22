import { useEffect, useState } from "react";
import { useDB } from "../app/useStore";
import { useSession } from "../app/session";
import { store } from "../domain/store";
import { ROLLEN_LABEL } from "../domain/roles";
import { Icon } from "../ui/Icon";
import { setSoundAn, soundAn, spiele } from "../ui/sound";
import { setzeTheme, themeWahl, type ThemeWahl } from "../ui/theme";
import { getSupabaseClient } from "../domain/remote";

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
        <p className="muted small">Torrek läuft als installierte App — Startbildschirm-Icon, Vollbild, offline.</p>
      ) : evt ? (
        <>
          <p className="muted small">Torrek aufs Handy oder den Desktop holen: eigenes Icon, Vollbild ohne Browser-Leiste, funktioniert offline.</p>
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

// Design: Hell / Dunkel / Automatisch (folgt dem System).
function ThemeCard() {
  const [wahl, setWahl] = useState<ThemeWahl>(themeWahl);
  const waehle = (w: ThemeWahl) => { setzeTheme(w); setWahl(w); };
  const OPTIONEN: [ThemeWahl, string][] = [["hell", "Hell"], ["dunkel", "Dunkel"], ["auto", "Automatisch"]];
  return (
    <section className="card">
      <div className="card-head"><h2>Design</h2></div>
      <div className="segmented" style={{ display: "flex" }}>
        {OPTIONEN.map(([w, label]) => (
          <button key={w} type="button" className={wahl === w ? "seg active" : "seg"} onClick={() => waehle(w)}>{label}</button>
        ))}
      </div>
      <p className="muted small" style={{ marginBottom: 0 }}>„Automatisch" folgt der Einstellung deines Geräts.</p>
    </section>
  );
}

// Dezente UI-Sounds (Speichern, Trocken-Moment, Intro) an-/abschalten.
function SoundCard() {
  const [an, setAn] = useState(soundAn);
  const umschalten = (neu: boolean) => {
    setSoundAn(neu);
    setAn(neu);
    if (neu) spiele("erfolg"); // Hörprobe
  };
  return (
    <section className="card">
      <div className="card-head"><h2>Soundeffekte</h2>
        <span className={`chip small${an ? " chip-live" : ""}`}>{an ? "an" : "aus"}</span>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={an} onChange={(e) => umschalten(e.target.checked)} />
        Dezente Töne bei Speichern, Trocken-Moment und App-Start
      </label>
    </section>
  );
}

// Büro-Steuerung für das Nebenprodukt „Torrek Scan": die Foto-Erinnerung/-Pflicht
// (scan_einstellung.foto_pflicht) direkt am Server umstellen. Online-only —
// die Einstellung lebt bewusst NUR im Scan-Silo, nicht im Torrek-Sync.
function TorrekScanCard({ sichtbar }: { sichtbar: boolean }) {
  const [wert, setWert] = useState<string | null>(null);
  const [status, setStatus] = useState<"laedt" | "ok" | "offline">("laedt");

  useEffect(() => {
    const sb = getSupabaseClient();
    if (!sb || !navigator.onLine) { setStatus("offline"); return; }
    sb.from("scan_einstellung").select("wert").eq("schluessel", "foto_pflicht").maybeSingle()
      .then(({ data, error }) => {
        if (error) { setStatus("offline"); return; }
        setWert(data?.wert ?? "aus"); setStatus("ok");
      });
  }, []);

  const setze = async (neu: string) => {
    const sb = getSupabaseClient();
    if (!sb) return;
    const alt = wert;
    setWert(neu); // optimistisch
    const { error } = await sb.from("scan_einstellung")
      .upsert({ schluessel: "foto_pflicht", wert: neu }, { onConflict: "schluessel" });
    if (error) { setWert(alt); setStatus("offline"); }
  };

  if (!sichtbar) return null;
  const OPTIONEN: [string, string, string][] = [
    ["aus", "Aus", "kein Hinweis"],
    ["hinweis", "Hinweis", "App erinnert ans Zählerfoto"],
    ["pflicht", "Pflicht", "ohne Foto kein Speichern"],
  ];
  return (
    <section className="card">
      <div className="card-head"><h2>Torrek Scan (Feld-App)</h2>
        {status === "ok" && <span className="chip chip-live">verbunden</span>}
      </div>
      {status === "offline" ? (
        <p className="muted small">Server gerade nicht erreichbar — die Einstellung braucht eine Online-Verbindung.</p>
      ) : status === "laedt" ? (
        <p className="muted small">Lade Einstellung …</p>
      ) : (
        <>
          <p className="muted small">Zählerfoto beim Erfassen (gilt für alle Monteure der Feld-App):</p>
          <div className="segmented" style={{ display: "flex" }}>
            {OPTIONEN.map(([w, label]) => (
              <button key={w} type="button" className={wert === w ? "seg active" : "seg"} onClick={() => void setze(w)}>{label}</button>
            ))}
          </div>
          <p className="muted small" style={{ marginBottom: 0 }}>{OPTIONEN.find(([w]) => w === wert)?.[2]}</p>
        </>
      )}
    </section>
  );
}

// Firmendaten für den Dokumentkopf (plancraft-Analyse 22.07.: Unternehmensdetails/
// Briefpapier). Erscheinen im KVA — ohne sie ist ein Angebot nicht versandfähig.
// Schlüssel/Wert in firmen_einstellung (synct wie alles andere), Pflege nur Admin/GF.
const FIRMA_FELDER: [string, string, string][] = [
  ["firma_name", "Firmenname", "z. B. Mustermann Trocknungstechnik GmbH"],
  ["firma_adresse", "Adresse", "Straße Nr., PLZ Ort"],
  ["firma_telefon", "Telefon", "z. B. 040 123456"],
  ["firma_email", "E-Mail", "info@firma.de"],
  ["firma_ustid", "USt-IdNr. / Steuernummer", "DE …"],
];

function FirmendatenCard({ sichtbar }: { sichtbar: boolean }) {
  const db = useDB();
  const [werte, setWerte] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIRMA_FELDER.map(([s]) => [s, db.firmen_einstellung.find((f) => f.schluessel === s)?.wert ?? ""])));
  const [gespeichert, setGespeichert] = useState(false);
  if (!sichtbar) return null;
  const speichern = () => {
    for (const [s] of FIRMA_FELDER) store.setFirmenEinstellung(s, (werte[s] ?? "").trim());
    setGespeichert(true);
    setTimeout(() => setGespeichert(false), 2500);
  };
  return (
    <section className="card">
      <div className="card-head"><h2>Firmendaten (Dokumentkopf)</h2>
        {gespeichert && <span className="chip chip-live">gespeichert</span>}
      </div>
      <p className="muted small">Erscheinen im Kopf des Kostenvoranschlags (KVA). Nur Admin/GF kann sie ändern.</p>
      {FIRMA_FELDER.map(([s, label, platzhalter]) => (
        <label key={s} className="field"><span>{label}</span>
          <input value={werte[s] ?? ""} placeholder={platzhalter}
            onChange={(e) => setWerte((w) => ({ ...w, [s]: e.target.value }))} />
        </label>
      ))}
      <button className="btn btn-primary" onClick={speichern}>Firmendaten speichern</button>
    </section>
  );
}

// Rollen-Verwaltung (FR-ROLE-002): nur für Rollen mit mitarbeiterVerwalten (Admin/GF).
// Die Rolle steuert die Berechtigungen (Rollen-Rechte-Matrix, 04 · Rollenmodell) —
// z. B. wer Bestellstatus ändern oder Projekte bearbeiten darf.
function MitarbeiterCard({ sichtbar }: { sichtbar: boolean }) {
  const db = useDB();
  const [fehler, setFehler] = useState<string | null>(null);
  if (!sichtbar) return null;
  return (
    <section className="card">
      <div className="card-head"><h2>Mitarbeiter & Rollen</h2></div>
      <p className="muted small">Die Rolle bestimmt die Berechtigungen (z. B. Bestellstatus = Büro). Nur Admin/GF kann Rollen ändern.</p>
      {db.benutzer.map((b) => (
        <div key={b.id} className="listrow static" style={{ marginBottom: 8 }}>
          <div className="listrow-main">
            <span className="listrow-title">{b.name}</span>
            <span className="listrow-sub">{b.microsoft_account_id}</span>
          </div>
          <select
            value={b.rolle} aria-label={`Rolle von ${b.name}`} style={{ width: "auto" }}
            onChange={(e) => {
              setFehler(null);
              const res = store.setBenutzerRolle(b.id, e.target.value as typeof b.rolle);
              if (!res.ok) setFehler(res.error ?? "Fehler");
            }}
          >
            {(Object.keys(ROLLEN_LABEL) as (typeof b.rolle)[]).map((r) => <option key={r} value={r}>{ROLLEN_LABEL[r]}</option>)}
          </select>
        </div>
      ))}
      {fehler && <p className="error">{fehler}</p>}
    </section>
  );
}

export function Einstellungen() {
  const db = useDB();
  const { user, can } = useSession();

  const faehigkeiten: [string, boolean][] = [
    ["Geräte scannen/erfassen", can.geraeteScannen],
    ["Bestellstatus ändern (Büro)", can.bestellungenVerwalten],
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

      <ThemeCard />

      <SoundCard />

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

      <FirmendatenCard sichtbar={can.mitarbeiterVerwalten} />

      <MitarbeiterCard sichtbar={can.mitarbeiterVerwalten} />

      <TorrekScanCard sichtbar={can.geraeteStammdatenVerwalten} />

      <section className="card">
        <div className="card-head"><h2>Daten</h2></div>
        <p className="muted small">Alle Daten liegen offline im Browser (Offline-First, 000 Vision). Zum Zurücksetzen auf die Demo-Daten:</p>
        <button className="btn" onClick={() => { if (confirm("Demo-Daten zurücksetzen? Lokale Änderungen gehen verloren.")) store.reset(); }}>Demo-Daten zurücksetzen</button>
      </section>

      <p className="footer-note">Torrek · Umsetzung aus den Notion-Docs (000 Vision → 017 Deployment).</p>
    </div>
  );
}
