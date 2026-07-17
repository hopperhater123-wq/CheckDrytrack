import { useEffect, useMemo, useState } from "react";
import { useDB } from "../app/useStore";
import { useSession } from "../app/session";
import { useNav } from "../app/nav";
import { store } from "../domain/store";
import { getSupabaseClient } from "../domain/remote";
import { fmtZahl } from "../app/format";
import { Icon } from "../ui/Icon";

// Brücke Büro ↔ Feld: Erfassungen aus „Torrek Scan" (Silo scan_erfassung) einsehen
// und kontrolliert als echte Einsätze übernehmen — Gerät wird bei Bedarf angelegt,
// Aufbau/Abbau mit Original-Zeitpunkt und Notiz. Bewusst KEIN Automatismus:
// das Büro wählt das Ziel-Projekt und stößt die Übernahme an. Übernommenes wird
// im Silo markiert (uebernommen_am) und taucht hier nicht mehr als offen auf.

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

type Ergebnis = { ok: boolean; text: string };
const nurZiffern = (s: string) => s.replace(/\D/g, "");

export function FeldScansScreen() {
  const db = useDB();
  const { user } = useSession();
  const nav = useNav();
  const [zeilen, setZeilen] = useState<ScanZeile[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ziel, setZiel] = useState<Record<string, string>>({}); // projektnummer(Scan) → projekt.id
  const [ergebnis, setErgebnis] = useState<Record<string, Ergebnis>>({}); // local_id → Resultat
  const [laeuft, setLaeuft] = useState<string | null>(null);

  const offeneProjekte = db.projekt.filter((p) => !p.storniert && p.status !== "abgeschlossen");

  const laden = () => {
    const sb = getSupabaseClient();
    if (!sb || !navigator.onLine) { setFehler("Feld-Scans brauchen eine Online-Verbindung."); return; }
    setFehler(null);
    sb.from("scan_erfassung")
      .select("local_id, projektnummer, mieter, code, typ_id, modus, kwh, erfasst_am, standort, notiz, uebernommen_am")
      .order("erfasst_am")
      .then(({ data, error }) => {
        if (error) { setFehler(`Feld-Scans nicht lesbar: ${error.message}`); return; }
        setZeilen((data ?? []).map((r) => ({ ...r, kwh: Number(r.kwh) })) as ScanZeile[]);
      });
  };
  useEffect(laden, []);

  // Gruppen je Scan-Projektnummer; Ziel-Projekt vorschlagen, wenn die Ziffern passen.
  const gruppen = useMemo(() => {
    const g = new Map<string, ScanZeile[]>();
    for (const z of zeilen ?? []) {
      if (!g.has(z.projektnummer)) g.set(z.projektnummer, []);
      g.get(z.projektnummer)!.push(z);
    }
    return [...g.entries()];
  }, [zeilen]);

  useEffect(() => {
    if (!zeilen) return;
    setZiel((alt) => {
      const neu = { ...alt };
      for (const [pn] of gruppen) {
        if (neu[pn]) continue;
        const passend = offeneProjekte.find((p) => nurZiffern(p.projektnummer) === nurZiffern(pn));
        neu[pn] = passend?.id ?? "";
      }
      return neu;
    });
    // gruppen/offeneProjekte sind aus zeilen/db abgeleitet — zeilen reicht als Trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zeilen]);

  /** Eine Zeile übernehmen. Reihenfolge stellt der Aufrufer sicher (Aufbau vor Abbau). */
  const uebernehmeZeile = (z: ScanZeile, projektId: string): Ergebnis => {
    const notiz = [z.standort, z.notiz].filter(Boolean).join(" · ") || null;
    if (z.modus === "aufbau") {
      if (!db.geraet.some((g) => g.inventarnummer === z.code)) {
        if (!z.typ_id || !db.geraetetyp.some((t) => t.id === z.typ_id)) {
          return { ok: false, text: "Gerätetyp unbekannt — Gerät zuerst in Torrek anlegen." };
        }
        const res = store.addGeraet({ inventarnummer: z.code, geraetetyp_id: z.typ_id });
        if (!res.ok) return { ok: false, text: res.error ?? "Gerät konnte nicht angelegt werden." };
      }
      const res = store.aufbau({
        inventarnummer: z.code, projekt_id: projektId, raum_id: null,
        zaehlerstand_start: z.kwh, autor_id: user.id, notiz, datum: z.erfasst_am,
      });
      return res.ok ? { ok: true, text: "Aufbau übernommen" } : { ok: false, text: res.error ?? "Fehler" };
    }
    // Abbau: laufenden Einsatz dieses Geräts im Ziel-Projekt finden.
    const einsatz = store.getSnapshot().einsatz.find((e) =>
      e.projekt_id === projektId && e.geraet_inventarnummer === z.code && e.abbau_datum === null);
    if (!einsatz) return { ok: false, text: "Kein laufender Aufbau im Ziel-Projekt — Aufbau zuerst übernehmen." };
    const res = store.abbau({ einsatz_id: einsatz.id, zaehlerstand_ende: z.kwh, autor_id: user.id, notiz, datum: z.erfasst_am });
    return res.ok ? { ok: true, text: "Abbau übernommen" } : { ok: false, text: res.error ?? "Fehler" };
  };

  const uebernehmeGruppe = async (pn: string, rows: ScanZeile[]) => {
    const projektId = ziel[pn];
    if (!projektId) return;
    setLaeuft(pn);
    const sb = getSupabaseClient();
    const offen = rows.filter((z) => !z.uebernommen_am);
    // Aufbau zuerst, dann Abbau — sonst fehlt dem Abbau der Einsatz.
    const sortiert = [...offen.filter((z) => z.modus === "aufbau"), ...offen.filter((z) => z.modus === "abbau")];
    const neu: Record<string, Ergebnis> = {};
    for (const z of sortiert) {
      const r = uebernehmeZeile(z, projektId);
      neu[z.local_id] = r;
      if (r.ok && sb) {
        const { error } = await sb.from("scan_erfassung")
          .update({ uebernommen_am: new Date().toISOString() }).eq("local_id", z.local_id);
        if (!error) z.uebernommen_am = new Date().toISOString();
      }
    }
    setErgebnis((alt) => ({ ...alt, ...neu }));
    setZeilen((alt) => alt ? [...alt] : alt); // markierte uebernommen_am sichtbar machen
    setLaeuft(null);
  };

  return (
    <div className="screen">
      <div className="screen-head">
        <h1>Feld-Scans</h1>
        <button className="btn btn-sm" onClick={laden}><Icon name="scan" size={15} /> Aktualisieren</button>
      </div>
      <p className="muted">
        Erfassungen aus der Feld-App „Torrek Scan" — hier prüfen, Ziel-Projekt wählen und als echte Einsätze übernehmen.
      </p>

      {fehler && <div className="banner danger">{fehler}</div>}
      {!fehler && zeilen === null && <p className="muted">Lade Feld-Scans …</p>}
      {zeilen !== null && gruppen.length === 0 && <p className="muted">Keine Feld-Scans vorhanden.</p>}

      {gruppen.map(([pn, rows]) => {
        const offen = rows.filter((z) => !z.uebernommen_am);
        const mieter = rows.find((z) => z.mieter)?.mieter;
        return (
          <section key={pn} className="card">
            <div className="card-head">
              <h2>Projekt {pn}{mieter ? <span className="muted"> · {mieter}</span> : null}</h2>
              <span className="chip">{offen.length} offen / {rows.length}</span>
            </div>

            <div className="feldscan-ziel">
              <label className="field" style={{ marginBottom: 0, flex: 1 }}>
                <span>Ziel-Projekt in Torrek</span>
                <select value={ziel[pn] ?? ""} onChange={(e) => setZiel((a) => ({ ...a, [pn]: e.target.value }))}>
                  <option value="">— Projekt wählen —</option>
                  {offeneProjekte.map((p) => (
                    <option key={p.id} value={p.id}>{p.projektnummer} · {p.bezeichnung}</option>
                  ))}
                </select>
              </label>
              <button
                className="btn btn-primary"
                disabled={!ziel[pn] || !offen.length || laeuft === pn}
                onClick={() => void uebernehmeGruppe(pn, rows)}
              >
                {laeuft === pn ? "Übernehme …" : `${offen.length} übernehmen`}
              </button>
              {ziel[pn] && (
                <button className="btn btn-ghost" onClick={() => nav({ name: "projekt", id: ziel[pn] })}>Zum Projekt →</button>
              )}
            </div>

            {rows.map((z) => {
              const erg = ergebnis[z.local_id];
              const typ = z.typ_id ? db.geraetetyp.find((t) => t.id === z.typ_id)?.bezeichnung : null;
              return (
                <div key={z.local_id} className="listrow static feldscan-row">
                  <div className="listrow-main">
                    <span className="listrow-title">{z.code}{typ ? <span className="muted small"> · {typ}</span> : null}</span>
                    <span className="listrow-sub">
                      {new Date(z.erfasst_am).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {z.standort ? ` · ${z.standort}` : ""}{z.notiz ? ` · ${z.notiz}` : ""}
                    </span>
                  </div>
                  <div className="listrow-side">
                    <span className={`chip ${z.modus === "abbau" ? "chip-neutral" : ""}`}>{z.modus === "aufbau" ? "Aufbau" : "Abbau"} · {fmtZahl(z.kwh)} kWh</span>
                    {z.uebernommen_am
                      ? <span className="chip chip-live small">übernommen</span>
                      : erg
                        ? <span className={`chip small ${erg.ok ? "chip-live" : "chip-danger"}`}>{erg.text}</span>
                        : <span className="muted small">offen</span>}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
