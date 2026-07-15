import { useState } from "react";
import { Modal, AnimatePresence } from "../ui/motion";
import { useDB } from "../app/useStore";
import { store } from "../domain/store";
import { BAUART_LABEL, MESSANLASS_LABEL, MESSVERFAHREN_LABEL, SCHICHT_TYP_LABEL, WEITERE_BAUTEILE } from "../app/labels";
import { fmtDatum, fmtZahl } from "../app/format";
import { BEWERTUNG_LABEL, GKG_RICHTWERT, absoluteFeuchteGKg, bewerteMessung, type Bewertung } from "../domain/mess";
import { messprotokollHtml, printHtml } from "../domain/report";
import { Icon } from "../ui/Icon";
import { TrockenMoment } from "../ui/TrockenMoment";
import type {
  EstrichBauart, Materialdatenbank, Messanlass, MessStatusCheckliste, Messung, Messverfahren, Raum, SchichtTyp,
} from "../domain/types";

// Feier-Inhalt des „Objekt trocken"-Moments (Freimessung → trocken).
interface Feier { titel: string; sub?: string }

const SCHICHTEN: SchichtTyp[] = ["oberbelag", "estrich", "daemmung"];

const BEWERTUNG_CHIP: Record<Bewertung, string> = {
  trocken: "chip-live", grenzwertig: "chip-warn", feucht: "chip-danger",
  kontaminiert: "chip-danger", austausch: "chip-danger", offen: "",
};

// Messprotokoll pro Raum: Bodenaufbau (Oberbelag › Estrich › Dämmstoff) + Feuchtemessungen.
export function MessprotokollTab({ projektId, userId }: { projektId: string; userId: string }) {
  const db = useDB();
  const [neuerRaum, setNeuerRaum] = useState("");
  const raeume = db.raum.filter((r) => r.projekt_id === projektId);
  const projekt = db.projekt.find((p) => p.id === projektId);

  const exportPdf = () => { if (projekt) printHtml(messprotokollHtml(projekt, db)); };
  const raumAnlegen = () => {
    if (!neuerRaum.trim()) return;
    store.addRaum(projektId, neuerRaum.trim());
    setNeuerRaum("");
  };

  return (
    <>
      {raeume.length > 0 && (
        <div className="screen-head" style={{ alignItems: "center" }}>
          <span className="eyebrow">Feuchtemessung je Raum</span>
          <button className="btn btn-sm" onClick={exportPdf}><Icon name="fileText" size={15} /> Als PDF exportieren</button>
        </div>
      )}
      {raeume.map((r) => <RaumMessblock key={r.id} raum={r} userId={userId} />)}

      {/* Raum direkt hier anlegen — auch mitten im geführten Besuch, ohne Umweg über die Übersicht. */}
      <section className="card">
        <div className="card-head"><h2>{raeume.length === 0 ? "Ersten Raum anlegen" : "Weiterer Raum"}</h2></div>
        {raeume.length === 0 && <p className="muted small" style={{ marginTop: 0 }}>Noch keine Räume erfasst — jeder Raum bekommt Bodenaufbau und Messungen.</p>}
        <div className="inline-add" style={{ marginTop: raeume.length === 0 ? 0 : undefined }}>
          <input placeholder="z. B. Kinderzimmer" value={neuerRaum} onChange={(e) => setNeuerRaum(e.target.value)} onKeyDown={(e) => e.key === "Enter" && raumAnlegen()} />
          <button className="btn" disabled={!neuerRaum.trim()} onClick={raumAnlegen}>+ Raum</button>
        </div>
      </section>
    </>
  );
}

