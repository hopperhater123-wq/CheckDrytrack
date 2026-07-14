import { useState } from "react";
import { Modal, AnimatePresence } from "../ui/motion";
import { useDB } from "../app/useStore";
import { store } from "../domain/store";
import { fmtDatum } from "../app/format";
import { arbeitszeitMin, minutenZuText } from "../domain/zeit";
import { besuchsberichtHtml, printHtml } from "../domain/report";
import { Icon } from "../ui/Icon";
import { SignaturPad } from "../ui/SignaturPad";

// Besuchsberichte mit Stundennachweis (Alt-System-Analyse 13.07.2026, Backlog ①).
export function BerichteTab({ projektId, userId }: { projektId: string; userId: string }) {
  const db = useDB();
  const [neu, setNeu] = useState(false);
  const projekt = db.projekt.find((p) => p.id === projektId);
  const berichte = db.besuchsbericht
    .filter((b) => b.projekt_id === projektId)
    .sort((a, b) => (a.datum < b.datum ? 1 : -1));
  const benutzerName = (id: string) => db.benutzer.find((u) => u.id === id)?.name ?? "—";

  const gesamt = (berichtId: string) => {
    const min = db.stunden_eintrag
      .filter((s) => s.besuchsbericht_id === berichtId)
      .reduce((sum, s) => sum + (arbeitszeitMin(s.von, s.bis, s.pause_min) ?? 0), 0);
    return minutenZuText(min);
  };

  return (
    <>
      <section className="card">
        <div className="card-head"><h2>Besuchsberichte <span className="count">{berichte.length}</span></h2>
          <button className="btn btn-sm btn-primary" onClick={() => setNeu(true)}>+ Besuchsbericht</button>
        </div>
        {berichte.length === 0 && <p className="muted">Noch kein Besuchsbericht. Nach jedem Baustellen-Besuch anlegen — er ist der Stundennachweis.</p>}
        {berichte.map((b) => {
          const anzahl = db.stunden_eintrag.filter((s) => s.besuchsbericht_id === b.id).length;
          return (
            <div key={b.id} className="listrow static">
              <div className="listrow-main">
                <span className="listrow-title">Besuch am {fmtDatum(b.datum)}</span>
                <span className="listrow-sub">
                  {benutzerName(b.erstellt_von)} · {anzahl} Mitarbeiter · {gesamt(b.id)} h
                  {b.naechster_termin ? ` · nächster Termin ${fmtDatum(b.naechster_termin)}` : ""}
                </span>
              </div>
              <div className="listrow-side">
                {b.unterschrift_kunde && <span className="chip small chip-live"><Icon name="check" size={12} /> unterschrieben</span>}
              </div>
              <button className="btn btn-sm" onClick={() => projekt && printHtml(besuchsberichtHtml(b, projekt, db))}>
                <Icon name="fileText" size={14} /> PDF
              </button>
            </div>
          );
        })}
      </section>

      <AnimatePresence>{neu && <BerichtForm projektId={projektId} userId={userId} onClose={() => setNeu(false)} />}</AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------

interface StundenZeile { mitarbeiter_name: string; gewerk: string; von: string; bis: string; pause: string }
const NEUE_ZEILE: StundenZeile = { mitarbeiter_name: "", gewerk: "Trocknung", von: "08:00", bis: "16:00", pause: "30" };

function BerichtForm({ projektId, userId, onClose }: { projektId: string; userId: string; onClose: () => void }) {
  const db = useDB();
  const ich = db.benutzer.find((u) => u.id === userId);
  const heute = new Date().toISOString().slice(0, 10);
  const [datum, setDatum] = useState(heute);
  const [naechster, setNaechster] = useState("");
  const [km, setKm] = useState("");
  const [bemerkungen, setBemerkungen] = useState("");
  const [arbeiten, setArbeiten] = useState("");
  const [zeilen, setZeilen] = useState<StundenZeile[]>([{ ...NEUE_ZEILE, mitarbeiter_name: ich?.name ?? "" }]);
  const [sigKunde, setSigKunde] = useState<string | null>(null);
  const [sigKundeName, setSigKundeName] = useState("");
  const [sigMitarbeiter, setSigMitarbeiter] = useState<string | null>(null);

  const setZeile = (i: number, patch: Partial<StundenZeile>) =>
    setZeilen((z) => z.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const minuten = (z: StundenZeile) => arbeitszeitMin(z.von, z.bis, parseInt(z.pause, 10) || 0);
  const gesamtMin = zeilen.reduce((s, z) => s + (minuten(z) ?? 0), 0);

  const gueltigeZeilen = zeilen.filter((z) => z.mitarbeiter_name.trim() && minuten(z) !== null);
  const gueltig = datum && arbeiten.trim() && gueltigeZeilen.length > 0;

  const speichern = () => {
    if (!gueltig) return;
    store.addBesuchsbericht({
      projekt_id: projektId, datum, naechster_termin: naechster || null,
      fahrtkilometer: km ? parseFloat(km.replace(",", ".")) : null,
      bemerkungen: bemerkungen.trim() || null, geleistete_arbeiten: arbeiten.trim(),
      stunden: gueltigeZeilen.map((z) => ({
        mitarbeiter_name: z.mitarbeiter_name.trim(), gewerk: z.gewerk.trim() || "Trocknung",
        von: z.von, bis: z.bis, pause_min: parseInt(z.pause, 10) || 0,
      })),
      unterschrift_kunde: sigKunde, unterschrift_kunde_name: sigKunde ? (sigKundeName.trim() || null) : null,
      unterschrift_mitarbeiter: sigMitarbeiter,
      erstellt_von: userId,
    });
    onClose();
  };

  return (
    // Bewusst KEIN Schließen per Backdrop-Klick: ein versehentlicher Tap daneben
    // würde sonst Stunden + Unterschriften verwerfen. Schließen nur über die Buttons.
    <Modal onClose={onClose} dismissable={false}>
        <h2>Besuchsbericht</h2>

        <div className="two-col">
          <label className="field"><span>Besuchsdatum *</span>
            <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
          </label>
          <label className="field"><span>Nächster Termin</span>
            <input type="date" value={naechster} onChange={(e) => setNaechster(e.target.value)} />
          </label>
        </div>
        <label className="field"><span>Fahrtkilometer</span>
          <input inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value)} placeholder="z. B. 24" />
        </label>

        <h3>Stundennachweis</h3>
        {zeilen.map((z, i) => (
          <div key={i} className="stunden-zeile">
            <div className="two-col">
              <input placeholder="Mitarbeiter *" value={z.mitarbeiter_name} onChange={(e) => setZeile(i, { mitarbeiter_name: e.target.value })} />
              <input placeholder="Gewerk" value={z.gewerk} onChange={(e) => setZeile(i, { gewerk: e.target.value })} />
            </div>
            <div className="zeiten-row">
              <input type="time" value={z.von} onChange={(e) => setZeile(i, { von: e.target.value })} />
              <span className="muted">–</span>
              <input type="time" value={z.bis} onChange={(e) => setZeile(i, { bis: e.target.value })} />
              <input className="pause" inputMode="numeric" value={z.pause} onChange={(e) => setZeile(i, { pause: e.target.value })} placeholder="Pause" title="Pause in Minuten" />
              <span className={`zeit-summe${minuten(z) === null ? " t-danger" : ""}`}>
                {minuten(z) !== null ? minutenZuText(minuten(z)!) : "–:–"}
              </span>
              {zeilen.length > 1 && (
                <button className="iconbtn" onClick={() => setZeilen((rows) => rows.filter((_, idx) => idx !== i))} aria-label="Zeile entfernen">
                  <Icon name="x" size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
        <button className="btn btn-sm" onClick={() => setZeilen((rows) => [...rows, { ...NEUE_ZEILE }])}>
          <Icon name="plus" size={14} /> Mitarbeiter
        </button>
        <div className="readout accent" style={{ marginTop: 10 }}>Gesamt: <strong>{minutenZuText(gesamtMin)} h</strong></div>

        <label className="field"><span>Bemerkungen</span>
          <textarea rows={2} value={bemerkungen} onChange={(e) => setBemerkungen(e.target.value)} placeholder="z. B. Absprachen mit dem Kunden…" />
        </label>
        <label className="field"><span>Geleistete Arbeiten *</span>
          <textarea rows={4} value={arbeiten} onChange={(e) => setArbeiten(e.target.value)} placeholder={"z. B.\nFM + TRO Aufbau\nStrömungskontrolle 0,5h"} />
        </label>

        <h3>Unterschriften <span className="muted small">(optional — direkt auf dem Gerät)</span></h3>
        <label className="field"><span>Kunde / Auftraggeber</span>
          <input value={sigKundeName} onChange={(e) => setSigKundeName(e.target.value)} placeholder="Name des Unterzeichnenden" />
        </label>
        <SignaturPad value={sigKunde} onChange={setSigKunde} />
        <label className="field" style={{ marginTop: 14 }}><span>Mitarbeiter ({ich?.name ?? ""})</span></label>
        <SignaturPad value={sigMitarbeiter} onChange={setSigMitarbeiter} />

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={speichern} disabled={!gueltig}>Speichern</button>
        </div>
      </Modal>
  );
}
