import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "../ui/motion";
import { useDB } from "../app/useStore";
import { useSession } from "../app/session";
import { useNav } from "../app/nav";
import { store } from "../domain/store";
import { getSupabaseClient } from "../domain/remote";
import { berechneVerbrauch, istLaufend } from "../domain/einsatz";
import { fmtZahl } from "../app/format";
import { tabelleTeilen } from "../ui/tabelle";
import { Icon } from "../ui/Icon";
import { KorrekturModal } from "./KorrekturModal";
import type { DryTrackDB, Einsatz, Projekt } from "../domain/types";

// „Listen" (PO-Feedback, Vorbild Torrek Scan): EIN Ort für die tägliche Arbeit.
// Je Projekt eine kompakte Liste aller Auf-/Abbauten — Gerätenummer und kWh sind
// direkt antippbar und sofort korrigierbar. Wartende Erfassungen aus der Feld-App
// erscheinen im passenden Projekt („übernehmen" macht daraus echte Einsätze);
// nur nicht zuordenbare Nummern brauchen eine manuelle Projekt-Wahl.

interface ScanZeile {
  local_id: string;
  projektnummer: string;
  mieter: string | null;
  code: string;
  typ_id: string | null;
  modus: "aufbau" | "abbau";
  kwh: number;
  erfasst_am: string;
  standort: string | null;
  notiz: string | null;
  uebernommen_am: string | null;
}

const nurZiffern = (s: string) => s.replace(/\D/g, "");
const wann = (iso: string) => new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

