import { useState } from "react";
import { useDB } from "../app/useStore";
import { store } from "../domain/store";
import { BAUART_LABEL, MESSANLASS_LABEL, MESSVERFAHREN_LABEL, SCHICHT_TYP_LABEL, WEITERE_BAUTEILE } from "../app/labels";
import { fmtDatum, fmtZahl } from "../app/format";
import { BEWERTUNG_LABEL, GKG_RICHTWERT, absoluteFeuchteGKg, bewerteMessung, type Bewertung } from "../domain/mess";
import { messprotokollHtml, printHtml } from "../domain/report";
import { Icon } from "../ui/Icon";
import type {
  EstrichBauart, Materialdatenbank, Messanlass, MessStatusCheckliste, Messverfahren, Raum, SchichtTyp,
} from "../domain/types";

const SCHICHTEN: SchichtTyp[] = ["oberbelag", "estrich", "daemmung"];

const BEWERTUNG_CHIP: Record<Bewertung, string> = {
  trocken: "chip-live", grenzwertig: "chip-warn", feucht: "chip-danger",
  kontaminiert: "chip-danger", austausch: "chip-danger", offen: "",
};

// Messprotokoll pro Raum: Bodenaufbau (Oberbelag › Estrich › Dämmstoff) + Feuchtemessungen.
export function MessprotokollTab({ projektId, userId }: { projektId: string; userId: string }) {
  const db = useDB();
  const raeume = db.raum.filter((r) => r.projekt_id === projektId);
  const projekt = db.projekt.find((p) => p.id === projektId);

  const exportPdf = () => { if (projekt) printHtml(messprotokollHtml(projekt, db)); };

  if (raeume.length === 0) {
    return <section className="card"><p className="muted">Noch keine Räume erfasst. Räume unter „Übersicht" anlegen.</p></section>;
  }
  return (
    <>
      <div className="screen-head" style={{ alignItems: "center" }}>
        <span className="eyebrow">Feuchtemessung je Raum</span>
        <button className="btn btn-sm" onClick={exportPdf}><Icon name="fileText" size={15} /> Als PDF exportieren</button>
      </div>
      {raeume.map((r) => <RaumMessblock key={r.id} raum={r} userId={userId} />)}
    </>
  );
}

function RaumMessblock({ raum, userId }: { raum: Raum; userId: string }) {
  const db = useDB();
  const [neu, setNeu] = useState(false);
  const materialById = (id: string) => db.materialdatenbank.find((m) => m.id === id);
  const messungen = db.messung
    .filter((m) => m.raum_id === raum.id)
    .sort((a, b) => (a.gemessen_am < b.gemessen_am ? 1 : -1));

  return (
    <section className="card">
      <div className="card-head"><h2>{raum.bezeichnung}</h2>
        <button className="btn btn-sm" onClick={() => setNeu(true)}>+ Messung</button>
      </div>

      <AufbauEditor raum={raum} />

      <h3>Messungen <span className="count">{messungen.length}</span></h3>
      {messungen.length === 0 && <p className="muted small">Noch keine Messung erfasst.</p>}
      {messungen.map((m) => {
        const mat = materialById(m.material_id);
        const b = bewerteMessung(m, mat);
        const gkgFeucht = m.absolute_feuchte_g_kg != null && m.absolute_feuchte_g_kg > GKG_RICHTWERT;
        return (
          <div key={m.id} className="messrow">
            <div className="messrow-head">
              <span className="messrow-mat">{mat?.bezeichnung ?? "?"}</span>
              <span className={`chip small ${BEWERTUNG_CHIP[b.bewertung]}`}>{BEWERTUNG_LABEL[b.bewertung]}</span>
            </div>
            <div className="messrow-meta">
              <span>{MESSANLASS_LABEL[m.anlass]}</span>
              <span>{b.text}{b.praxisrichtwert ? " · Praxisrichtwert" : ""}</span>
              {m.absolute_feuchte_g_kg != null && (
                <span className={gkgFeucht ? "verbrauch-schaetz" : "verbrauch"}>{fmtZahl(m.absolute_feuchte_g_kg)} g/kg</span>
              )}
              <span className="muted">{fmtDatum(m.gemessen_am)}</span>
            </div>
          </div>
        );
      })}

      {neu && <MessungForm raum={raum} userId={userId} onClose={() => setNeu(false)} />}
    </section>
  );
}

// --- Bodenaufbau -----------------------------------------------------------