function RaumMessblock({ raum, userId }: { raum: Raum; userId: string }) {
  const db = useDB();
  const [neu, setNeu] = useState(false);
  const [feier, setFeier] = useState<Feier | null>(null);
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
              <span className="messrow-mat">{mat?.bezeichnung ?? (m.messverfahren === "hygrometer" ? "Raumluft" : "?")}</span>
              <span className={`chip small ${BEWERTUNG_CHIP[b.bewertung]}`}>{BEWERTUNG_LABEL[b.bewertung]}</span>
            </div>
            <div className="messrow-meta">
              <span>{MESSANLASS_LABEL[m.anlass]}</span>
              {m.messverfahren === "hygrometer" && <span>Hygrometer</span>}
              <span>{b.text}{b.praxisrichtwert ? " · Praxisrichtwert" : ""}</span>
              {m.absolute_feuchte_g_kg != null && (
                <span className={gkgFeucht ? "verbrauch-schaetz" : "verbrauch"}>{fmtZahl(m.absolute_feuchte_g_kg)} g/kg</span>
              )}
              {m.stroemung_m_s != null && <span>{fmtZahl(m.stroemung_m_s)} m/s</span>}
              <span className="muted">{fmtDatum(m.gemessen_am)}</span>
            </div>
          </div>
        );
      })}

      <AnimatePresence>{neu && <MessungForm raum={raum} userId={userId} onClose={() => setNeu(false)} onTrocken={setFeier} />}</AnimatePresence>
      <AnimatePresence>{feier && <TrockenMoment titel={feier.titel} sub={feier.sub} onDone={() => setFeier(null)} />}</AnimatePresence>
    </section>
  );
}

// --- Bodenaufbau -----------------------------------------------------------

// Entwurfszustand des Aufbaus: Änderungen werden erst mit „Bodenaufbau speichern" übernommen.
interface AufbauZeile { material_id: string | null; fussbodenheizung: boolean | null; bauart: EstrichBauart | null }
type AufbauEntwurf = Partial<Record<SchichtTyp, AufbauZeile>>;

const ALLE_SCHICHTEN: SchichtTyp[] = [...SCHICHTEN, ...WEITERE_BAUTEILE];

