import { useState } from "react";
import { Modal, AnimatePresence } from "../ui/motion";
import { useDB } from "../app/useStore";
import { store } from "../domain/store";
import { BAUART_LABEL, GESCHOSSE, MESSANLASS_LABEL, MESSVERFAHREN_LABEL, SCHICHT_TYP_LABEL, WEITERE_BAUTEILE } from "../app/labels";
import { fmtDatum, fmtZahl } from "../app/format";
import { BEWERTUNG_LABEL, GKG_RICHTWERT, absoluteFeuchteGKg, bewerteMessung, type Bewertung } from "../domain/mess";
import { messprotokollHtml, printHtml } from "../domain/report";
import { Icon } from "../ui/Icon";
import { SignaturPad } from "../ui/SignaturPad";
import { TrockenMoment } from "../ui/TrockenMoment";
import type {
  EstrichBauart, Materialdatenbank, Messanlass, Messpunkt, MessStatusCheckliste, Messung, Messverfahren, Raum, SchichtTyp,
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

  // Räume nach Geschoss gruppiert (Alt-System: EG/UG-Kacheln als Navigation).
  const geschossVon = (r: Raum) => r.geschoss ?? "Ohne Geschoss";
  const geschossReihenfolge = [...GESCHOSSE, "Ohne Geschoss"];
  const gruppen = geschossReihenfolge
    .filter((g) => raeume.some((r) => geschossVon(r) === g))
    .map((g) => ({ geschoss: g, raeume: raeume.filter((r) => geschossVon(r) === g) }));

  const springe = (g: string) =>
    document.getElementById(`mp-geschoss-${g}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      {raeume.length > 0 && (
        <div className="screen-head" style={{ alignItems: "center" }}>
          <span className="eyebrow">Feuchtemessung je Raum</span>
          <button className="btn btn-sm" onClick={exportPdf}><Icon name="fileText" size={15} /> Als PDF exportieren</button>
        </div>
      )}

      {/* Geschoss-Sprungleiste bei mehreren Geschossen */}
      {gruppen.length > 1 && (
        <div className="btn-row" style={{ flexWrap: "wrap" }}>
          {gruppen.map((g) => (
            <button key={g.geschoss} className="chip geschoss-sprung" onClick={() => springe(g.geschoss)}>
              {g.geschoss} <span className="count">{g.raeume.length}</span>
            </button>
          ))}
        </div>
      )}

      {/* Raum anlegen ZUERST (Arbeitsablauf: erst anlegen, wo gemessen wird, dann messen). */}
      <section className="card">
        <div className="card-head"><h2>{raeume.length === 0 ? "Ersten Raum anlegen" : "Räume"}</h2>
          {raeume.length > 0 && <span className="count">{raeume.length}</span>}
        </div>
        {raeume.length === 0 && <p className="muted small" style={{ marginTop: 0 }}>Noch keine Räume erfasst — jeder Raum bekommt Bodenaufbau, Messpunkte und Messungen.</p>}
        <div className="inline-add" style={{ marginTop: 0 }}>
          <input placeholder="Neuer Raum, z. B. Kinderzimmer" value={neuerRaum} onChange={(e) => setNeuerRaum(e.target.value)} onKeyDown={(e) => e.key === "Enter" && raumAnlegen()} />
          <button className="btn" disabled={!neuerRaum.trim()} onClick={raumAnlegen}>+ Raum</button>
        </div>
      </section>

      {gruppen.map((g) => (
        <div key={g.geschoss} id={`mp-geschoss-${g.geschoss}`}>
          {gruppen.length > 1 && <div className="eyebrow" style={{ margin: "4px 0 10px" }}>{g.geschoss}</div>}
          {g.raeume.map((r) => <RaumMessblock key={r.id} raum={r} userId={userId} />)}
        </div>
      ))}

      {raeume.length > 0 && <TrocknungsErgebnisBereich projektId={projektId} userId={userId} />}
    </>
  );
}

function RaumMessblock({ raum, userId }: { raum: Raum; userId: string }) {
  const db = useDB();
  // false = Formular zu; { mp } = offen, optional mit vorgewähltem Messpunkt.
  const [form, setForm] = useState<false | { mp: Messpunkt | null }>(false);
  const [feier, setFeier] = useState<Feier | null>(null);
  const [alleZeigen, setAlleZeigen] = useState(false);
  const materialById = (id: string) => db.materialdatenbank.find((m) => m.id === id);
  const messpunktById = (id: string | null) => (id ? db.messpunkt.find((p) => p.id === id) : undefined);
  const messungen = db.messung
    .filter((m) => m.raum_id === raum.id)
    .sort((a, b) => (a.gemessen_am < b.gemessen_am ? 1 : -1));
  // Historie wächst mit jedem Besuch — nur die jüngsten zeigen, Rest auf Klick.
  const sichtbare = alleZeigen ? messungen : messungen.slice(0, 5);

  return (
    <section className="card">
      <div className="card-head"><h2>{raum.bezeichnung}{raum.geschoss ? <span className="muted small" style={{ fontFamily: "var(--font)", marginLeft: 8 }}>{raum.geschoss}</span> : null}</h2>
        <button className="btn btn-sm" onClick={() => setForm({ mp: null })}>+ Messung</button>
      </div>

      <AufbauEditor raum={raum} />

      <MesspunktBereich raum={raum} onMessen={(mp) => setForm({ mp })} />

      <h3>Messungen <span className="count">{messungen.length}</span></h3>
      {messungen.length === 0 && <p className="muted small">Noch keine Messung erfasst.</p>}
      {sichtbare.map((m) => {
        const mat = materialById(m.material_id);
        const b = bewerteMessung(m, mat);
        const gkgFeucht = m.absolute_feuchte_g_kg != null && m.absolute_feuchte_g_kg > GKG_RICHTWERT;
        return (
          <div key={m.id} className="messrow">
            <div className="messrow-head">
              <span className="messrow-mat">
                {messpunktById(m.messpunkt_id) ? `${messpunktById(m.messpunkt_id)!.bezeichnung} — ` : ""}
                {mat?.bezeichnung ?? (m.messverfahren === "hygrometer" ? "Raumluft" : "?")}
              </span>
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
              {m.messgeraet && <span className="muted">{m.messgeraet}</span>}
              <span className="muted">{fmtDatum(m.gemessen_am)}</span>
            </div>
          </div>
        );
      })}

      {messungen.length > sichtbare.length && (
        <button className="linkbtn" style={{ marginTop: 8 }} onClick={() => setAlleZeigen(true)}>
          Alle {messungen.length} Messungen anzeigen
        </button>
      )}
      {alleZeigen && messungen.length > 5 && (
        <button className="linkbtn" style={{ marginTop: 8 }} onClick={() => setAlleZeigen(false)}>Weniger anzeigen</button>
      )}

      <AnimatePresence>{form && <MessungForm raum={raum} userId={userId} vorMesspunkt={form.mp} onClose={() => setForm(false)} onTrocken={setFeier} />}</AnimatePresence>
      <AnimatePresence>{feier && <TrockenMoment titel={feier.titel} sub={feier.sub} onDone={() => setFeier(null)} />}</AnimatePresence>
    </section>
  );
}

// --- Ergebnis der Trocknung je Geschoss (Alt-System "Messprotokoll – Trocknung") ---

function TrocknungsErgebnisBereich({ projektId, userId }: { projektId: string; userId: string }) {
  const db = useDB();
  const [signiere, setSigniere] = useState<string | null>(null); // geschoss
  const raeume = db.raum.filter((r) => r.projekt_id === projektId);
  const geschosse = [...new Set(raeume.map((r) => r.geschoss ?? "Gesamt"))];
  const ergebnisVon = (g: string) => db.trocknungsergebnis.find((e) => e.projekt_id === projektId && e.geschoss === g);

  return (
    <section className="card">
      <div className="card-head"><h2>Ergebnis der Trocknung</h2><span className="muted small">je Geschoss</span></div>
      {geschosse.map((g) => {
        const e = ergebnisVon(g);
        const status = e?.abgeschlossen ? "abgeschlossen" : e?.beginn_datum ? "läuft" : "offen";
        return (
          <div key={g} className="aufbau" style={{ marginBottom: 12 }}>
            <div className="aufbau-title">{g}
              <span className={`chip small ${e?.abgeschlossen ? "chip-live" : e?.beginn_datum ? "chip-warn" : ""}`}>{status}</span>
              {e?.unterschrift_kunde && <span className="chip small chip-live"><Icon name="check" size={12} /> unterschrieben</span>}
            </div>
            <div className="two-col">
              <label className="field"><span>Beginn Trocknung</span>
                <input type="date" value={e?.beginn_datum ?? ""}
                  onChange={(ev) => store.setTrocknungsergebnis({ projekt_id: projektId, geschoss: g, autor_id: userId, beginn_datum: ev.target.value || null })} />
              </label>
              <label className="field"><span>Bemerkungen</span>
                <input defaultValue={e?.bemerkungen ?? ""} placeholder="optional"
                  onBlur={(ev) => store.setTrocknungsergebnis({ projekt_id: projektId, geschoss: g, autor_id: userId, bemerkungen: ev.target.value.trim() || null })} />
              </label>
            </div>
            <div className="btn-row" style={{ alignItems: "center" }}>
              <label className="toggle">
                <input type="checkbox" checked={e?.abgeschlossen ?? false}
                  onChange={(ev) => store.setTrocknungsergebnis({ projekt_id: projektId, geschoss: g, autor_id: userId, abgeschlossen: ev.target.checked })} />
                Trocknung abgeschlossen
              </label>
              <button className="btn btn-sm" onClick={() => setSigniere(g)}>
                {e?.unterschrift_kunde ? "Unterschrift erneuern" : "Kunde unterschreiben lassen"}
              </button>
            </div>
          </div>
        );
      })}

      <AnimatePresence>
        {signiere && (
          <ErgebnisSignaturModal
            geschoss={signiere} projektId={projektId} userId={userId}
            vorhandenName={ergebnisVon(signiere)?.unterschrift_kunde_name ?? ""}
            onClose={() => setSigniere(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function ErgebnisSignaturModal({ geschoss, projektId, userId, vorhandenName, onClose }: {
  geschoss: string; projektId: string; userId: string; vorhandenName: string; onClose: () => void;
}) {
  const [name, setName] = useState(vorhandenName);
  const [sig, setSig] = useState<string | null>(null);

  const speichern = () => {
    store.setTrocknungsergebnis({
      projekt_id: projektId, geschoss, autor_id: userId,
      unterschrift_kunde: sig, unterschrift_kunde_name: name.trim() || null,
    });
    onClose();
  };

  return (
    <Modal onClose={onClose} dismissable={false}>
      <h2>Ergebnis der Trocknung — {geschoss}</h2>
      <p className="muted small">Der Kunde bestätigt das Trocknungsergebnis für dieses Geschoss mit Unterschrift.</p>
      <label className="field"><span>Name des Unterzeichnenden</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vor- und Nachname" />
      </label>
      <label className="field"><span>Unterschrift Kunde</span></label>
      <SignaturPad value={sig} onChange={setSig} />
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Abbrechen</button>
        <button className="btn btn-primary" onClick={speichern} disabled={!sig}>Unterschrift speichern</button>
      </div>
    </Modal>
  );
}

// --- Messpunkte (Alt-System-Matrix) -----------------------------------------
// Wiederkehrende Messstellen je Raum — die Zeilen des Papier-Protokolls.
// Die Matrix zeigt den Verlauf: Zeile = Messpunkt, Spalte = Messtag.

function MesspunktBereich({ raum, onMessen }: { raum: Raum; onMessen: (mp: Messpunkt) => void }) {
  const db = useDB();
  const [neu, setNeu] = useState(false);
  const punkte = db.messpunkt.filter((p) => p.raum_id === raum.id);
  const materialById = (id: string | null) => (id ? db.materialdatenbank.find((m) => m.id === id) : undefined);

  const zugeordnet = db.messung.filter((m) => m.raum_id === raum.id && m.messpunkt_id);
  const tage = [...new Set(zugeordnet.map((m) => m.gemessen_am.slice(0, 10)))].sort();
  const fmtTag = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;

  // Letzte Messung eines Punkts an einem Tag (bei mehreren zählt die jüngste).
  const zelle = (mpId: string, tag: string): Messung | undefined =>
    zugeordnet
      .filter((m) => m.messpunkt_id === mpId && m.gemessen_am.slice(0, 10) === tag)
      .sort((a, b) => (a.gemessen_am < b.gemessen_am ? 1 : -1))[0];

  const zellWert = (m: Messung): string => {
    if (m.anzeige_digit != null) return `${fmtZahl(m.anzeige_digit)}`;
    if (m.absolute_feuchte_g_kg != null) return `${fmtZahl(m.absolute_feuchte_g_kg)}`;
    const b = bewerteMessung(m, materialById(m.material_id));
    return BEWERTUNG_LABEL[b.bewertung];
  };

  return (
    <div className="mp-bereich">
      <h3 style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>Messpunkte <span className="count">{punkte.length}</span></span>
        <button className="btn btn-sm" onClick={() => setNeu(!neu)}>{neu ? "Schließen" : "+ Messpunkt"}</button>
      </h3>
      {punkte.length === 0 && !neu && (
        <p className="muted small">Feste Messstellen wie im Papier-Protokoll — einmal anlegen, bei jedem Besuch erneut messen. Der Verlauf entsteht automatisch.</p>
      )}

      {neu && <MesspunktForm raumId={raum.id} onFertig={() => setNeu(false)} />}

      {/* Verlaufsmatrix: Messpunkte × Messtage (wie die Spalten im Alt-System) */}
      {punkte.length > 0 && tage.length > 0 && (
        <div className="matrix-scroll">
          <table className="matrix">
            <thead>
              <tr><th>Messpunkt</th>{tage.map((t) => <th key={t}>{fmtTag(t)}</th>)}</tr>
            </thead>
            <tbody>
              {punkte.map((mp) => (
                <tr key={mp.id}>
                  <th>{mp.bezeichnung}</th>
                  {tage.map((t) => {
                    const m = zelle(mp.id, t);
                    if (!m) return <td key={t} className="leer">—</td>;
                    const b = bewerteMessung(m, materialById(m.material_id));
                    return <td key={t} className={`mz-${b.bewertung}`} title={b.text}>{zellWert(m)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small" style={{ margin: "6px 0 0" }}>Werte: Digits bzw. g/kg (Hygrometer) · Farbe = Bewertung</p>
        </div>
      )}

      {punkte.map((mp) => {
        const mat = materialById(mp.material_id);
        const sub = [mat?.bezeichnung, mp.messort, mp.tiefe_cm != null ? `Tiefe ${fmtZahl(mp.tiefe_cm)} cm` : null].filter(Boolean).join(" · ");
        return (
          <div key={mp.id} className="listrow static">
            <div className="listrow-main">
              <span className="listrow-title">{mp.bezeichnung}</span>
              {sub && <span className="listrow-sub">{sub}</span>}
            </div>
            <div className="btn-row">
              <button className="btn btn-sm btn-primary" onClick={() => onMessen(mp)}>Messen</button>
              <button className="iconbtn" onClick={() => store.removeMesspunkt(mp.id)} title="Messpunkt entfernen" aria-label="Messpunkt entfernen">
                <Icon name="trash" size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MesspunktForm({ raumId, onFertig }: { raumId: string; onFertig: () => void }) {
  const db = useDB();
  const [bezeichnung, setBezeichnung] = useState("");
  const [messort, setMessort] = useState("");
  const [tiefe, setTiefe] = useState("");
  const [materialId, setMaterialId] = useState("");

  const speichern = () => {
    if (!bezeichnung.trim()) return;
    const t = parseFloat(tiefe.replace(",", "."));
    store.addMesspunkt({
      raum_id: raumId, bezeichnung: bezeichnung.trim(), messort: messort.trim() || null,
      tiefe_cm: Number.isFinite(t) ? t : null, material_id: materialId || null,
    });
    onFertig();
  };

  return (
    <div className="mp-form">
      <div className="two-col">
        <label className="field"><span>Bezeichnung *</span>
          <input value={bezeichnung} onChange={(e) => setBezeichnung(e.target.value)} placeholder="z. B. Randfuge Süd" />
        </label>
        <label className="field"><span>Material / Messstelle</span>
          <select value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
            <option value="">— später wählen —</option>
            {db.materialdatenbank.map((m) => <option key={m.id} value={m.id}>{m.bezeichnung}</option>)}
          </select>
        </label>
      </div>
      <div className="two-col">
        <label className="field"><span>Messort</span>
          <input value={messort} onChange={(e) => setMessort(e.target.value)} placeholder="z. B. Wand Nord, 30 cm über OKF" />
        </label>
        <label className="field"><span>Bohrtiefe cm</span>
          <input inputMode="decimal" value={tiefe} onChange={(e) => setTiefe(e.target.value)} placeholder="z. B. 4" />
        </label>
      </div>
      <div className="btn-row" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-sm btn-primary" onClick={speichern} disabled={!bezeichnung.trim()}>Messpunkt anlegen</button>
      </div>
    </div>
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
  // Einmal erfasst, ändert sich der Aufbau selten — bei Folgebesuchen eingeklappt,
  // damit Messpunkte und Messungen sofort im Blick sind. Beim Ersttermin offen.
  const [offen, setOffen] = useState(schichten.length === 0);
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

  // Kurzfassung für den eingeklappten Zustand: gespeicherte Boden-Schichten von oben nach unten.
  const zusammenfassung = SCHICHTEN
    .map((t) => schichten.find((s) => s.schicht_typ === t))
    .filter(Boolean)
    .map((s) => db.materialdatenbank.find((m) => m.id === s!.material_id)?.bezeichnung ?? "?")
    .join(" › ");

  if (!offen) {
    return (
      <div className="aufbau">
        <button className="aufbau-zu" onClick={() => setOffen(true)}>
          <span className="aufbau-title" style={{ marginBottom: 0 }}>Bodenaufbau</span>
          <span className="muted small aufbau-kurz">{zusammenfassung || "noch nicht erfasst"}</span>
          <Icon name="chevronRight" size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="aufbau">
      <div className="aufbau-title">Bodenaufbau <span className="muted small">(von oben nach unten)</span>
        {dirty && <span className="chip small chip-warn">ungespeichert</span>}
        <button className="linkbtn" style={{ marginLeft: "auto" }} onClick={() => setOffen(false)}>Einklappen</button>
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

function MessungForm({ raum, userId, vorMesspunkt, onClose, onTrocken }: {
  raum: Raum; userId: string; vorMesspunkt: Messpunkt | null; onClose: () => void; onTrocken: (f: Feier) => void;
}) {
  const db = useDB();
  // Materialien, die im Bauteilaufbau dieses Raums hinterlegt sind — sie stehen zuoberst
  // und die oberste Schicht ist vorausgewählt (keine doppelte Oberbelag-Auswahl mehr).
  const aufbau = db.bodenaufbau_schicht
    .filter((s) => s.raum_id === raum.id)
    .sort((a, b) => a.reihenfolge - b.reihenfolge);
  const aufbauMatIds = [...new Set(aufbau.map((s) => s.material_id))];
  const weitere = db.materialdatenbank.filter((m) => !aufbauMatIds.includes(m.id) && m.id !== "mat-raumluft");
  const messpunkte = db.messpunkt.filter((p) => p.raum_id === raum.id);

  const [messpunktId, setMesspunktId] = useState(vorMesspunkt?.id ?? "");
  const [materialId, setMaterialId] = useState(
    vorMesspunkt?.material_id ?? aufbauMatIds[0] ?? db.materialdatenbank[0]?.id ?? "",
  );
  const [verfahren, setVerfahren] = useState<Messverfahren>(
    vorMesspunkt?.material_id === "mat-raumluft" ? "hygrometer" : "widerstand",
  );

  // Messpunkt wählen übernimmt dessen Standard-Messstelle (bleibt frei änderbar).
  const waehleMesspunkt = (id: string) => {
    setMesspunktId(id);
    const mp = messpunkte.find((p) => p.id === id);
    if (mp?.material_id) {
      setMaterialId(mp.material_id);
      if (mp.material_id === "mat-raumluft") setVerfahren("hygrometer");
    }
  };
  const [anlass, setAnlass] = useState<Messanlass | "">(""); // Pflicht (FR-MESS-006)
  const [digit, setDigit] = useState("");
  const [referenz, setReferenz] = useState("");
  const [checkliste, setCheckliste] = useState<MessStatusCheckliste>(LEERE_CHECKLISTE);
  const [temp, setTemp] = useState("");
  const [rh, setRh] = useState("");
  const [ms, setMs] = useState(""); // Luftgeschwindigkeit m/s (Anemometer, Alt-System-Spalte)
  // Messgerät mit Nummer (Alt-System: Uni 2 / RTU 600 + Gerätenummer) — letztes Gerät vorbelegt.
  const [geraet, setGeraet] = useState(() => localStorage.getItem("torrek.letztesMessgeraet") ?? "");

  // Referenz: letzte Messung am gewählten Messpunkt (Alt-System zeigt den Vorbesuch daneben).
  const vorherige = messpunktId
    ? db.messung
        .filter((m) => m.messpunkt_id === messpunktId)
        .sort((a, b) => (a.gemessen_am < b.gemessen_am ? 1 : -1))[0]
    : undefined;
  const referenzText = vorherige
    ? [
        vorherige.anzeige_digit != null ? `${fmtZahl(vorherige.anzeige_digit)} Digits` : null,
        vorherige.temperatur_c != null ? `${fmtZahl(vorherige.temperatur_c)} °C` : null,
        vorherige.rel_luftfeuchte_prozent != null ? `${fmtZahl(vorherige.rel_luftfeuchte_prozent)} % rF` : null,
        vorherige.absolute_feuchte_g_kg != null ? `${fmtZahl(vorherige.absolute_feuchte_g_kg)} g/kg` : null,
        vorherige.stroemung_m_s != null ? `${fmtZahl(vorherige.stroemung_m_s)} m/s` : null,
      ].filter(Boolean).join(" · ")
    : null;

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
    const geraetWert = geraet.trim() || null;
    if (geraetWert) localStorage.setItem("torrek.letztesMessgeraet", geraetWert);
    store.addMessung({
      raum_id: raum.id, messpunkt_id: messpunktId || null, material_id: materialId, messverfahren: verfahren, anlass,
      anzeige_digit: hygro || modell === "status_checkliste" ? null : num(digit),
      referenz_digit: modell === "vergleichsmessung" ? num(referenz) : null,
      status_checkliste: modell === "status_checkliste" ? checkliste : null,
      temperatur_c: tempN, rel_luftfeuchte_prozent: rhN, stroemung_m_s: num(ms), messgeraet: geraetWert, gemessen_von: userId,
    });

    // „Objekt trocken"-Moment: Freimessung mit Bewertung „trocken" feiern —
    // eskaliert, wenn damit der ganze Raum (letzte Messung je Material) trocken ist.
    const neue: Messung = {
      id: "neu", raum_id: raum.id, messpunkt_id: messpunktId || null, material_id: materialId, messverfahren: verfahren,
      anzeige_digit: hygro || modell === "status_checkliste" ? null : num(digit),
      referenz_digit: modell === "vergleichsmessung" ? num(referenz) : null,
      status_checkliste: modell === "status_checkliste" ? checkliste : null,
      absolute_feuchte_g_kg: absVorschau, temperatur_c: tempN, rel_luftfeuchte_prozent: rhN,
      stroemung_m_s: num(ms), messgeraet: geraet.trim() || null,
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

        {messpunkte.length > 0 && (
          <label className="field"><span>Messpunkt (optional)</span>
            <select value={messpunktId} onChange={(e) => waehleMesspunkt(e.target.value)}>
              <option value="">— ohne Messpunkt —</option>
              {messpunkte.map((mp) => (
                <option key={mp.id} value={mp.id}>{mp.bezeichnung}{mp.messort ? ` · ${mp.messort}` : ""}</option>
              ))}
            </select>
          </label>
        )}
        {referenzText && (
          <div className="readout" style={{ marginTop: -4 }}>
            Vorbesuch {fmtDatum(vorherige!.gemessen_am)}: <strong>{referenzText}</strong>
          </div>
        )}

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

        <label className="field"><span>Messgerät (optional, mit Gerätenummer)</span>
          <input value={geraet} onChange={(e) => setGeraet(e.target.value)} placeholder="z. B. Uni 2 · Nr. 323" />
        </label>
        <div className="checkgrid" style={{ marginTop: -6 }}>
          {["Uni 2", "RTU 600", "Tramex", "Anemometer"].map((g) => (
            <button key={g} type="button" className={`checkchip${geraet.startsWith(g) ? " on" : ""}`}
              onClick={() => setGeraet(`${g} · Nr. `)}>{g}</button>
          ))}
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
      </Modal>
  );
}