export function AufbauEditor({ raum }: { raum: Raum }) {
  const db = useDB();
  const schichten = db.bodenaufbau_schicht.filter((s) => s.raum_id === raum.id);
  const schichtVon = (typ: SchichtTyp) => schichten.find((s) => s.schicht_typ === typ);
  const estrich = schichtVon("estrich");

  // Kompletten Stand (Boden + weitere Bauteile) mit einer Änderung neu schreiben.
  const speichern = (aenderung: { typ: SchichtTyp; material_id?: string | null; fussbodenheizung?: boolean; bauart?: EstrichBauart | null }) => {
    const alle: SchichtTyp[] = [...SCHICHTEN, ...WEITERE_BAUTEILE];
    store.setBodenaufbau(raum.id, alle.map((t) => {
      const s = schichtVon(t);
      const istZiel = t === aenderung.typ;
      return {
        schicht_typ: t,
        material_id: istZiel && aenderung.material_id !== undefined ? aenderung.material_id : (s?.material_id ?? null),
        fussbodenheizung: istZiel && aenderung.fussbodenheizung !== undefined ? aenderung.fussbodenheizung : s?.fussbodenheizung,
        bauart: istZiel && aenderung.bauart !== undefined ? aenderung.bauart : s?.bauart,
      };
    }));
  };

  // Bauteile ohne eigenes Material in der Materialdatenbank bekommen einen Freitext-Platzhalter.
  const bauteilMaterial = (typ: SchichtTyp) =>
    db.materialdatenbank.find((m) => m.schicht_typ === typ)?.id ?? db.materialdatenbank.find((m) => m.kategorie === "Bauteil")?.id ?? db.materialdatenbank[0]?.id ?? null;

  return (
    <div className="aufbau">
      <div className="aufbau-title">Bodenaufbau <span className="muted small">(von oben nach unten)</span></div>
      {SCHICHTEN.map((typ, i) => {
        const optionen = db.materialdatenbank.filter((m) => m.schicht_typ === typ);
        return (
          <div key={typ} className="aufbau-row">
            <span className="aufbau-num">{i + 1}</span>
            <span className="aufbau-label">{SCHICHT_TYP_LABEL[typ]}</span>
            <select value={schichtVon(typ)?.material_id ?? ""} onChange={(e) => speichern({ typ, material_id: e.target.value || null })}>
              <option value="">— wählen —</option>
              {optionen.map((m) => <option key={m.id} value={m.id}>{m.bezeichnung}</option>)}
            </select>
          </div>
        );
      })}

      {estrich && (
        <div className="estrich-detail">
          <label className="toggle">
            <input type="checkbox" checked={estrich.fussbodenheizung ?? false}
              onChange={(e) => speichern({ typ: "estrich", fussbodenheizung: e.target.checked })} />
            Fußbodenheizung
          </label>
          <select value={estrich.bauart ?? ""} onChange={(e) => speichern({ typ: "estrich", bauart: (e.target.value || null) as EstrichBauart | null })}>
            <option value="">Bauart wählen…</option>
            {(Object.keys(BAUART_LABEL) as EstrichBauart[]).map((b) => <option key={b} value={b}>{BAUART_LABEL[b]}</option>)}
          </select>
        </div>
      )}

      <div className="aufbau-title" style={{ marginTop: 12 }}>Weitere betroffene Bauteile</div>
      <div className="checkgrid">
        {WEITERE_BAUTEILE.map((typ) => {
          const aktiv = !!schichtVon(typ);
          return (
            <label key={typ} className={`checkchip${aktiv ? " on" : ""}`}>
              <input type="checkbox" checked={aktiv}
                onChange={(e) => speichern({ typ, material_id: e.target.checked ? bauteilMaterial(typ) : null })} />
              {SCHICHT_TYP_LABEL[typ]}
            </label>
          );
        })}
      </div>

      {raum.daemmstoff_status && (
        <p className="muted small" style={{ marginBottom: 0 }}>Dämmstoff-Status: <strong>{raum.daemmstoff_status}</strong> (bestätigt sich erst nach Bohrloch).</p>
      )}
    </div>
  );
}

// --- Messung anlegen -------------------------------------------------------

const LEERE_CHECKLISTE: MessStatusCheckliste = { trocken: false, feucht: false, kontaminiert: false, austausch_erforderlich: false };

