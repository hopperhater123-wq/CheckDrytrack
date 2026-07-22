import { useRef, useState } from "react";
import { Modal, AnimatePresence } from "../ui/motion";
import { useDB } from "../app/useStore";
import { useSession } from "../app/session";
import { store } from "../domain/store";
import { fmtDatum } from "../app/format";
import { arbeitszeitMin, minutenZuText } from "../domain/zeit";
import { besuchsberichtHtml, abnahmeprotokollHtml, ersatzfliesenberichtHtml, kundenzufriedenheitHtml, notdiensteinsatzberichtHtml, stundenlohnberichtHtml, erstberichtHtml, gefaehrdungsbeurteilungHtml, schadenmeldungHtml, printHtml } from "../domain/report";
import { ABNAHME_STATUS_LABEL, BEMUSTERUNG_ART_LABEL, BESTELLSTATUS_LABEL, GB_BT_TAETIGKEITEN, GB_STOFFE, GB_SCHUTZ } from "../app/labels";
import { komprimiereBild } from "../ui/foto";
import { Icon } from "../ui/Icon";
import { SignaturPad } from "../ui/SignaturPad";
import type { AbnahmeStatus, BemusterungArt, Bestellstatus } from "../domain/types";

// Besuchsberichte mit Stundennachweis (Alt-System-Analyse 13.07.2026, Backlog ①).
export function BerichteTab({ projektId, userId }: { projektId: string; userId: string }) {
  const db = useDB();
  const [neu, setNeu] = useState(false);
  const [neuAbnahme, setNeuAbnahme] = useState(false);
  const projekt = db.projekt.find((p) => p.id === projektId);
  const berichte = db.besuchsbericht
    .filter((b) => b.projekt_id === projektId)
    .sort((a, b) => (a.datum < b.datum ? 1 : -1));
  const abnahmen = db.abnahmeprotokoll
    .filter((a) => a.projekt_id === projektId)
    .sort((a, b) => (a.datum < b.datum ? 1 : -1));
  const [neuEf, setNeuEf] = useState(false);
  const efBerichte = db.ersatzfliesenbericht
    .filter((e) => e.projekt_id === projektId)
    .sort((a, b) => (a.datum < b.datum ? 1 : -1));
  const [neuKz, setNeuKz] = useState(false);
  const kzBerichte = db.kundenzufriedenheit
    .filter((k) => k.projekt_id === projektId)
    .sort((a, b) => (a.datum < b.datum ? 1 : -1));
  const [neuNd, setNeuNd] = useState(false);
  const ndBerichte = db.notdiensteinsatzbericht
    .filter((n) => n.projekt_id === projektId)
    .sort((a, b) => (a.datum < b.datum ? 1 : -1));
  const [neuSl, setNeuSl] = useState(false);
  const slBerichte = db.stundenlohnbericht
    .filter((s) => s.projekt_id === projektId)
    .sort((a, b) => (a.datum < b.datum ? 1 : -1));
  const benutzerName = (id: string) => db.benutzer.find((u) => u.id === id)?.name ?? "—";
  const kzSchnitt = (k: import("../domain/types").Kundenzufriedenheit) =>
    ((k.bewertung_freundlichkeit + k.bewertung_sauberkeit + k.bewertung_termintreue + k.bewertung_qualitaet) / 4).toFixed(1);

  const gesamt = (berichtId: string) => {
    const min = db.stunden_eintrag
      .filter((s) => s.besuchsbericht_id === berichtId)
      .reduce((sum, s) => sum + (arbeitszeitMin(s.von, s.bis, s.pause_min) ?? 0), 0);
    return minutenZuText(min);
  };

  return (
    <>
      <SchadenmeldungCard projektId={projektId} userId={userId} />

      <ErstberichtCard projektId={projektId} userId={userId} />

      <GefaehrdungsbeurteilungCard projektId={projektId} userId={userId} />

      {/* Besuchsberichte und Stundenlohnberichte gehören zusammen (PO 18.07.):
          beides ist Stundennachweis — deshalb EINE Karte mit zwei Bereichen. */}
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

        <div className="card-head" style={{ marginTop: 14 }}>
          <h3 style={{ margin: 0 }}>Stundenlohnberichte <span className="count">{slBerichte.length}</span></h3>
          <button className="btn btn-sm" onClick={() => setNeuSl(true)}>+ Stundenlohn</button>
        </div>
        {slBerichte.length === 0 && <p className="muted small">Regie-/Stundenlohnarbeiten mit Stunden und Material — gehört zum Stundennachweis des Besuchs.</p>}
        {slBerichte.map((s) => {
          const summe = s.stunden.reduce((sum, z) => sum + (Number.isFinite(z.stunden) ? z.stunden : 0), 0);
          return (
            <div key={s.id} className="listrow static">
              <div className="listrow-main">
                <span className="listrow-title">Stundenlohn {fmtDatum(s.datum)} · {summe.toLocaleString("de-DE")} h</span>
                <span className="listrow-sub">{benutzerName(s.erstellt_von)} · {s.material.length} Materialposten</span>
              </div>
              <div className="listrow-side">
                {s.unterschrift_kunde && <span className="chip small chip-live"><Icon name="check" size={12} /> unterschrieben</span>}
              </div>
              <button className="btn btn-sm" onClick={() => projekt && printHtml(stundenlohnberichtHtml(s, projekt, db))}>
                <Icon name="fileText" size={14} /> PDF
              </button>
            </div>
          );
        })}
      </section>

      <section className="card">
        <div className="card-head"><h2>Abnahmeprotokolle <span className="count">{abnahmen.length}</span></h2>
          <button className="btn btn-sm btn-primary" onClick={() => setNeuAbnahme(true)}>+ Abnahme</button>
        </div>
        {abnahmen.length === 0 && <p className="muted">Noch keine Abnahme. Bei Übergabe der Trocknung durch den Kunden abnehmen lassen — mit Unterschrift.</p>}
        {abnahmen.map((a) => (
          <div key={a.id} className="listrow static">
            <div className="listrow-main">
              <span className="listrow-title">Abnahme am {fmtDatum(a.datum)}</span>
              <span className="listrow-sub">{benutzerName(a.erstellt_von)} · {ABNAHME_STATUS_LABEL[a.abnahme_status]}</span>
            </div>
            <div className="listrow-side">
              {a.unterschrift_kunde && <span className="chip small chip-live"><Icon name="check" size={12} /> unterschrieben</span>}
            </div>
            <button className="btn btn-sm" onClick={() => projekt && printHtml(abnahmeprotokollHtml(a, projekt, db))}>
              <Icon name="fileText" size={14} /> PDF
            </button>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="card-head"><h2>Ersatzfliesen · Bemusterung</h2>
          <button className="btn btn-sm btn-primary" onClick={() => setNeuEf(true)}>+ Ersatzfliesenbericht</button>
        </div>
        <BemusterungListe projektId={projektId} />
        {efBerichte.length > 0 && <div className="ef-berichte">
          {efBerichte.map((e) => (
            <div key={e.id} className="listrow static">
              <div className="listrow-main">
                <span className="listrow-title">Ersatzfliesenbericht {fmtDatum(e.datum)}</span>
                <span className="listrow-sub">{benutzerName(e.erstellt_von)}</span>
              </div>
              <div className="listrow-side">
                {e.unterschrift_kunde && <span className="chip small chip-live"><Icon name="check" size={12} /> unterschrieben</span>}
              </div>
              <button className="btn btn-sm" onClick={() => projekt && printHtml(ersatzfliesenberichtHtml(e, projekt, db))}>
                <Icon name="fileText" size={14} /> PDF
              </button>
            </div>
          ))}
        </div>}
      </section>

      <section className="card">
        <div className="card-head"><h2>Kundenzufriedenheit <span className="count">{kzBerichte.length}</span></h2>
          <button className="btn btn-sm btn-primary" onClick={() => setNeuKz(true)}>+ Zufriedenheit</button>
        </div>
        {kzBerichte.length === 0 && <p className="muted">Noch keine Rückmeldung. Zum Projektabschluss die Kundenzufriedenheit erfassen — Bewertung mit Unterschrift.</p>}
        {kzBerichte.map((k) => (
          <div key={k.id} className="listrow static">
            <div className="listrow-main">
              <span className="listrow-title">Bewertung {fmtDatum(k.datum)} · Ø {kzSchnitt(k)}/5</span>
              <span className="listrow-sub">{benutzerName(k.erstellt_von)} · {k.weiterempfehlung ? "empfiehlt weiter" : "keine Empfehlung"}</span>
            </div>
            <div className="listrow-side">
              {k.unterschrift_kunde && <span className="chip small chip-live"><Icon name="check" size={12} /> unterschrieben</span>}
            </div>
            <button className="btn btn-sm" onClick={() => projekt && printHtml(kundenzufriedenheitHtml(k, projekt, db))}>
              <Icon name="fileText" size={14} /> PDF
            </button>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="card-head"><h2>Notdienst-Einsatzberichte <span className="count">{ndBerichte.length}</span></h2>
          <button className="btn btn-sm btn-primary" onClick={() => setNeuNd(true)}>+ Notdienst</button>
        </div>
        {ndBerichte.length === 0 && <p className="muted">Noch kein Notdienst-Bericht. Bei Erstmaßnahme/Notdienst die Sofortmaßnahmen mit Unterschrift dokumentieren.</p>}
        {ndBerichte.map((n) => (
          <div key={n.id} className="listrow static">
            <div className="listrow-main">
              <span className="listrow-title">Notdienst {fmtDatum(n.datum)}</span>
              <span className="listrow-sub">{benutzerName(n.erstellt_von)}{n.ankunft ? ` · Ankunft ${n.ankunft} Uhr` : ""}</span>
            </div>
            <div className="listrow-side">
              {n.unterschrift_kunde && <span className="chip small chip-live"><Icon name="check" size={12} /> unterschrieben</span>}
            </div>
            <button className="btn btn-sm" onClick={() => projekt && printHtml(notdiensteinsatzberichtHtml(n, projekt, db))}>
              <Icon name="fileText" size={14} /> PDF
            </button>
          </div>
        ))}
      </section>

      <AnimatePresence>{neu && <BerichtForm projektId={projektId} userId={userId} onClose={() => setNeu(false)} />}</AnimatePresence>
      <AnimatePresence>{neuAbnahme && <AbnahmeForm projektId={projektId} userId={userId} onClose={() => setNeuAbnahme(false)} />}</AnimatePresence>
      <AnimatePresence>{neuEf && <ErsatzfliesenForm projektId={projektId} userId={userId} onClose={() => setNeuEf(false)} />}</AnimatePresence>
      <AnimatePresence>{neuKz && <KundenzufriedenheitForm projektId={projektId} userId={userId} onClose={() => setNeuKz(false)} />}</AnimatePresence>
      <AnimatePresence>{neuNd && <NotdienstForm projektId={projektId} userId={userId} onClose={() => setNeuNd(false)} />}</AnimatePresence>
      <AnimatePresence>{neuSl && <StundenlohnForm projektId={projektId} userId={userId} onClose={() => setNeuSl(false)} />}</AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------

interface SlStundeZeile { mitarbeiter_name: string; taetigkeit: string; stunden: string }
interface SlMaterialZeile { bezeichnung: string; menge: string; einheit: string }

function StundenlohnForm({ projektId, userId, onClose }: { projektId: string; userId: string; onClose: () => void }) {
  const db = useDB();
  const ich = db.benutzer.find((u) => u.id === userId);
  const heute = new Date().toISOString().slice(0, 10);
  const [datum, setDatum] = useState(heute);
  const [stunden, setStunden] = useState<SlStundeZeile[]>([{ mitarbeiter_name: ich?.name ?? "", taetigkeit: "Regiearbeit", stunden: "1" }]);
  const [material, setMaterial] = useState<SlMaterialZeile[]>([]);
  // Felder aus dem Alt-System-Formular (Frame-Analyse 15.07.2026)
  const [schadenrolle, setSchadenrolle] = useState("");
  const [km, setKm] = useState("");
  const [hinRueck, setHinRueck] = useState(false);
  const [anteilig, setAnteilig] = useState(false);
  const [naechster, setNaechster] = useState("");
  const [bemerkungen, setBemerkungen] = useState("");
  const [sigKunde, setSigKunde] = useState<string | null>(null);
  const [sigKundeName, setSigKundeName] = useState("");
  const [sigMitarbeiter, setSigMitarbeiter] = useState<string | null>(null);

  const zahl = (s: string) => { const n = parseFloat(s.replace(",", ".")); return Number.isFinite(n) ? n : 0; };
  const setStd = (i: number, patch: Partial<SlStundeZeile>) => setStunden((z) => z.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const setMat = (i: number, patch: Partial<SlMaterialZeile>) => setMaterial((z) => z.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const summe = stunden.reduce((s, z) => s + zahl(z.stunden), 0);

  const gueltigeStunden = stunden.filter((z) => z.mitarbeiter_name.trim() && zahl(z.stunden) > 0);
  const gueltig = !!datum && gueltigeStunden.length > 0;

  const speichern = () => {
    if (!gueltig) return;
    const kmZahl = parseFloat(km.replace(",", "."));
    store.addStundenlohnbericht({
      projekt_id: projektId, datum,
      stunden: gueltigeStunden.map((z) => ({ mitarbeiter_name: z.mitarbeiter_name.trim(), taetigkeit: z.taetigkeit.trim() || "Regiearbeit", stunden: zahl(z.stunden) })),
      material: material.filter((m) => m.bezeichnung.trim()).map((m) => ({ bezeichnung: m.bezeichnung.trim(), menge: zahl(m.menge), einheit: m.einheit.trim() || "Stk" })),
      schadenrolle: schadenrolle || null,
      fahrtkilometer: Number.isFinite(kmZahl) ? kmZahl : null,
      hin_und_rueckfahrt: hinRueck, anteilig, naechster_termin: naechster || null,
      bemerkungen: bemerkungen.trim() || null,
      unterschrift_kunde: sigKunde, unterschrift_kunde_name: sigKunde ? (sigKundeName.trim() || null) : null,
      unterschrift_mitarbeiter: sigMitarbeiter, erstellt_von: userId,
    });
    onClose();
  };

  return (
    <Modal onClose={onClose} dismissable={false}>
        <h2>Stundenlohnbericht</h2>
        <p className="muted small">Regie-/Stundenlohnarbeiten mit Stundennachweis und Material.</p>

        <div className="two-col">
          <label className="field"><span>Datum *</span>
            <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
          </label>
          <label className="field"><span>Schadenrolle</span>
            <select value={schadenrolle} onChange={(e) => setSchadenrolle(e.target.value)}>
              <option value="">— nicht ausgewählt —</option>
              {["Leitungswasser", "Rückstau", "Elementar / Hochwasser", "Sturm / Hagel", "Feuer", "Sonstige"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="two-col">
          <label className="field"><span>Fahrtkilometer</span>
            <input inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value)} placeholder="z. B. 24" />
          </label>
          <label className="field"><span>Nächster Termin</span>
            <input type="date" value={naechster} onChange={(e) => setNaechster(e.target.value)} />
          </label>
        </div>
        <div className="btn-row">
          <label className="toggle">
            <input type="checkbox" checked={hinRueck} onChange={(e) => setHinRueck(e.target.checked)} /> Hin- und Rückfahrt
          </label>
          <label className="toggle">
            <input type="checkbox" checked={anteilig} onChange={(e) => setAnteilig(e.target.checked)} /> anteilig
          </label>
        </div>

        <h3>Stundennachweis</h3>
        {stunden.map((z, i) => (
          <div key={i} className="stunden-zeile">
            <div className="two-col">
              <input placeholder="Mitarbeiter *" value={z.mitarbeiter_name} onChange={(e) => setStd(i, { mitarbeiter_name: e.target.value })} />
              <input placeholder="Tätigkeit" value={z.taetigkeit} onChange={(e) => setStd(i, { taetigkeit: e.target.value })} />
            </div>
            <div className="zeiten-row">
              <input className="pause" inputMode="decimal" value={z.stunden} onChange={(e) => setStd(i, { stunden: e.target.value })} placeholder="Std" title="Stunden" />
              <span className="muted small">Stunden</span>
              {stunden.length > 1 && (
                <button className="iconbtn" onClick={() => setStunden((rows) => rows.filter((_, idx) => idx !== i))} aria-label="Zeile entfernen"><Icon name="x" size={15} /></button>
              )}
            </div>
          </div>
        ))}
        <button className="btn btn-sm" onClick={() => setStunden((r) => [...r, { mitarbeiter_name: "", taetigkeit: "Regiearbeit", stunden: "1" }])}><Icon name="plus" size={14} /> Mitarbeiter</button>
        <div className="readout accent" style={{ marginTop: 10 }}>Summe: <strong>{summe.toLocaleString("de-DE")} h</strong></div>

        <h3>Material</h3>
        {material.map((m, i) => (
          <div key={i} className="stunden-zeile">
            <div className="zeiten-row">
              <input style={{ flex: 2 }} placeholder="Material" value={m.bezeichnung} onChange={(e) => setMat(i, { bezeichnung: e.target.value })} />
              <input className="pause" inputMode="decimal" placeholder="Menge" value={m.menge} onChange={(e) => setMat(i, { menge: e.target.value })} />
              <input className="pause" placeholder="Einheit" value={m.einheit} onChange={(e) => setMat(i, { einheit: e.target.value })} />
              <button className="iconbtn" onClick={() => setMaterial((rows) => rows.filter((_, idx) => idx !== i))} aria-label="Zeile entfernen"><Icon name="x" size={15} /></button>
            </div>
          </div>
        ))}
        <button className="btn btn-sm" onClick={() => setMaterial((r) => [...r, { bezeichnung: "", menge: "1", einheit: "Stk" }])}><Icon name="plus" size={14} /> Material</button>

        <label className="field" style={{ marginTop: 12 }}><span>Bemerkungen</span>
          <textarea rows={2} value={bemerkungen} onChange={(e) => setBemerkungen(e.target.value)} placeholder="optional" />
        </label>

        <h3>Unterschriften <span className="muted small">(optional)</span></h3>
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

// ---------------------------------------------------------------------------

function NotdienstForm({ projektId, userId, onClose }: { projektId: string; userId: string; onClose: () => void }) {
  const db = useDB();
  const ich = db.benutzer.find((u) => u.id === userId);
  const heute = new Date().toISOString().slice(0, 10);
  const [datum, setDatum] = useState(heute);
  const [alarmierung, setAlarmierung] = useState("");
  const [ankunft, setAnkunft] = useState("");
  const [schadenursache, setSchadenursache] = useState("");
  const [sofortmassnahmen, setSofortmassnahmen] = useState("");
  const [bemerkungen, setBemerkungen] = useState("");
  const [sigKunde, setSigKunde] = useState<string | null>(null);
  const [sigKundeName, setSigKundeName] = useState("");
  const [sigMitarbeiter, setSigMitarbeiter] = useState<string | null>(null);

  const gueltig = !!datum && sofortmassnahmen.trim().length > 0;

  const speichern = () => {
    if (!gueltig) return;
    store.addNotdiensteinsatzbericht({
      projekt_id: projektId, datum, alarmierung: alarmierung || null, ankunft: ankunft || null,
      schadenursache: schadenursache.trim() || null, sofortmassnahmen: sofortmassnahmen.trim(),
      bemerkungen: bemerkungen.trim() || null,
      unterschrift_kunde: sigKunde, unterschrift_kunde_name: sigKunde ? (sigKundeName.trim() || null) : null,
      unterschrift_mitarbeiter: sigMitarbeiter, erstellt_von: userId,
    });
    onClose();
  };

  return (
    <Modal onClose={onClose} dismissable={false}>
        <h2>Notdienst-Einsatzbericht</h2>
        <p className="muted small">Erstmaßnahme/Notdienst am Objekt dokumentieren.</p>

        <label className="field"><span>Datum *</span>
          <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </label>
        <div className="two-col">
          <label className="field"><span>Alarmierung</span>
            <input type="time" value={alarmierung} onChange={(e) => setAlarmierung(e.target.value)} />
          </label>
          <label className="field"><span>Ankunft</span>
            <input type="time" value={ankunft} onChange={(e) => setAnkunft(e.target.value)} />
          </label>
        </div>
        <label className="field"><span>Schadenursache</span>
          <textarea rows={2} value={schadenursache} onChange={(e) => setSchadenursache(e.target.value)} placeholder="z. B. Rohrbruch unter der Spüle" />
        </label>
        <label className="field"><span>Durchgeführte Sofortmaßnahmen *</span>
          <textarea rows={4} value={sofortmassnahmen} onChange={(e) => setSofortmassnahmen(e.target.value)} placeholder={"z. B.\nWasser abgesperrt\nRestwasser abgesaugt\nErstgeräte aufgebaut"} />
        </label>
        <label className="field"><span>Bemerkungen</span>
          <textarea rows={2} value={bemerkungen} onChange={(e) => setBemerkungen(e.target.value)} placeholder="optional" />
        </label>

        <h3>Unterschriften <span className="muted small">(optional)</span></h3>
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

// ---------------------------------------------------------------------------

// Sterne-Auswahl 1–5 für eine Bewertungsdimension.
function SterneWahl({ wert, onChange }: { wert: number; onChange: (n: number) => void }) {
  return (
    <div className="sterne-wahl" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" className={`stern${n <= wert ? " on" : ""}`} aria-label={`${n} von 5`} aria-checked={n === wert} role="radio" onClick={() => onChange(n)}>★</button>
      ))}
    </div>
  );
}

function KundenzufriedenheitForm({ projektId, userId, onClose }: { projektId: string; userId: string; onClose: () => void }) {
  const db = useDB();
  const heute = new Date().toISOString().slice(0, 10);
  const [datum, setDatum] = useState(heute);
  const [freundlichkeit, setFreundlichkeit] = useState(5);
  const [sauberkeit, setSauberkeit] = useState(5);
  const [termintreue, setTermintreue] = useState(5);
  const [qualitaet, setQualitaet] = useState(5);
  const [weiterempfehlung, setWeiterempfehlung] = useState(true);
  const [kommentar, setKommentar] = useState("");
  const [sigKunde, setSigKunde] = useState<string | null>(null);
  const [sigKundeName, setSigKundeName] = useState("");
  void db;

  const speichern = () => {
    store.addKundenzufriedenheit({
      projekt_id: projektId, datum,
      bewertung_freundlichkeit: freundlichkeit, bewertung_sauberkeit: sauberkeit,
      bewertung_termintreue: termintreue, bewertung_qualitaet: qualitaet,
      weiterempfehlung, kommentar: kommentar.trim() || null,
      unterschrift_kunde: sigKunde, unterschrift_kunde_name: sigKunde ? (sigKundeName.trim() || null) : null,
      erstellt_von: userId,
    });
    onClose();
  };

  return (
    <Modal onClose={onClose} dismissable={false}>
        <h2>Kundenzufriedenheit</h2>
        <p className="muted small">Rückmeldung des Kunden zum Projektabschluss. Bewertung 1–5 Sterne.</p>

        <label className="field"><span>Datum</span>
          <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </label>

        <div className="kz-row"><span>Freundlichkeit / Beratung</span><SterneWahl wert={freundlichkeit} onChange={setFreundlichkeit} /></div>
        <div className="kz-row"><span>Sauberkeit / Ordnung</span><SterneWahl wert={sauberkeit} onChange={setSauberkeit} /></div>
        <div className="kz-row"><span>Termintreue</span><SterneWahl wert={termintreue} onChange={setTermintreue} /></div>
        <div className="kz-row"><span>Arbeitsqualität</span><SterneWahl wert={qualitaet} onChange={setQualitaet} /></div>

        <label className="toggle" style={{ marginTop: 12 }}>
          <input type="checkbox" checked={weiterempfehlung} onChange={(e) => setWeiterempfehlung(e.target.checked)} />
          Würde Torrek weiterempfehlen
        </label>

        <label className="field"><span>Kommentar</span>
          <textarea rows={2} value={kommentar} onChange={(e) => setKommentar(e.target.value)} placeholder="optional" />
        </label>

        <h3>Unterschrift <span className="muted small">(optional)</span></h3>
        <label className="field"><span>Kunde / Auftraggeber</span>
          <input value={sigKundeName} onChange={(e) => setSigKundeName(e.target.value)} placeholder="Name des Unterzeichnenden" />
        </label>
        <SignaturPad value={sigKunde} onChange={setSigKunde} />

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={speichern} disabled={!datum}>Speichern</button>
        </div>
      </Modal>
  );
}

// ---------------------------------------------------------------------------

// Bemusterung: Ersatzmaterial mit Musterfoto erfassen (nutzt Tabelle bemusterung).
const EINLEGER_ARTEN: BemusterungArt[] = ["einleger_keramik", "einleger_edelstahl", "sondereinleger"];
const istEinleger = (a: BemusterungArt) => EINLEGER_ARTEN.includes(a);
// Flächen-Beläge: Menge in m² → Vorschlag aus der betroffenen Raumfläche (Aufmaß).
const BELAG_ARTEN: BemusterungArt[] = ["ersatzfliese", "parkett", "laminat", "vinyl", "teppich"];
const istBelag = (a: BemusterungArt) => BELAG_ARTEN.includes(a);

function BemusterungListe({ projektId }: { projektId: string }) {
  const { can } = useSession();
  const db = useDB();
  const muster = db.bemusterung.filter((m) => m.projekt_id === projektId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [art, setArt] = useState<BemusterungArt>("einleger_keramik");
  const [beschreibung, setBeschreibung] = useState("");
  const [lieferant, setLieferant] = useState("");
  const [menge, setMenge] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);

  // Bohrlöcher im Projekt = Messpunkte mit erfasster Bohrtiefe → Stück-Vorschlag für Einleger.
  const raumIds = new Set(db.raum.filter((r) => r.projekt_id === projektId).map((r) => r.id));
  const bohrloecher = db.messpunkt.filter((mp) => raumIds.has(mp.raum_id) && mp.tiefe_cm != null).length;
  // Aufmaß: Summe der betroffenen Raumflächen → m²-Vorschlag für Flächen-Beläge.
  const flaeche = db.raum.filter((r) => r.projekt_id === projektId).reduce((s, r) => s + (r.betroffene_flaeche_m2 ?? 0), 0);
  const flaecheText = flaeche.toLocaleString("de-DE");

  const fotoWaehlen = async (liste: FileList | null) => {
    if (!liste?.length) return;
    setLaedt(true);
    try { setFoto(await komprimiereBild(liste[0])); } catch { /* ignorieren */ }
    finally { setLaedt(false); if (inputRef.current) inputRef.current.value = ""; }
  };

  // Art wählen: Menge vorschlagen (nur wenn leer) — Einleger aus Bohrlöchern, Beläge aus Raumfläche.
  const waehleArt = (a: BemusterungArt) => {
    setArt(a);
    if (menge.trim()) return;
    if (istEinleger(a) && bohrloecher > 0) setMenge(`${bohrloecher} Stück`);
    else if (istBelag(a) && flaeche > 0) setMenge(`${flaecheText} m²`);
  };

  const hinzufuegen = () => {
    if (!beschreibung.trim()) return;
    store.addBemusterung({ projekt_id: projektId, art, material_beschreibung: beschreibung.trim(), lieferant: lieferant.trim() || null, musterfoto_referenz: foto, menge: menge.trim() || null });
    setArt("einleger_keramik"); setBeschreibung(""); setLieferant(""); setMenge(""); setFoto(null);
  };

  return (
    <div className="bemusterung">
      {muster.length === 0
        ? <p className="muted small">Noch keine Bemusterung. Ersatzmaterial mit Musterfoto, Menge und Lieferant erfassen.</p>
        : <div className="muster-liste">
            {muster.map((m) => (
              <div key={m.id} className="muster-row">
                {m.musterfoto_referenz
                  ? <img className="muster-mini" src={m.musterfoto_referenz} alt="" loading="lazy" />
                  : <span className="muster-mini muster-noimg"><Icon name="layers" size={16} /></span>}
                <div className="muster-main">
                  <div className="muster-titel">{m.material_beschreibung}</div>
                  <div className="muted small">{[BEMUSTERUNG_ART_LABEL[m.art], m.menge, m.lieferant].filter(Boolean).join(" · ")}</div>
                </div>
                {can.bestellungenVerwalten ? (
                  <select className="muster-status" value={m.bestellstatus} aria-label="Bestellstatus"
                    onChange={(e) => store.setBemusterungStatus(m.id, e.target.value as Bestellstatus)}>
                    {(Object.keys(BESTELLSTATUS_LABEL) as Bestellstatus[]).map((s) => <option key={s} value={s}>{BESTELLSTATUS_LABEL[s]}</option>)}
                  </select>
                ) : (
                  <span className="chip chip-neutral" title="Bestellstatus ändert nur das Büro (Disposition/Projektleitung)">{BESTELLSTATUS_LABEL[m.bestellstatus]}</span>
                )}
                <button className="foto-del" onClick={() => store.removeBemusterung(m.id)} aria-label="Bemusterung löschen"><Icon name="trash" size={14} /></button>
              </div>
            ))}
          </div>}

      <div className="bemusterung-add">
        <select value={art} onChange={(e) => waehleArt(e.target.value as BemusterungArt)} aria-label="Art des Materials">
          {(Object.keys(BEMUSTERUNG_ART_LABEL) as BemusterungArt[]).map((a) => <option key={a} value={a}>{BEMUSTERUNG_ART_LABEL[a]}</option>)}
        </select>
        <input placeholder={istEinleger(art) ? "Einleger (z. B. Cera Vogue, Keramik anthrazit)" : "Material (z. B. Feinsteinzeug 60×60, anthrazit)"} value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} />
        <input placeholder={istEinleger(art) ? "Menge (z. B. 14 Stück)" : "Menge (z. B. 18 m² · 12 lfm)"} value={menge} onChange={(e) => setMenge(e.target.value)} />
        {istEinleger(art) && bohrloecher > 0 && (
          <button type="button" className="linkbtn" style={{ alignSelf: "flex-start" }} onClick={() => setMenge(`${bohrloecher} Stück`)}>
            Aus Bohrlöchern übernehmen: {bohrloecher} Stück
          </button>
        )}
        {istBelag(art) && flaeche > 0 && (
          <button type="button" className="linkbtn" style={{ alignSelf: "flex-start" }} onClick={() => setMenge(`${flaecheText} m²`)}>
            Aus Raumflächen übernehmen: {flaecheText} m²
          </button>
        )}
        <input placeholder="Lieferant (optional)" value={lieferant} onChange={(e) => setLieferant(e.target.value)} />
        <input ref={inputRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void fotoWaehlen(e.target.files)} />
        <div className="btn-row">
          <button className="btn btn-sm" disabled={laedt} onClick={() => inputRef.current?.click()}>
            <Icon name="camera" size={15} /> {foto ? "Foto ✓" : laedt ? "…" : "Musterfoto"}
          </button>
          <button className="btn btn-sm btn-primary" disabled={!beschreibung.trim()} onClick={hinzufuegen}><Icon name="plus" size={14} /> Bemusterung</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ErsatzfliesenForm({ projektId, userId, onClose }: { projektId: string; userId: string; onClose: () => void }) {
  const db = useDB();
  const ich = db.benutzer.find((u) => u.id === userId);
  const muster = db.bemusterung.filter((m) => m.projekt_id === projektId);
  const heute = new Date().toISOString().slice(0, 10);
  const [datum, setDatum] = useState(heute);
  const [bemerkungen, setBemerkungen] = useState("");
  const [sigKunde, setSigKunde] = useState<string | null>(null);
  const [sigKundeName, setSigKundeName] = useState("");
  const [sigMitarbeiter, setSigMitarbeiter] = useState<string | null>(null);

  const speichern = () => {
    store.addErsatzfliesenbericht({
      projekt_id: projektId, datum, bemerkungen: bemerkungen.trim() || null,
      unterschrift_kunde: sigKunde, unterschrift_kunde_name: sigKunde ? (sigKundeName.trim() || null) : null,
      unterschrift_mitarbeiter: sigMitarbeiter, erstellt_von: userId,
    });
    onClose();
  };

  return (
    <Modal onClose={onClose} dismissable={false}>
        <h2>Ersatzfliesenbericht</h2>
        <p className="muted small">Bestätigt den mit dem Kunden bemusterten Fliesenersatz. Die Bemusterung ({muster.length} Muster) wird aus dem Projekt übernommen.</p>

        <label className="field"><span>Abnahmedatum *</span>
          <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </label>
        <label className="field"><span>Bemerkungen</span>
          <textarea rows={2} value={bemerkungen} onChange={(e) => setBemerkungen(e.target.value)} placeholder="z. B. Verlegerichtung, Sockelhöhe…" />
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
          <button className="btn btn-primary" onClick={speichern} disabled={!datum}>Speichern</button>
        </div>
      </Modal>
  );
}

// ---------------------------------------------------------------------------

function AbnahmeForm({ projektId, userId, onClose }: { projektId: string; userId: string; onClose: () => void }) {
  const db = useDB();
  const ich = db.benutzer.find((u) => u.id === userId);
  const heute = new Date().toISOString().slice(0, 10);
  const [datum, setDatum] = useState(heute);
  const [status, setStatus] = useState<AbnahmeStatus>("ohne_mangel");
  const [maengel, setMaengel] = useState("");
  const [bemerkungen, setBemerkungen] = useState("");
  const [sigKunde, setSigKunde] = useState<string | null>(null);
  const [sigKundeName, setSigKundeName] = useState("");
  const [sigMitarbeiter, setSigMitarbeiter] = useState<string | null>(null);

  const brauchtMaengel = status !== "ohne_mangel";
  const gueltig = !!datum && (!brauchtMaengel || maengel.trim().length > 0);

  const speichern = () => {
    if (!gueltig) return;
    store.addAbnahmeprotokoll({
      projekt_id: projektId, datum, abnahme_status: status,
      maengel: brauchtMaengel ? maengel.trim() : null,
      bemerkungen: bemerkungen.trim() || null,
      unterschrift_kunde: sigKunde, unterschrift_kunde_name: sigKunde ? (sigKundeName.trim() || null) : null,
      unterschrift_mitarbeiter: sigMitarbeiter,
      erstellt_von: userId,
    });
    onClose();
  };

  const STATUS: AbnahmeStatus[] = ["ohne_mangel", "mit_mangel", "verweigert"];

  return (
    // Kein Schließen per Backdrop: schützt die erfassten Unterschriften vor versehentlichem Verwerfen.
    <Modal onClose={onClose} dismissable={false}>
        <h2>Abnahmeprotokoll</h2>

        <label className="field"><span>Abnahmedatum *</span>
          <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </label>

        <label className="field"><span>Ergebnis der Abnahme *</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as AbnahmeStatus)}>
            {STATUS.map((s) => <option key={s} value={s}>{ABNAHME_STATUS_LABEL[s]}</option>)}
          </select>
        </label>

        {brauchtMaengel && (
          <label className="field"><span>Festgestellte Mängel *</span>
            <textarea rows={3} value={maengel} onChange={(e) => setMaengel(e.target.value)} placeholder="z. B. Fuge im Bad nachzuarbeiten…" />
          </label>
        )}
        <label className="field"><span>Bemerkungen</span>
          <textarea rows={2} value={bemerkungen} onChange={(e) => setBemerkungen(e.target.value)} placeholder="optional" />
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

// ---------------------------------------------------------------------------

interface StundenZeile { mitarbeiter_name: string; gewerk: string; von: string; bis: string; pause: string }
const NEUE_ZEILE: StundenZeile = { mitarbeiter_name: "", gewerk: "Trocknung", von: "08:00", bis: "16:00", pause: "30" };

export function BerichtForm({ projektId, userId, onClose }: { projektId: string; userId: string; onClose: () => void }) {
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

// --- Erstbericht (Alt-System "sprint. Erstbericht", PO-Fotos 22.07.) ---------
// Das Dokument des ERSTEN Besuchs für die Versicherung: Gebäude/Baustoffe,
// Schadenangaben, erforderliche Maßnahmen, Gerätebedarf, Kostenschätzung.
// Ein Bericht je Projekt, bis zur Abgabe editierbar (Upsert).

const EB_VERURSACHUNG = [
  { key: "anwendungsfehler", label: "Anwendungsfehler VN/Mieter" },
  { key: "handwerkerfehler", label: "Handwerkerfehler" },
  { key: "garantie", label: "Garantie" },
  { key: "nachbar", label: "Nachbar" },
];
const EB_ABWASSER = [
  { key: "installationsfehler", label: "Installationsfehler" },
  { key: "verstopfung", label: "Verstopfung" },
  { key: "rueckstau", label: "Rückstau" },
  { key: "muffenversatz", label: "Muffenversatz" },
  { key: "wurzeleinwachs", label: "Wurzeleinwachs" },
];
const EB_MASSNAHMEN = [
  { key: "leckortung", label: "Leckortung" },
  { key: "reparatur", label: "Reparatur" },
  { key: "trocknung", label: "Trocknung" },
  { key: "wiederherstellung", label: "Wiederherstellung" },
];
const EB_GERAETE = [
  { key: "adsorber", label: "Adsorber" },
  { key: "kondensation", label: "Kondensationstrockner" },
  { key: "pumpe", label: "mit/ohne Pumpe" },
  { key: "turbine", label: "Turbine" },
  { key: "kombi", label: "Kombis" },
  { key: "ventilator", label: "Ventilator" },
  { key: "ir_platten", label: "IR-Platten" },
];
const EB_KOSTEN = [
  { key: "leckortung", label: "Leckortung" },
  { key: "installateur", label: "Installateur" },
  { key: "bodenbelaege", label: "Bodenbeläge" },
  { key: "abbruch", label: "Abbrucharbeiten" },
  { key: "trocknung", label: "Trocknung" },
  { key: "maler", label: "Malerarbeiten" },
  { key: "fliesen", label: "Fliesenarbeiten" },
  { key: "trockenbau", label: "Trockenbau/Schreiner" },
  { key: "sonstiges", label: "Sonstiges" },
  { key: "kva", label: "gem. KVA-Angebot" },
];

function ErstberichtCard({ projektId, userId }: { projektId: string; userId: string }) {
  const db = useDB();
  const [offen, setOffen] = useState(false);
  const projekt = db.projekt.find((p) => p.id === projektId);
  const bericht = db.erstbericht.find((e) => e.projekt_id === projektId);
  return (
    <section className="card">
      <div className="card-head"><h2>Erstbericht</h2>
        <div className="btn-row">
          {bericht && projekt && (
            <button className="btn btn-sm" onClick={() => printHtml(erstberichtHtml(bericht, projekt, db))}>
              <Icon name="fileText" size={14} /> PDF
            </button>
          )}
          <button className="btn btn-sm btn-primary" onClick={() => setOffen(true)}>{bericht ? "Bearbeiten" : "+ Erstbericht"}</button>
        </div>
      </div>
      {bericht
        ? <p className="muted small">Erstbericht vom {fmtDatum(bericht.datum)} — Gebäude, Schaden, Maßnahmen, Gerätebedarf, Kostenschätzung.</p>
        : <p className="muted">Der Bericht des ersten Besuchs für die Versicherung: Gebäude/Baustoffe, Schadenangaben, erforderliche Maßnahmen und Kostenschätzung.</p>}
      <AnimatePresence>{offen && <ErstberichtForm projektId={projektId} userId={userId} onClose={() => setOffen(false)} />}</AnimatePresence>
    </section>
  );
}

function ErstberichtForm({ projektId, userId, onClose }: { projektId: string; userId: string; onClose: () => void }) {
  const db = useDB();
  const projekt = db.projekt.find((p) => p.id === projektId);
  const vorhanden = db.erstbericht.find((e) => e.projekt_id === projektId);
  type Werte = Omit<import("../domain/types").Erstbericht, "id" | "projekt_id" | "erstellt_von" | "erstellt_am">;
  // Objektdaten des Projekts als Startwerte — die App weiß schon einiges.
  const [w, setW] = useState<Werte>(() => vorhanden
    ? { ...vorhanden }
    : {
      datum: new Date().toISOString().slice(0, 10),
      baujahr: projekt?.baujahr != null ? String(projekt.baujahr) : null,
      geschosse: projekt?.geschosse != null ? String(projekt.geschosse) : null,
      objekttyp: null, gebaeudedaemmung: null, bauweise: projekt?.bauweise ?? null,
      aussenwand: null, deckenkonstruktion: null, deckenverkleidung: null,
      wandkonstruktion: null, wandaufbau: null, estrichart: null, daemmung_estrich: null,
      gebaeude_sonstiges: null,
      schadenursache: null, massnahmen_getroffen: false, ursache_beseitigt: false,
      anwesende: null, leitungszustand: null, ursache_ort: null, verursachung: [], abwasser: [],
      schaden_sonstiges: null,
      massnahmen: { leckortung: { noetig: false, durch: null }, reparatur: { noetig: false, durch: null }, trocknung: { noetig: true, durch: "wir" }, wiederherstellung: { noetig: false, durch: null } },
      geraete: {}, trocknung_hinweise: null,
      schimmel: false, faekalien: false, desinfektion: false,
      ersatzfliesen_vorhanden: 0, fliesen_zerstoerungsfrei: 0, fliesen_zerstoert: 0,
      weitere_infos: null,
      kosten: {},
    });
  const set = <K extends keyof Werte>(k: K, v: Werte[K]) => setW((x) => ({ ...x, [k]: v }));
  const toggleIn = (k: "verursachung" | "abwasser", key: string) =>
    set(k, w[k].includes(key) ? w[k].filter((x) => x !== key) : [...w[k], key]);
  const num = (s: string) => { const n = parseFloat(s.replace(",", ".")); return Number.isFinite(n) ? n : 0; };
  const summe = EB_KOSTEN.reduce((a, k) => a + (Number(w.kosten[k.key]) || 0), 0);

  const speichern = () => {
    store.upsertErstbericht(projektId, w, userId);
    onClose();
  };

  const txt = (label: string, k: keyof Werte, platz = "") => (
    <label className="field"><span>{label}</span>
      <input value={(w[k] as string | null) ?? ""} onChange={(e) => set(k, (e.target.value || null) as never)} placeholder={platz} />
    </label>
  );

  return (
    <Modal onClose={onClose}>
      <h2>Erstbericht</h2>
      <label className="field"><span>Einsatz am</span>
        <input type="date" value={w.datum} onChange={(e) => set("datum", e.target.value)} />
      </label>

      <h3>Gebäude &amp; Baustoffe im Schadenbereich</h3>
      <div className="two-col">{txt("Baujahr", "baujahr")}{txt("Anzahl Geschosse", "geschosse")}</div>
      <div className="two-col">{txt("Objekttyp", "objekttyp", "z. B. EFH, MFH, Gewerbe")}{txt("Bauweise", "bauweise", "z. B. Massiv")}</div>
      <div className="two-col">{txt("Gebäudedämmung", "gebaeudedaemmung")}{txt("Außenwandkonstruktion", "aussenwand")}</div>
      <div className="two-col">{txt("Deckenkonstruktion", "deckenkonstruktion")}{txt("Deckenverkleidung", "deckenverkleidung")}</div>
      <div className="two-col">{txt("Wandkonstruktion", "wandkonstruktion")}{txt("Wandaufbau", "wandaufbau")}</div>
      <div className="two-col">{txt("Estrichart", "estrichart")}{txt("Dämmung Estrich", "daemmung_estrich")}</div>
      {txt("Sonstige Angaben (z. B. letzte Sanierung im Jahr …)", "gebaeude_sonstiges")}

      <h3>Angaben zum Schaden</h3>
      {txt("Schadenursache", "schadenursache", 'z. B. "Leck an der Küchenzeile"')}
      <label className="toggle"><input type="checkbox" checked={w.massnahmen_getroffen} onChange={(e) => set("massnahmen_getroffen", e.target.checked)} /> Maßnahmen zur Schadensminderung bereits getroffen</label>
      <label className="toggle"><input type="checkbox" checked={w.ursache_beseitigt} onChange={(e) => set("ursache_beseitigt", e.target.checked)} /> Schadenursache bereits beseitigt</label>
      {txt("Anwesende bei Schadenfeststellung", "anwesende", "Name, Vorname …")}
      <label className="field"><span>Zustand der Leitungen (1 = gut … 5 = schlecht)</span>
        <div className="segmented" style={{ display: "flex" }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" className={w.leitungszustand === n ? "seg active" : "seg"} onClick={() => set("leitungszustand", w.leitungszustand === n ? null : n)}>{n}</button>
          ))}
        </div>
      </label>
      <label className="field"><span>Schadenursache liegt …</span>
        <div className="segmented" style={{ display: "flex" }}>
          <button type="button" className={w.ursache_ort === "innerhalb" ? "seg active" : "seg"} onClick={() => set("ursache_ort", w.ursache_ort === "innerhalb" ? null : "innerhalb")}>innerhalb des Gebäudes</button>
          <button type="button" className={w.ursache_ort === "ausserhalb" ? "seg active" : "seg"} onClick={() => set("ursache_ort", w.ursache_ort === "ausserhalb" ? null : "ausserhalb")}>außerhalb</button>
        </div>
      </label>
      <div className="field"><span>Verursachung durch</span>
        <div className="checkgrid" style={{ marginTop: 4 }}>
          {EB_VERURSACHUNG.map((o) => (
            <label key={o.key} className={`checkchip${w.verursachung.includes(o.key) ? " on" : ""}`}>
              <input type="checkbox" checked={w.verursachung.includes(o.key)} onChange={() => toggleIn("verursachung", o.key)} />{o.label}
            </label>
          ))}
        </div>
      </div>
      <div className="field"><span>Abwasserschaden durch</span>
        <div className="checkgrid" style={{ marginTop: 4 }}>
          {EB_ABWASSER.map((o) => (
            <label key={o.key} className={`checkchip${w.abwasser.includes(o.key) ? " on" : ""}`}>
              <input type="checkbox" checked={w.abwasser.includes(o.key)} onChange={() => toggleIn("abwasser", o.key)} />{o.label}
            </label>
          ))}
        </div>
      </div>
      {txt("Sonstiges / Bemerkung", "schaden_sonstiges")}

      <h3>Erforderliche Maßnahmen</h3>
      {EB_MASSNAHMEN.map((m) => {
        const e = w.massnahmen[m.key] ?? { noetig: false, durch: null };
        return (
          <div key={m.key} className="two-col" style={{ alignItems: "center" }}>
            <label className="toggle" style={{ margin: 0 }}>
              <input type="checkbox" checked={e.noetig} onChange={(ev) => set("massnahmen", { ...w.massnahmen, [m.key]: { ...e, noetig: ev.target.checked } })} /> {m.label}
            </label>
            <select value={e.durch ?? ""} disabled={!e.noetig}
              onChange={(ev) => set("massnahmen", { ...w.massnahmen, [m.key]: { ...e, durch: (ev.target.value || null) as never } })}>
              <option value="">— Ausführung durch —</option>
              <option value="wir">uns</option>
              <option value="andere_firma">andere Firma</option>
              <option value="vn_eigenleistung">VN (Eigenleistung)</option>
            </select>
          </div>
        );
      })}

      <h3>Gerätebedarf (Stück)</h3>
      {EB_GERAETE.map((g) => (
        <div key={g.key} className="two-col" style={{ alignItems: "center" }}>
          <span className="muted small">{g.label}</span>
          <input inputMode="numeric" value={w.geraete[g.key] ?? ""} placeholder="0"
            onChange={(e) => set("geraete", { ...w.geraete, [g.key]: Math.max(0, Math.round(num(e.target.value))) })} />
        </div>
      ))}
      {txt("Ergänzende Angaben zur Trocknung", "trocknung_hinweise")}

      <h3>Sonstige Angaben</h3>
      <label className="toggle"><input type="checkbox" checked={w.schimmel} onChange={(e) => set("schimmel", e.target.checked)} /> Schimmelpilzbefall</label>
      <label className="toggle"><input type="checkbox" checked={w.faekalien} onChange={(e) => set("faekalien", e.target.checked)} /> Fäkalien</label>
      <label className="toggle"><input type="checkbox" checked={w.desinfektion} onChange={(e) => set("desinfektion", e.target.checked)} /> Desinfektion erforderlich</label>
      <div className="two-col">
        <label className="field"><span>Ersatzfliesen vorhanden (Stück)</span>
          <input inputMode="numeric" value={w.ersatzfliesen_vorhanden || ""} placeholder="0" onChange={(e) => set("ersatzfliesen_vorhanden", Math.max(0, Math.round(num(e.target.value))))} /></label>
        <label className="field"><span>Fliesen zerstörungsfrei entfernt</span>
          <input inputMode="numeric" value={w.fliesen_zerstoerungsfrei || ""} placeholder="0" onChange={(e) => set("fliesen_zerstoerungsfrei", Math.max(0, Math.round(num(e.target.value))))} /></label>
      </div>
      <label className="field"><span>Fliesen zerstört (Stück)</span>
        <input inputMode="numeric" value={w.fliesen_zerstoert || ""} placeholder="0" onChange={(e) => set("fliesen_zerstoert", Math.max(0, Math.round(num(e.target.value))))} /></label>
      {txt("Weitere Infos", "weitere_infos")}

      <h3>Kostenschätzung (überschlägig, kein Angebot)</h3>
      {EB_KOSTEN.map((k) => (
        <div key={k.key} className="two-col" style={{ alignItems: "center" }}>
          <span className="muted small">{k.label}</span>
          <input inputMode="decimal" value={w.kosten[k.key] ?? ""} placeholder="0,00 €"
            onChange={(e) => set("kosten", { ...w.kosten, [k.key]: num(e.target.value) })} />
        </div>
      ))}
      <p style={{ fontWeight: 700 }}>Gesamtsumme: {summe.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</p>

      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Abbrechen</button>
        <button className="btn btn-primary" onClick={speichern}>Speichern</button>
      </div>
    </Modal>
  );
}

// --- Ergänzende Gefährdungsbeurteilung (Alt-System sprint., PO-Fotos 22.07.) --
// Arbeitsschutz je Projekt: Asbest (TRGS 519), KMF, sonstige Gefährdungen,
// Neubewertungen. Speichern setzt das Projekt-Flag „GB abgeschlossen".

function GefaehrdungsbeurteilungCard({ projektId, userId }: { projektId: string; userId: string }) {
  const db = useDB();
  const [offen, setOffen] = useState(false);
  const projekt = db.projekt.find((p) => p.id === projektId);
  const gb = db.gefaehrdungsbeurteilung.find((g) => g.projekt_id === projektId);
  return (
    <section className="card">
      <div className="card-head"><h2>Gefährdungsbeurteilung</h2>
        <div className="btn-row">
          {gb && projekt && (
            <button className="btn btn-sm" onClick={() => printHtml(gefaehrdungsbeurteilungHtml(gb, projekt, db))}>
              <Icon name="fileText" size={14} /> PDF
            </button>
          )}
          <button className="btn btn-sm btn-primary" onClick={() => setOffen(true)}>{gb ? "Bearbeiten" : "+ Gefährdungsbeurteilung"}</button>
        </div>
      </div>
      {gb
        ? <p className="muted small">Ergänzende Gefährdungsbeurteilung vom {fmtDatum(gb.datum)}{gb.neubewertungen?.length ? ` · ${gb.neubewertungen.length} Neubewertung(en)` : ""} — Asbest: {gb.asbest ?? "—"}.</p>
        : <p className="muted">Arbeitsschutz vor dem ersten Eingriff: Asbest (TRGS 519), KMF, Absturz, enge Räume, Spannungsfreiheit. Speichern setzt „Gefährdungsbeurteilung abgeschlossen" am Projekt.</p>}
      <AnimatePresence>{offen && <GbForm projektId={projektId} userId={userId} onClose={() => setOffen(false)} />}</AnimatePresence>
    </section>
  );
}

function GbChecks({ titel, alle, aktiv, onToggle }: { titel: string; alle: { key: string; label: string }[]; aktiv: string[]; onToggle: (k: string) => void }) {
  return (
    <div className="field"><span>{titel}</span>
      <div className="checkgrid" style={{ marginTop: 4 }}>
        {alle.map((o) => (
          <label key={o.key} className={`checkchip${aktiv.includes(o.key) ? " on" : ""}`}>
            <input type="checkbox" checked={aktiv.includes(o.key)} onChange={() => onToggle(o.key)} />{o.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function GbBefund({ wert, onChange }: { wert: import("../domain/types").GefahrBefund | null; onChange: (b: import("../domain/types").GefahrBefund | null) => void }) {
  return (
    <div className="segmented" style={{ display: "flex" }}>
      {(["ja", "nein", "verdacht"] as const).map((b) => (
        <button key={b} type="button" className={wert === b ? "seg active" : "seg"} onClick={() => onChange(wert === b ? null : b)}>
          {b === "ja" ? "Ja" : b === "nein" ? "Nein" : "Verdacht"}
        </button>
      ))}
    </div>
  );
}

function GbForm({ projektId, userId, onClose }: { projektId: string; userId: string; onClose: () => void }) {
  const db = useDB();
  const projekt = db.projekt.find((p) => p.id === projektId);
  const vorhanden = db.gefaehrdungsbeurteilung.find((g) => g.projekt_id === projektId);
  const benutzer = db.benutzer.find((b) => b.id === userId);
  type Werte = Omit<import("../domain/types").Gefaehrdungsbeurteilung, "id" | "projekt_id" | "erstellt_von" | "erstellt_am">;
  const [w, setW] = useState<Werte>(() => vorhanden ? { ...vorhanden } : {
    datum: new Date().toISOString().slice(0, 10),
    autor: benutzer?.name ?? null, bauleiter: null,
    anmerkungen: "Trocknung und Sanierung nach Wasserschaden",
    baujahr: projekt?.baujahr != null ? String(projekt.baujahr) : null,
    asbest: null, aufsicht_person: null, arbeitsbereich: null,
    bt_taetigkeiten: [], stoffe: [], stoffe_sonstiges: null, schutz: [], schutz_sonstiges: null,
    kmf: null, kmf_wo: null, kmf_schutz: null,
    absturz: false, absturz_wo: null, absturz_schutz: null,
    enge_raeume: false, enge_wo: null, enge_schutz: null,
    spannung_frei: false, prcds: false, spannung_schutz: null,
    neubewertungen: [],
  });
  const set = <K extends keyof Werte>(k: K, v: Werte[K]) => setW((x) => ({ ...x, [k]: v }));
  const toggleIn = (k: "bt_taetigkeiten" | "stoffe" | "schutz", key: string) =>
    set(k, w[k].includes(key) ? w[k].filter((x) => x !== key) : [...w[k], key]);
  const txt = (label: string, k: keyof Werte, platz = "") => (
    <label className="field"><span>{label}</span>
      <input value={(w[k] as string | null) ?? ""} onChange={(e) => set(k, (e.target.value || null) as never)} placeholder={platz} />
    </label>
  );
  const nbAendern = (i: number, patch: Partial<import("../domain/types").GbNeubewertung>) =>
    set("neubewertungen", w.neubewertungen.map((n, j) => (j === i ? { ...n, ...patch } : n)));
  const nbToggle = (i: number, k: "bt_taetigkeiten" | "stoffe" | "schutz", key: string) => {
    const n = w.neubewertungen[i];
    nbAendern(i, { [k]: n[k].includes(key) ? n[k].filter((x) => x !== key) : [...n[k], key] } as never);
  };

  const speichern = () => {
    store.upsertGefaehrdungsbeurteilung(projektId, w, userId);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <h2>Ergänzende Gefährdungsbeurteilung</h2>
      <div className="two-col">
        <label className="field"><span>Datum (Ersteintrag)</span>
          <input type="date" value={w.datum} onChange={(e) => set("datum", e.target.value)} /></label>
        {txt("Autor", "autor")}
      </div>
      <div className="two-col">{txt("Weisungsbefugter Bauleiter", "bauleiter")}{txt("Baujahr des Objektes", "baujahr")}</div>
      {txt("Anmerkungen zum Objekt", "anmerkungen")}

      <h3>Asbest (TRGS 519)</h3>
      <p className="muted small">Arbeiten an asbesthaltigen Materialien nur mit Arbeitsplan gemäß Anlage 1.4 der TRGS 519; ggf. Anzeige an die Behörde.</p>
      <label className="field"><span>Liegt im zu sanierenden Bereich Asbest vor?</span>
        <GbBefund wert={w.asbest} onChange={(b) => set("asbest", b)} />
      </label>
      <div className="two-col">{txt("Aufsichtsführende Person", "aufsicht_person")}{txt("Arbeitsbereich für die Sanierungstätigkeiten", "arbeitsbereich")}</div>
      <GbChecks titel="Beschreibung der Tätigkeiten" alle={GB_BT_TAETIGKEITEN} aktiv={w.bt_taetigkeiten} onToggle={(k) => toggleIn("bt_taetigkeiten", k)} />
      <GbChecks titel="Tätigkeiten an potentiell asbesthaltigen Stoffen" alle={GB_STOFFE} aktiv={w.stoffe} onToggle={(k) => toggleIn("stoffe", k)} />
      {txt("Sonstiges (Stoffe)", "stoffe_sonstiges", "z. B. Gebäude, Putz, Kleber, Spachtelmassen ggf. Bodenbelag")}
      <GbChecks titel="Schutzmaßnahmen" alle={GB_SCHUTZ} aktiv={w.schutz} onToggle={(k) => toggleIn("schutz", k)} />
      {txt("Sonstiges (Schutzmaßnahmen)", "schutz_sonstiges")}

      <h3>KMF — künstliche Mineralfasern (TRGS 521)</h3>
      <label className="field"><span>Liegen KMF vor?</span>
        <GbBefund wert={w.kmf} onChange={(b) => set("kmf", b)} />
      </label>
      <div className="two-col">{txt("Wo?", "kmf_wo")}{txt("Schutzmaßnahmen", "kmf_schutz")}</div>

      <h3>Sonstige Gefährdungen</h3>
      <label className="toggle"><input type="checkbox" checked={w.absturz} onChange={(e) => set("absturz", e.target.checked)} /> Absturz / Einsturz (TRBS 2121)</label>
      {w.absturz && <div className="two-col">{txt("Wo?", "absturz_wo")}{txt("Schutzmaßnahmen", "absturz_schutz")}</div>}
      <label className="toggle"><input type="checkbox" checked={w.enge_raeume} onChange={(e) => set("enge_raeume", e.target.checked)} /> Enge Räume / Behälter (DGUV Regel 113-004)</label>
      {w.enge_raeume && <div className="two-col">{txt("Wo?", "enge_wo")}{txt("Schutzmaßnahmen", "enge_schutz")}</div>}
      <label className="toggle"><input type="checkbox" checked={w.spannung_frei} onChange={(e) => set("spannung_frei", e.target.checked)} /> Spannungsfreiheit hergestellt/geprüft</label>
      <label className="toggle"><input type="checkbox" checked={w.prcds} onChange={(e) => set("prcds", e.target.checked)} /> PRCD-S im Einsatz</label>
      {txt("Schutzmaßnahmen (elektrisch)", "spannung_schutz")}

      <h3>Neubewertungen <span className="count">{w.neubewertungen.length}</span></h3>
      <p className="muted small">Ändert sich die Lage (Befund, neue Tätigkeiten), wird neu bewertet statt überschrieben — der Verlauf bleibt nachvollziehbar.</p>
      {w.neubewertungen.map((n, i) => (
        <div key={i} className="box" style={{ border: "1px solid var(--hairline)", borderRadius: 10, padding: "8px 12px", marginBottom: 10 }}>
          <div className="card-head"><h3 style={{ margin: 0 }}>Neubewertung {String(i + 1).padStart(2, "0")}</h3>
            <button className="iconbtn" onClick={() => set("neubewertungen", w.neubewertungen.filter((_, j) => j !== i))} aria-label="Neubewertung entfernen"><Icon name="trash" size={14} /></button>
          </div>
          <div className="two-col">
            <label className="field"><span>Datum</span>
              <input type="date" value={n.datum} onChange={(e) => nbAendern(i, { datum: e.target.value })} /></label>
            <label className="field"><span>Bearbeiter</span>
              <input value={n.bearbeiter} onChange={(e) => nbAendern(i, { bearbeiter: e.target.value })} /></label>
          </div>
          <label className="field"><span>Asbest?</span>
            <GbBefund wert={n.asbest} onChange={(b) => nbAendern(i, { asbest: b })} />
          </label>
          <GbChecks titel="Tätigkeiten" alle={GB_BT_TAETIGKEITEN} aktiv={n.bt_taetigkeiten} onToggle={(k) => nbToggle(i, "bt_taetigkeiten", k)} />
          <GbChecks titel="Stoffe" alle={GB_STOFFE} aktiv={n.stoffe} onToggle={(k) => nbToggle(i, "stoffe", k)} />
          <GbChecks titel="Schutzmaßnahmen" alle={GB_SCHUTZ} aktiv={n.schutz} onToggle={(k) => nbToggle(i, "schutz", k)} />
          <label className="field"><span>Notiz</span>
            <input value={n.notiz ?? ""} onChange={(e) => nbAendern(i, { notiz: e.target.value || null })} /></label>
        </div>
      ))}
      <button className="btn btn-sm" onClick={() => set("neubewertungen", [...w.neubewertungen, {
        datum: new Date().toISOString().slice(0, 10), bearbeiter: benutzer?.name ?? "", asbest: null,
        bt_taetigkeiten: [], stoffe: [], schutz: [], notiz: null,
      }])}><Icon name="plus" size={14} /> Neubewertung</button>

      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Abbrechen</button>
        <button className="btn btn-primary" onClick={speichern}>Speichern</button>
      </div>
    </Modal>
  );
}

// --- Schadenmeldung (GWG-/Wohnungswirtschafts-Vorlage, PO-Fotos 22.07.) -------
// Der Meldeweg VOR dem Erstbericht: wer hat wann was gemeldet, welche Wohnung
// verursacht, welche sind geschädigt. Eine je Projekt (Upsert).

const LEERE_WOHNUNG: import("../domain/types").SmWohnung = { nr: "", lage: "", mieter: "", telefon: "" };

function SchadenmeldungCard({ projektId, userId }: { projektId: string; userId: string }) {
  const db = useDB();
  const [offen, setOffen] = useState(false);
  const projekt = db.projekt.find((p) => p.id === projektId);
  const sm = db.schadenmeldung.find((s) => s.projekt_id === projektId);
  return (
    <section className="card">
      <div className="card-head"><h2>Schadenmeldung</h2>
        <div className="btn-row">
          {sm && projekt && (
            <button className="btn btn-sm" onClick={() => printHtml(schadenmeldungHtml(sm, projekt, db))}>
              <Icon name="fileText" size={14} /> PDF
            </button>
          )}
          <button className="btn btn-sm btn-primary" onClick={() => setOffen(true)}>{sm ? "Bearbeiten" : "+ Schadenmeldung"}</button>
        </div>
      </div>
      {sm
        ? <p className="muted small">
            {sm.schadenart ? `${sm.schadenart} · ` : ""}eingetreten {sm.eintritt_datum ? fmtDatum(sm.eintritt_datum) : "—"}
            {sm.geschaedigte_wohnungen?.length ? ` · ${sm.geschaedigte_wohnungen.length} geschädigte Wohnung(en)` : ""}
            {sm.nur_ursache_klaeren ? " · ⚠ nur Ursache klären (Gewährleistung)" : ""}
          </p>
        : <p className="muted">Wie kam der Schaden herein? Hergang, externe Nummern (Schaden-/Vertrags-/Auftragsnummer), verursachende und geschädigte Wohnungen mit Mieter-Kontakten.</p>}
      <AnimatePresence>{offen && <SchadenmeldungForm projektId={projektId} userId={userId} onClose={() => setOffen(false)} />}</AnimatePresence>
    </section>
  );
}

function SmWohnungFelder({ titel, w, onChange, onRemove }: {
  titel: string; w: import("../domain/types").SmWohnung;
  onChange: (w: import("../domain/types").SmWohnung) => void; onRemove?: () => void;
}) {
  return (
    <div style={{ border: "1px solid var(--hairline)", borderRadius: 10, padding: "8px 12px", marginBottom: 8 }}>
      <div className="card-head"><h3 style={{ margin: 0 }}>{titel}</h3>
        {onRemove && <button className="iconbtn" onClick={onRemove} aria-label="Wohnung entfernen"><Icon name="trash" size={14} /></button>}
      </div>
      <div className="two-col">
        <label className="field"><span>Whg-Nr.</span>
          <input value={w.nr} onChange={(e) => onChange({ ...w, nr: e.target.value })} placeholder="z. B. 083" /></label>
        <label className="field"><span>Lage</span>
          <input value={w.lage} onChange={(e) => onChange({ ...w, lage: e.target.value })} placeholder="z. B. 1. OG rechts" /></label>
      </div>
      <div className="two-col">
        <label className="field"><span>Mieter</span>
          <input value={w.mieter} onChange={(e) => onChange({ ...w, mieter: e.target.value })} /></label>
        <label className="field"><span>Telefon</span>
          <input value={w.telefon} onChange={(e) => onChange({ ...w, telefon: e.target.value })} /></label>
      </div>
    </div>
  );
}

function SchadenmeldungForm({ projektId, userId, onClose }: { projektId: string; userId: string; onClose: () => void }) {
  const db = useDB();
  const vorhanden = db.schadenmeldung.find((s) => s.projekt_id === projektId);
  type Werte = Omit<import("../domain/types").Schadenmeldung, "id" | "projekt_id" | "erstellt_von" | "erstellt_am">;
  const [w, setW] = useState<Werte>(() => vorhanden ? { ...vorhanden, verursachende_wohnung: { ...LEERE_WOHNUNG, ...vorhanden.verursachende_wohnung } } : {
    schadenart: null, schadennummer: null, vertragsnummer: null, auftragsnummer: null,
    eintritt_datum: null, gemeldet_am: new Date().toISOString().slice(0, 10), meldeweg: null,
    hergang: null, verursachende_wohnung: { ...LEERE_WOHNUNG }, geschaedigte_wohnungen: [],
    hausrat_info: null, nur_ursache_klaeren: false, sonstiges: null,
  });
  const set = <K extends keyof Werte>(k: K, v: Werte[K]) => setW((x) => ({ ...x, [k]: v }));
  const txt = (label: string, k: keyof Werte, platz = "") => (
    <label className="field"><span>{label}</span>
      <input value={(w[k] as string | null) ?? ""} onChange={(e) => set(k, (e.target.value || null) as never)} placeholder={platz} />
    </label>
  );
  const speichern = () => { store.upsertSchadenmeldung(projektId, w, userId); onClose(); };

  return (
    <Modal onClose={onClose}>
      <h2>Schadenmeldung</h2>
      <div className="two-col">{txt("Schadenart", "schadenart", "z. B. Leitungswasser / Trocknung")}{txt("Schadennummer", "schadennummer")}</div>
      <div className="two-col">{txt("Versicherungsschein-/Vertragsnummer", "vertragsnummer")}{txt("Auftragsnummer (extern)", "auftragsnummer")}</div>
      <div className="two-col">
        <label className="field"><span>Schaden eingetreten am</span>
          <input type="date" value={w.eintritt_datum ?? ""} onChange={(e) => set("eintritt_datum", e.target.value || null)} /></label>
        <label className="field"><span>Gemeldet am</span>
          <input type="date" value={w.gemeldet_am ?? ""} onChange={(e) => set("gemeldet_am", e.target.value || null)} /></label>
      </div>
      {txt("Meldeweg", "meldeweg", 'z. B. "Ticket 64-260629-00359 durch Hausmeister"')}
      <label className="field"><span>Was genau ist passiert / was wurde beschädigt?</span>
        <textarea rows={3} value={w.hergang ?? ""} onChange={(e) => set("hergang", e.target.value || null)}
          placeholder="z. B. Schlauch zur Eiswürfelmaschine geplatzt; Wohnung darunter ebenfalls betroffen." />
      </label>

      <SmWohnungFelder titel="Schaden-verursachende Wohnung" w={w.verursachende_wohnung}
        onChange={(x) => set("verursachende_wohnung", x)} />
      {w.geschaedigte_wohnungen.map((gw, i) => (
        <SmWohnungFelder key={i} titel={`Geschädigte Wohnung ${i + 1}`} w={gw}
          onChange={(x) => set("geschaedigte_wohnungen", w.geschaedigte_wohnungen.map((y, j) => (j === i ? x : y)))}
          onRemove={() => set("geschaedigte_wohnungen", w.geschaedigte_wohnungen.filter((_, j) => j !== i))} />
      ))}
      <button className="btn btn-sm" style={{ marginBottom: 10 }} onClick={() => set("geschaedigte_wohnungen", [...w.geschaedigte_wohnungen, { ...LEERE_WOHNUNG }])}>
        <Icon name="plus" size={14} /> Geschädigte Wohnung
      </button>

      <label className="toggle">
        <input type="checkbox" checked={w.nur_ursache_klaeren} onChange={(e) => set("nur_ursache_klaeren", e.target.checked)} />
        Gewährleistung: vorerst NUR Schadenursache ermitteln und an den Auftraggeber zurückmelden
      </label>
      {txt("Hausrat-/Haftpflichtversicherung der Mieter/Eigentümer", "hausrat_info")}
      {txt("Sonstige Informationen", "sonstiges", "z. B. Aktenzeichen bei Aufnahme durch Polizei")}

      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Abbrechen</button>
        <button className="btn btn-primary" onClick={speichern}>Speichern</button>
      </div>
    </Modal>
  );
}