export function AufbauEditor({ raum }: { raum: Raum }) {
  const db = useDB();
  const schichten = db.bodenaufbau_schicht.filter((s) => s.raum_id === raum.id);
  const ausStore = (): AufbauEntwurf => {
    const e: AufbauEntwurf = {};
    for (const s of schichten) e[s.schicht_typ] = { material_id: s.material_id, fussbodenheizung: s.fussbodenheizung, bauart: s.bauart };
    return e;
  };
  const [entwurf, setEntwurf] = useState<AufbauEntwurf>(ausStore);

  const zeile = (t: SchichtTyp): AufbauZeile => entwurf[t] ?? { material_id: null, fussbodenheizung: null, bauart: null };
  const setZeile = (t: SchichtTyp, patch: Partial<AufbauZeile>) =>
    setEntwurf((e) => ({ ...e, [t]: { ...(e[t] ?? { material_id: null, fussbodenheizung: null, bauart: null }), ...patch } }));

  const dirty = ALLE_SCHICHTEN.some((t) => {
    const s = schichten.find((x) => x.schicht_typ === t);
    const z = entwurf[t];
    return (s?.material_id ?? null) !== (z?.material_id ?? null)
      || (s?.fussbodenheizung ?? null) !== (z?.fussbodenheizung ?? null)
      || (s?.bauart ?? null) !== (z?.bauart ?? null);
  });

  const speichern = () => {
    store.setBodenaufbau(raum.id, ALLE_SCHICHTEN.map((t) => {
      const z = entwurf[t];
      return { schicht_typ: t, material_id: z?.material_id ?? null, fussbodenheizung: z?.fussbodenheizung, bauart: z?.bauart };
    }));
  };

  // Bauteile ohne eigenes Material in der Materialdatenbank bekommen einen Freitext-Platzhalter.
  const bauteilMaterial = (typ: SchichtTyp) =>
    db.materialdatenbank.find((m) => m.schicht_typ === typ)?.id ?? db.materialdatenbank.find((m) => m.kategorie === "Bauteil")?.id ?? db.materialdatenbank[0]?.id ?? null;

  const estrich = zeile("estrich");

  return (
    <div className="aufbau">
      <div className="aufbau-title">Bodenaufbau <span className="muted small">(von oben nach unten)</span>
        {dirty && <span className="chip small chip-warn">ungespeichert</span>}
      </div>
      {SCHICHTEN.map((typ, i) => {
        const optionen = db.materialdatenbank.filter((m) => m.schicht_typ === typ);
        return (
          <div key={typ} className="aufbau-row">
            <span className="aufbau-num">{i + 1}</span>
            <span className="aufbau-label">{SCHICHT_TYP_LABEL[typ]}</span>
            <select value={zeile(typ).material_id ?? ""} onChange={(e) => setZeile(typ, { material_id: e.target.value || null })}>
              <option value="">— wählen —</option>
              {optionen.map((m) => <option key={m.id} value={m.id}>{m.bezeichnung}</option>)}
            </select>
          </div>
        );
      })}

      {estrich.material_id && (
        <div className="estrich-detail">
          <label className="toggle">
            <input type="checkbox" checked={estrich.fussbodenheizung ?? false}
              onChange={(e) => setZeile("estrich", { fussbodenheizung: e.target.checked })} />
            Fußbodenheizung
          </label>
          <select value={estrich.bauart ?? ""} onChange={(e) => setZeile("estrich", { bauart: (e.target.value || null) as EstrichBauart | null })}>
            <option value="">Bauart wählen…</option>
            {(Object.keys(BAUART_LABEL) as EstrichBauart[]).map((b) => <option key={b} value={b}>{BAUART_LABEL[b]}</option>)}
          </select>
        </div>
      )}

      <div className="aufbau-title" style={{ marginTop: 12 }}>Weitere betroffene Bauteile</div>
      <div className="checkgrid">
        {WEITERE_BAUTEILE.map((typ) => {
          const aktiv = !!zeile(typ).material_id;
          return (
            <label key={typ} className={`checkchip${aktiv ? " on" : ""}`}>
              <input type="checkbox" checked={aktiv}
                onChange={(e) => setZeile(typ, { material_id: e.target.checked ? bauteilMaterial(typ) : null })} />
              {SCHICHT_TYP_LABEL[typ]}
            </label>
          );
        })}
      </div>

      <div className="aufbau-actions">
        {dirty && <button className="btn btn-sm" onClick={() => setEntwurf(ausStore())}>Verwerfen</button>}
        <button className="btn btn-sm btn-primary" onClick={speichern} disabled={!dirty}>Bodenaufbau speichern</button>
      </div>

      {raum.daemmstoff_status && (
        <p className="muted small" style={{ marginBottom: 0 }}>Dämmstoff-Status: <strong>{raum.daemmstoff_status}</strong> (bestätigt sich erst nach Bohrloch).</p>
      )}
    </div>
  );
}

// --- Messung anlegen -------------------------------------------------------

const LEERE_CHECKLISTE: MessStatusCheckliste = { trocken: false, feucht: false, kontaminiert: false, austausch_erforderlich: false };