function MessungForm({ raum, userId, onClose }: { raum: Raum; userId: string; onClose: () => void }) {
  const db = useDB();
  const [materialId, setMaterialId] = useState(db.materialdatenbank[0]?.id ?? "");
  const [verfahren, setVerfahren] = useState<Messverfahren>("widerstand");
  const [anlass, setAnlass] = useState<Messanlass | "">(""); // Pflicht (FR-MESS-006)
  const [digit, setDigit] = useState("");
  const [referenz, setReferenz] = useState("");
  const [checkliste, setCheckliste] = useState<MessStatusCheckliste>(LEERE_CHECKLISTE);
  const [temp, setTemp] = useState("");
  const [rh, setRh] = useState("");

  const material: Materialdatenbank | undefined = db.materialdatenbank.find((m) => m.id === materialId);
  const modell = material?.bewertungsmodell;

  const num = (s: string) => { const n = parseFloat(s.replace(",", ".")); return Number.isFinite(n) ? n : null; };
  const tempN = num(temp), rhN = num(rh);
  const absVorschau = tempN != null && rhN != null ? absoluteFeuchteGKg(tempN, rhN) : null;

  const gueltig = anlass !== "" && materialId && (
    modell === "digit_grenzwert" ? num(digit) != null :
    modell === "vergleichsmessung" ? num(digit) != null && num(referenz) != null :
    modell === "status_checkliste" ? Object.values(checkliste).some(Boolean) : false
  );

  const speichern = () => {
    if (!gueltig) return; // gueltig ⇒ anlass ist gesetzt (Messanlass), narrowing greift
    store.addMessung({
      raum_id: raum.id, material_id: materialId, messverfahren: verfahren, anlass,
      anzeige_digit: modell === "status_checkliste" ? null : num(digit),
      referenz_digit: modell === "vergleichsmessung" ? num(referenz) : null,
      status_checkliste: modell === "status_checkliste" ? checkliste : null,
      temperatur_c: tempN, rel_luftfeuchte_prozent: rhN, gemessen_von: userId,
    });
    onClose();
  };

  const toggle = (k: keyof MessStatusCheckliste) => setCheckliste((c) => ({ ...c, [k]: !c[k] }));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Messung — {raum.bezeichnung}</h2>

        <label className="field"><span>Material / Bauteil</span>
          <select value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
            {db.materialdatenbank.map((m) => <option key={m.id} value={m.id}>{m.bezeichnung}{m.kategorie ? ` · ${m.kategorie}` : ""}</option>)}
          </select>
        </label>

        <label className="field"><span>Messverfahren</span>
          <select value={verfahren} onChange={(e) => setVerfahren(e.target.value as Messverfahren)}>
            <option value="widerstand">{MESSVERFAHREN_LABEL.widerstand}</option>
            <option value="dielektrisch">{MESSVERFAHREN_LABEL.dielektrisch}</option>
          </select>
        </label>

        <label className="field"><span>Anlass *</span>
          <select value={anlass} onChange={(e) => setAnlass(e.target.value as Messanlass)}>
            <option value="">— wählen (Pflicht) —</option>
            <option value="eingangsmessung">{MESSANLASS_LABEL.eingangsmessung}</option>
            <option value="freimessung">{MESSANLASS_LABEL.freimessung}</option>
          </select>
        </label>

        {/* Bewertungsmodell-abhängige Eingabe (FR-MESS-001) */}
        {modell === "digit_grenzwert" && (
          <label className="field"><span>Anzeige (Digits) — Praxisgrenzwert {material?.praxisgrenzwert_digit ?? "—"}</span>
            <input inputMode="decimal" value={digit} onChange={(e) => setDigit(e.target.value)} placeholder="z. B. 62" />
          </label>
        )}
        {modell === "vergleichsmessung" && (
          <>
            <div className="banner small">Kein fixer Grenzwert für dieses Material — Referenzmessung an trockener Vergleichsstelle (FR-MESS-001).</div>
            <div className="two-col">
              <label className="field"><span>Referenz (trocken)</span>
                <input inputMode="decimal" value={referenz} onChange={(e) => setReferenz(e.target.value)} placeholder="Digits" />
              </label>
              <label className="field"><span>Messstelle</span>
                <input inputMode="decimal" value={digit} onChange={(e) => setDigit(e.target.value)} placeholder="Digits" />
              </label>
            </div>
          </>
        )}
        {modell === "status_checkliste" && (
          <div className="field"><span>Status (Dämmstoff/KMF — keine Digit-Umrechnung möglich)</span>
            <div className="checkgrid">
              {([["trocken", "trocken"], ["feucht", "feucht"], ["kontaminiert", "kontaminiert"], ["austausch_erforderlich", "Austausch erforderlich"]] as const).map(([k, label]) => (
                <label key={k} className={`checkchip${checkliste[k] ? " on" : ""}`}>
                  <input type="checkbox" checked={checkliste[k]} onChange={() => toggle(k)} /> {label}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="two-col">
          <label className="field"><span>Temperatur °C (optional)</span>
            <input inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="z. B. 21" />
          </label>
          <label className="field"><span>rel. Feuchte % (optional)</span>
            <input inputMode="decimal" value={rh} onChange={(e) => setRh(e.target.value)} placeholder="z. B. 55" />
          </label>
        </div>
        {absVorschau != null && (
          <div className={`readout ${absVorschau > GKG_RICHTWERT ? "" : "accent"}`}>
            Absolute Feuchte: <strong>{fmtZahl(absVorschau)} g/kg</strong> — {absVorschau > GKG_RICHTWERT ? "feucht, weiterer Trocknungsbedarf" : "trocken"} (Richtwert ≤ {GKG_RICHTWERT} g/kg)
          </div>
        )}

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={speichern} disabled={!gueltig}>Speichern</button>
        </div>
      </div>
    </div>
  );
}