export function ListenScreen() {
  const db = useDB();
  const { user } = useSession();
  const nav = useNav();
  const [korrektur, setKorrektur] = useState<Einsatz | null>(null);
  const [zeigeAlte, setZeigeAlte] = useState(false);
  const [scans, setScans] = useState<ScanZeile[]>([]);
  const [scanFehler, setScanFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<Record<string, string>>({}); // local_id → Fehlertext

  // Wartende Feld-Scans laden (online, still — ohne Netz gibt es einfach keine).
  const ladeScans = () => {
    const sb = getSupabaseClient();
    if (!sb || !navigator.onLine) { setScans([]); return; }
    setScanFehler(null);
    sb.from("scan_erfassung")
      .select("local_id, projektnummer, mieter, code, typ_id, modus, kwh, erfasst_am, standort, notiz, uebernommen_am")
      .is("uebernommen_am", null)
      .order("erfasst_am")
      .then(({ data, error }) => {
        if (error) { setScanFehler(error.message); return; }
        setScans((data ?? []).map((r) => ({ ...r, kwh: Number(r.kwh) })) as ScanZeile[]);
      });
  };
  useEffect(ladeScans, []);

  const projekte = db.projekt
    .filter((p) => (zeigeAlte ? true : !p.storniert && p.status !== "abgeschlossen"))
    .sort((a, b) => (a.angelegt_am < b.angelegt_am ? 1 : -1));

  // Feld-Scans dem Projekt zuordnen (Ziffern der Projektnummern stimmen überein).
  const scansFuer = useMemo(() => {
    const map = new Map<string, ScanZeile[]>();
    for (const s of scans) {
      const p = db.projekt.find((x) => nurZiffern(x.projektnummer) === nurZiffern(s.projektnummer));
      const key = p ? p.id : `?${s.projektnummer}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [scans, db.projekt]);
  const unzuordenbar = [...scansFuer.entries()].filter(([k]) => k.startsWith("?"));

  /** Feld-Scans eines Projekts übernehmen: Aufbau vor Abbau, Fehler je Zeile. */
  const uebernehmen = async (projektId: string, rows: ScanZeile[]) => {
    setLaeuft(projektId);
    const sb = getSupabaseClient();
    const sortiert = [...rows.filter((z) => z.modus === "aufbau"), ...rows.filter((z) => z.modus === "abbau")];
    const neueMeldung: Record<string, string> = {};
    for (const z of sortiert) {
      const notiz = [z.standort, z.notiz].filter(Boolean).join(" · ") || null;
      let fehler: string | null = null;
      if (z.modus === "aufbau") {
        if (!db.geraet.some((g) => g.inventarnummer === z.code)) {
          if (z.typ_id && db.geraetetyp.some((t) => t.id === z.typ_id)) {
            const res = store.addGeraet({ inventarnummer: z.code, geraetetyp_id: z.typ_id });
            if (!res.ok) fehler = res.error ?? "Gerät nicht anlegbar";
          } else fehler = "Gerätetyp unbekannt";
        }
        if (!fehler) {
          const res = store.aufbau({ inventarnummer: z.code, projekt_id: projektId, raum_id: null, zaehlerstand_start: z.kwh, autor_id: user.id, notiz, datum: z.erfasst_am });
          if (!res.ok) fehler = res.error ?? "Fehler";
        }
      } else {
        const einsatz = store.getSnapshot().einsatz.find((e) => e.projekt_id === projektId && e.geraet_inventarnummer === z.code && e.abbau_datum === null);
        if (!einsatz) fehler = "Kein laufender Aufbau zu dieser Nummer";
        else {
          const res = store.abbau({ einsatz_id: einsatz.id, zaehlerstand_ende: z.kwh, autor_id: user.id, notiz, datum: z.erfasst_am });
          if (!res.ok) fehler = res.error ?? "Fehler";
        }
      }
      if (fehler) neueMeldung[z.local_id] = `${z.code}: ${fehler}`;
      else if (sb) await sb.from("scan_erfassung").update({ uebernommen_am: new Date().toISOString() }).eq("local_id", z.local_id);
    }
    setMeldung((alt) => ({ ...alt, ...neueMeldung }));
    setLaeuft(null);
    ladeScans();
  };

  const exportListe = (p: Projekt, einsaetze: Einsatz[]) => {
    const kopf = ["Nr.", "Gerät", "Typ", "Raum", "Aufbau", "Start kWh", "Abbau", "Ende kWh", "Verbrauch kWh"];
    const body = einsaetze.map((e, i) => {
      const g = db.geraet.find((x) => x.inventarnummer === e.geraet_inventarnummer);
      const typ = g ? db.geraetetyp.find((t) => t.id === g.geraetetyp_id) : undefined;
      const v = g ? berechneVerbrauch(e, g, typ) : null;
      return [i + 1, e.geraet_inventarnummer, typ?.bezeichnung,
        e.raum_id ? db.raum.find((r) => r.id === e.raum_id)?.bezeichnung : "",
        new Date(e.aufbau_datum).toLocaleDateString("de-DE"), e.zaehlerstand_start,
        e.abbau_datum ? new Date(e.abbau_datum).toLocaleDateString("de-DE") : "läuft", e.zaehlerstand_ende,
        v && !istLaufend(e) ? Math.round(v.verbrauch) : ""];
    });
    return tabelleTeilen(`Torrek-Liste-${p.projektnummer}.csv`, [kopf, ...body]);
  };

  return (
    <div className="screen">
      <div className="screen-head">
        <h1>Listen</h1>
        <button className="btn btn-sm" onClick={() => nav({ name: "geraete" })}><Icon name="wind" size={15} /> Geräte</button>
      </div>
      <p className="muted small">Auf- und Abbauten je Projekt — Nummer oder kWh antippen zum Korrigieren.</p>
      <label className="toggle"><input type="checkbox" checked={zeigeAlte} onChange={(e) => setZeigeAlte(e.target.checked)} /> Frühere Projekte anzeigen</label>
      {scanFehler && <div className="banner small">Feld-App-Erfassungen gerade nicht abrufbar ({scanFehler}).</div>}

      {projekte.map((p) => {
        const einsaetze = db.einsatz.filter((e) => e.projekt_id === p.id)
          .sort((a, b) => (a.aufbau_datum < b.aufbau_datum ? 1 : -1));
        const wartend = scansFuer.get(p.id) ?? [];
        if (!einsaetze.length && !wartend.length) return null;
        return (
          <section key={p.id} className="card">
            <div className="card-head">
              <h2>{p.projektnummer} <span className="muted">· {p.bezeichnung}</span></h2>
              <div className="btn-row">
                <button className="btn btn-sm" onClick={() => void exportListe(p, einsaetze)} disabled={!einsaetze.length}><Icon name="fileText" size={14} /> Excel</button>
                <button className="btn btn-sm btn-ghost" onClick={() => nav({ name: "projekt", id: p.id })}>Öffnen →</button>
              </div>
            </div>

            {wartend.length > 0 && (
              <div className="banner" style={{ marginBottom: 10 }}>
                <span><strong>{wartend.length}</strong> neue Erfassung{wartend.length > 1 ? "en" : ""} aus der Feld-App
                  {" "}({wartend.map((z) => `${z.code.slice(-4)} ${z.modus === "aufbau" ? "auf" : "ab"}`).join(", ")})</span>
                <button className="btn btn-sm btn-primary" style={{ marginLeft: "auto" }}
                  disabled={laeuft === p.id} onClick={() => void uebernehmen(p.id, wartend)}>
                  {laeuft === p.id ? "Übernehme …" : "Übernehmen"}
                </button>
              </div>
            )}
            {Object.values(meldung).length > 0 && wartend.some((z) => meldung[z.local_id]) && (
              <div className="banner danger small">{wartend.map((z) => meldung[z.local_id]).filter(Boolean).join(" · ")}</div>
            )}

            {einsaetze.map((e) => {
              const g = db.geraet.find((x) => x.inventarnummer === e.geraet_inventarnummer);
              const typ = g ? db.geraetetyp.find((t) => t.id === g.geraetetyp_id) : undefined;
              const v = g ? berechneVerbrauch(e, g, typ) : null;
              return (
                <div key={e.id} className="lz">
                  <button className="lz-nr editierbar" title="Nummer korrigieren" onClick={() => setKorrektur(e)}>
                    {e.geraet_inventarnummer} <Icon name="pen" size={11} />
                  </button>
                  <span className="lz-meta">{wann(e.aufbau_datum)}{e.abbau_datum ? `–${wann(e.abbau_datum)}` : ""} {istLaufend(e) ? <span className="chip chip-live small">läuft</span> : null}</span>
                  <button className="lz-kwh editierbar" title="Zählerstände korrigieren" onClick={() => setKorrektur(e)}>
                    {fmtZahl(e.zaehlerstand_start)}{e.zaehlerstand_ende !== null ? ` → ${fmtZahl(e.zaehlerstand_ende)}` : ""} kWh
                    {v && !istLaufend(e) ? <small className={v.geschaetzt ? "verbrauch-schaetz" : "verbrauch"}> ({fmtZahl(v.verbrauch)})</small> : null}
                    {" "}<Icon name="pen" size={11} />
                  </button>
                </div>
              );
            })}
            {!einsaetze.length && <p className="muted small">Noch keine Einsätze — oben übernehmen oder per Scan aufbauen.</p>}
          </section>
        );
      })}

      {unzuordenbar.map(([key, rows]) => (
        <UnzuordenbareGruppe key={key} projektnummer={key.slice(1)} rows={rows} db={db}
          laeuft={laeuft} meldung={meldung} onUebernehmen={uebernehmen} />
      ))}

      <AnimatePresence>{korrektur && <KorrekturModal einsatz={korrektur} onClose={() => setKorrektur(null)} />}</AnimatePresence>
    </div>
  );
}

// Feld-Scans, deren Projektnummer zu keinem Torrek-Projekt passt: Projekt manuell wählen.
function UnzuordenbareGruppe({ projektnummer, rows, db, laeuft, meldung, onUebernehmen }: {
  projektnummer: string; rows: ScanZeile[]; db: DryTrackDB; laeuft: string | null;
  meldung: Record<string, string>;
  onUebernehmen: (projektId: string, rows: ScanZeile[]) => Promise<void>;
}) {
  const offene = db.projekt.filter((p) => !p.storniert && p.status !== "abgeschlossen");
  const [ziel, setZiel] = useState("");
  return (
    <section className="card">
      <div className="card-head">
        <h2>Feld-App: „{projektnummer}" <span className="chip chip-warn small">kein Torrek-Projekt</span></h2>
      </div>
      <p className="muted small">
        {rows.length} Erfassung{rows.length > 1 ? "en" : ""} ({rows.map((z) => `${z.code} ${z.modus === "aufbau" ? "auf" : "ab"} ${fmtZahl(z.kwh)} kWh`).join(", ")}) — Ziel-Projekt wählen:
      </p>
      {rows.some((z) => meldung[z.local_id]) && (
        <div className="banner danger small">{rows.map((z) => meldung[z.local_id]).filter(Boolean).join(" · ")}</div>
      )}
      <div className="feldscan-ziel">
        <select value={ziel} onChange={(e) => setZiel(e.target.value)} style={{ flex: 1 }}>
          <option value="">— Projekt wählen —</option>
          {offene.map((p) => <option key={p.id} value={p.id}>{p.projektnummer} · {p.bezeichnung}</option>)}
        </select>
        <button className="btn btn-primary" disabled={!ziel || laeuft !== null} onClick={() => void onUebernehmen(ziel, rows)}>
          Übernehmen
        </button>
      </div>
    </section>
  );
}