function MessungForm({ raum, userId, onClose, onTrocken }: { raum: Raum; userId: string; onClose: () => void; onTrocken: (f: Feier) => void }) {
  const db = useDB();
  // Materialien, die im Bauteilaufbau dieses Raums hinterlegt sind — sie stehen zuoberst
  // und die oberste Schicht ist vorausgewählt (keine doppelte Oberbelag-Auswahl mehr).
  const aufbau = db.bodenaufbau_schicht
    .filter((s) => s.raum_id === raum.id)
    .sort((a, b) => a.reihenfolge - b.reihenfolge);
  const aufbauMatIds = [...new Set(aufbau.map((s) => s.material_id))];
  const weitere = db.materialdatenbank.filter((m) => !aufbauMatIds.includes(m.id) && m.id !== "mat-raumluft");

  const [materialId, setMaterialId] = useState(aufbauMatIds[0] ?? db.materialdatenbank[0]?.id ?? "");
  const [verfahren, setVerfahren] = useState<Messverfahren>("widerstand");
  const [anlass, setAnlass] = useState<Messanlass | "">(""); // Pflicht (FR-MESS-006)
  const [digit, setDigit] = useState("");
  const [referenz, setReferenz] = useState("");
  const [checkliste, setCheckliste] = useState<MessStatusCheckliste>(LEERE_CHECKLISTE);
  const [temp, setTemp] = useState("");
  const [rh, setRh] = useState("");
  const [ms, setMs] = useState(""); // Luftgeschwindigkeit m/s (Anemometer, Alt-System-Spalte)

  // Hygrometer misst °C/rF → absolute Feuchte. Die Messstelle ist wählbar:
  // Raumluft, Bohrloch in der Wand (Kernfeuchte, 6-mm-Bohrung) oder Dämmschicht.
  const hygro = verfahren === "hygrometer";
  const material: Materialdatenbank | undefined = db.materialdatenbank.find((m) => m.id === materialId);
  const modell = hygro ? undefined : material?.bewertungsmodell;

  const wechsleVerfahren = (v: Messverfahren) => {
    setVerfahren(v);
    // Beim Umstieg sinnvolle Messstelle vorschlagen — bleibt frei änderbar.
    if (v === "hygrometer") setMaterialId("mat-raumluft");
    else if (materialId === "mat-raumluft") setMaterialId(aufbauMatIds[0] ?? db.materialdatenbank.find((m) => m.id !== "mat-raumluft")?.id ?? "");
  };

  const num = (s: string) => { const n = parseFloat(s.replace(",", ".")); return Number.isFinite(n) ? n : null; };
  const tempN = num(temp), rhN = num(rh);
  const absVorschau = tempN != null && rhN != null ? absoluteFeuchteGKg(tempN, rhN) : null;

  const gueltig = anlass !== "" && (hygro
    ? tempN != null && rhN != null
    : !!materialId && (
      modell === "digit_grenzwert" ? num(digit) != null :
      modell === "vergleichsmessung" ? num(digit) != null && num(referenz) != null :
      modell === "status_checkliste" ? Object.values(checkliste).some(Boolean) : false
    ));

  const matLabel = (m: Materialdatenbank) => `${m.bezeichnung}${m.kategorie ? ` · ${m.kategorie}` : ""}`;

  const speichern = () => {
    if (!gueltig) return; // gueltig ⇒ anlass ist gesetzt (Messanlass), narrowing greift
    store.addMessung({
      raum_id: raum.id, material_id: materialId, messverfahren: verfahren, anlass,
      anzeige_digit: hygro || modell === "status_checkliste" ? null : num(digit),
      referenz_digit: modell === "vergleichsmessung" ? num(referenz) : null,
      status_checkliste: modell === "status_checkliste" ? checkliste : null,
      temperatur_c: tempN, rel_luftfeuchte_prozent: rhN, stroemung_m_s: num(ms), gemessen_von: userId,
    });

    // „Objekt trocken"-Moment: Freimessung mit Bewertung „trocken" feiern —
    // eskaliert, wenn damit der ganze Raum (letzte Messung je Material) trocken ist.
    const neue: Messung = {
      id: "neu", raum_id: raum.id, material_id: materialId, messverfahren: verfahren,
      anzeige_digit: hygro || modell === "status_checkliste" ? null : num(digit),
      referenz_digit: modell === "vergleichsmessung" ? num(referenz) : null,
      status_checkliste: modell === "status_checkliste" ? checkliste : null,
      absolute_feuchte_g_kg: absVorschau, temperatur_c: tempN, rel_luftfeuchte_prozent: rhN,
      stroemung_m_s: num(ms),
      anlass: anlass as Messanlass, gemessen_von: userId, gemessen_am: new Date().toISOString(),
    };
    const b = bewerteMessung(neue, material);
    if (neue.anlass === "freimessung" && b.bewertung === "trocken") {
      const alle = [...db.messung.filter((m) => m.raum_id === raum.id), neue]
        .sort((a, x) => (a.gemessen_am < x.gemessen_am ? -1 : 1));
      const letzte = new Map<string, Messung>();
      for (const m of alle) letzte.set(m.material_id, m);
      const ganz = [...letzte.values()].every(
        (m) => bewerteMessung(m, db.materialdatenbank.find((x) => x.id === m.material_id)).bewertung === "trocken",
      );
      onTrocken(ganz
        ? { titel: `${raum.bezeichnung} ist trocken`, sub: "Alle Materialien freigemessen" }
        : { titel: `${material?.bezeichnung ?? "Material"}: trocken`, sub: `Freimessung · ${raum.bezeichnung}` });
    }
    onClose();
  };

  const toggle = (k: keyof MessStatusCheckliste) => setCheckliste((c) => ({ ...c, [k]: !c[k] }));

  return (
    <Modal onClose={onClose}>
        <h2>Messung — {raum.bezeichnung}</h2>

        <label className="field"><span>Messverfahren</span>
          <select value={verfahren} onChange={(e) => wechsleVerfahren(e.target.value as Messverfahren)}>
            <option value="widerstand">{MESSVERFAHREN_LABEL.widerstand}</option>
            <option value="dielektrisch">{MESSVERFAHREN_LABEL.dielektrisch}</option>
            <option value="hygrometer">{MESSVERFAHREN_LABEL.hygrometer}</option>
          </select>
        </label>

        {hygro && (
          <div className="banner small">
            Hygrometer: °C + rF an der Messstelle → absolute Feuchte (g/kg). Messstelle frei wählbar —
            Raumluft, Bohrloch in der Wand (Kernfeuchte, 6-mm-Bohrung) oder Dämmschicht.
          </div>
        )}

        <label className="field"><span>{hygro ? "Messstelle" : "Material / Bauteil"}</span>
          <select value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
            {hygro && <option value="mat-raumluft">Raumluft</option>}
            {aufbauMatIds.length > 0 && (
              <optgroup label="Aus dem Bauteilaufbau">
                {aufbauMatIds.map((id) => {
                  const m = db.materialdatenbank.find((x) => x.id === id);
                  return m ? <option key={m.id} value={m.id}>{matLabel(m)}</option> : null;
                })}
              </optgroup>
            )}
            <optgroup label={aufbauMatIds.length > 0 ? "Weitere Materialien" : "Materialien"}>
              {weitere.map((m) => <option key={m.id} value={m.id}>{matLabel(m)}</option>)}
            </optgroup>
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
          <label className="field"><span>Temperatur °C {hygro ? "*" : "(optional)"}</span>
            <input inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="z. B. 21" />
          </label>
          <label className="field"><span>rel. Feuchte % {hygro ? "*" : "(optional)"}</span>
            <input inputMode="decimal" value={rh} onChange={(e) => setRh(e.target.value)} placeholder="z. B. 55" />
          </label>
        </div>
        <label className="field"><span>Luftgeschwindigkeit m/s (optional, Anemometer)</span>
          <input inputMode="decimal" value={ms} onChange={(e) => setMs(e.target.value)} placeholder="z. B. 4,2" />
        </label>
        {absVorschau != null && (
          <div className={`readout ${absVorschau > GKG_RICHTWERT ? "" : "accent"}`}>
            Absolute Feuchte: <strong>{fmtZahl(absVorschau)} g/kg</strong> — {absVorschau > GKG_RICHTWERT ? "feucht, weiterer Trocknungsbedarf" : "trocken"} (Richtwert ≤ {GKG_RICHTWERT} g/kg)
          </div>
        )}

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={speichern} disabled={!gueltig}>Speichern</button>
        </div>
      </Modal>
  );
}
