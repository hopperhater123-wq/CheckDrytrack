import { useState } from "react";
import { AnimatePresence, motion, EASE, Modal } from "../ui/motion";
import { QrCode } from "../ui/QrCode";
import {
  strombriefHtml, abschlussberichtHtml, aundvHtml, vollmachtHtml,
  zusatzerklaerungHtml, organschaftHtml, merkblattHochwasserHtml, printHtml,
} from "../domain/report";
import { SignaturPad } from "../ui/SignaturPad";
import { useDB } from "../app/useStore";
import { useSession } from "../app/session";
import { useNav } from "../app/nav";
import { store } from "../domain/store";
import {
  DOKUMENT_TYP_LABEL, FEED_KATEGORIE_LABEL, FEED_URSPRUNG_LABEL, KONTAMINATION_LABEL,
  PROJEKT_STATUS_LABEL, PROJEKT_STATUS_REIHENFOLGE,
} from "../app/labels";
import { fmtDatum, fmtDatumZeit, fmtZahl, relativZeit } from "../app/format";
import { berechneVerbrauch, einsatzTage, istLaufend } from "../domain/einsatz";
import type { Einsatz, FeedKategorie } from "../domain/types";
import { AbbauModal } from "./AbbauModal";
import { KorrekturModal } from "./KorrekturModal";
import { MessprotokollTab } from "./MessprotokollTab";
import { RaumDetailModal } from "./RaumDetailModal";
import { BerichteTab } from "./BerichteTab";
import { GrundrissTab } from "./GrundrissTab";
import { Icon } from "../ui/Icon";

type Tab = "uebersicht" | "einsaetze" | "messung" | "grundriss" | "berichte" | "feed" | "dokumente";

export function ProjektDetail({ id }: { id: string }) {
  const db = useDB();
  const { user, can } = useSession();
  const nav = useNav();
  const [tab, setTab] = useState<Tab>("uebersicht");

  const p = db.projekt.find((x) => x.id === id);
  if (!p) return <div className="screen"><p className="muted">Projekt nicht gefunden.</p></div>;

  const raeume = db.raum.filter((r) => r.projekt_id === id);
  const einsaetze = db.einsatz.filter((e) => e.projekt_id === id);
  const laufend = einsaetze.filter(istLaufend);
  const benutzerName = (uid: string) => db.benutzer.find((b) => b.id === uid)?.name ?? "?";

  return (
    <div className="screen">
      <button className="back" onClick={() => nav({ name: "projekte" })}><Icon name="chevronLeft" size={16} /> Projekte</button>
      <div className="detail-head">
        <div>
          <h1>{p.bezeichnung}</h1>
          <p className="muted" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {p.projektnummer} · {p.adresse}
            <a className="chip small" href={`https://www.google.com/maps?q=${encodeURIComponent(p.adresse)}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
              <Icon name="map" size={12} /> Route
            </a>
          </p>
        </div>
        <span className={`chip status-${p.status}`}>{PROJEKT_STATUS_LABEL[p.status]}</span>
      </div>

      {p.kontamination_art && p.kontamination_art !== "sauber" && !p.gefaehrdungsbeurteilung_abgeschlossen && (
        <div className="banner danger">
          ⚠ Kontamination: {KONTAMINATION_LABEL[p.kontamination_art]} — Gefährdungsbeurteilung noch nicht abgeschlossen (FR-PROJ-022).
        </div>
      )}

      {/* Schnellstart in den geführten Besuch — der Arbeitsablauf beginnt hier, nicht in den Tabs. */}
      {p.status !== "abgeschlossen" && !p.storniert && (
        <button className="btn btn-primary" style={{ marginBottom: 14 }} onClick={() => nav({ name: "besuch", projektId: id })}>
          Besuch starten <Icon name="chevronRight" size={15} />
        </button>
      )}

      {/* Tab-Reihenfolge = Arbeitsablauf am Objekt: erst messen, dann Geräte, dann Bericht. */}
      <div className="tabs">
        <button className={tab === "uebersicht" ? "tabh active" : "tabh"} onClick={() => setTab("uebersicht")}>Übersicht</button>
        <button className={tab === "messung" ? "tabh active" : "tabh"} onClick={() => setTab("messung")}>Messprotokoll</button>
        <button className={tab === "einsaetze" ? "tabh active" : "tabh"} onClick={() => setTab("einsaetze")}>Geräte <span className="count">{einsaetze.length}</span></button>
        <button className={tab === "berichte" ? "tabh active" : "tabh"} onClick={() => setTab("berichte")}>Berichte</button>
        <button className={tab === "grundriss" ? "tabh active" : "tabh"} onClick={() => setTab("grundriss")}>Grundriss</button>
        <button className={tab === "feed" ? "tabh active" : "tabh"} onClick={() => setTab("feed")}>Feed</button>
        <button className={tab === "dokumente" ? "tabh active" : "tabh"} onClick={() => setTab("dokumente")}>Dokumente</button>
      </div>

      <motion.div key={tab} className="tab-content" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: EASE }}>
      {tab === "uebersicht" && (
        <UebersichtTab
          projektId={id} status={p.status} kontamination={p.kontamination_art}
          gefahr={p.gefaehrdungsbeurteilung_abgeschlossen} erst={p.ist_erstmassnahme}
          versicherung={db.versicherung.find((v) => v.id === p.versicherung_id)?.name ?? null}
          angelegt={`${benutzerName(p.angelegt_von)}, ${fmtDatum(p.angelegt_am)}`}
          raeume={raeume} laufend={laufend.length} canEdit={can.projektBearbeiten} userId={user.id}
        />
      )}

      {tab === "einsaetze" && <EinsaetzeTab projektId={id} einsaetze={einsaetze} />}

      {tab === "messung" && <MessprotokollTab projektId={id} userId={user.id} />}

      {tab === "grundriss" && <GrundrissTab projektId={id} userId={user.id} />}

      {tab === "berichte" && <BerichteTab projektId={id} userId={user.id} />}

      {tab === "feed" && <FeedTab projektId={id} userId={user.id} />}

      {tab === "dokumente" && <DokumenteTab projektId={id} kostenSichtbar={can.kostenSichtbar} benutzerName={benutzerName} userId={user.id} />}
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------

// Objektdaten + scannbarer Projekt-QR (Alt-System-Analyse 13.07.2026, Backlog ④).
function ObjektdatenCard({ projektId, canEdit, userId }: { projektId: string; canEdit: boolean; userId: string }) {
  const db = useDB();
  const [qrOffen, setQrOffen] = useState(false);
  const [aundvOffen, setAundvOffen] = useState(false);
  const [vollmachtOffen, setVollmachtOffen] = useState(false);
  const p = db.projekt.find((x) => x.id === projektId);
  if (!p) return null;

  // Deep-Link fürs Scannen: immer aufs App-Verzeichnis zeigen (index.html wegkürzen),
  // damit die Adresse sauber bleibt und der Service-Worker sie als Navigation erkennt.
  const basis = window.location.pathname.replace(/index\.html?$/i, "");
  const deepLink = `${window.location.origin}${basis}?p=${p.id}`;
  const num = (s: string) => { const n = parseInt(s, 10); return Number.isFinite(n) ? n : null; };

  return (
    <section className="card">
      <div className="card-head"><h2>Objekt</h2>
        <button className="btn btn-sm" onClick={() => setQrOffen(true)}><Icon name="qr" size={15} /> QR-Code</button>
      </div>

      {canEdit ? (
        <>
          <div className="objekt-grid">
            <label className="field"><span>Baujahr</span>
              <input inputMode="numeric" defaultValue={p.baujahr ?? ""} placeholder="z. B. 1998"
                onBlur={(e) => store.setObjektdaten(p.id, { baujahr: num(e.target.value) })} />
            </label>
            <label className="field"><span>Geschosse</span>
              <input inputMode="numeric" defaultValue={p.geschosse ?? ""} placeholder="z. B. 2"
                onBlur={(e) => store.setObjektdaten(p.id, { geschosse: num(e.target.value) })} />
            </label>
            <label className="field"><span>Bauweise</span>
              <input defaultValue={p.bauweise ?? ""} placeholder="Massiv, Holzständer …"
                onBlur={(e) => store.setObjektdaten(p.id, { bauweise: e.target.value.trim() || null })} />
            </label>
          </div>
          <div className="two-col">
            <label className="field"><span>Ansprechpartner vor Ort</span>
              <input defaultValue={p.ansprechpartner ?? ""} placeholder="z. B. Frau Müller (VN)"
                onBlur={(e) => store.setObjektdaten(p.id, { ansprechpartner: e.target.value.trim() || null })} />
            </label>
            <label className="field"><span>Telefon</span>
              <input inputMode="tel" defaultValue={p.telefon ?? ""} placeholder="z. B. 0211 555123"
                onBlur={(e) => store.setObjektdaten(p.id, { telefon: e.target.value.trim() || null })} />
            </label>
          </div>
        </>
      ) : (
        <dl className="facts">
          <div><dt>Baujahr</dt><dd>{p.baujahr ?? "—"}</dd></div>
          <div><dt>Geschosse</dt><dd>{p.geschosse ?? "—"}</dd></div>
          <div><dt>Bauweise</dt><dd>{p.bauweise ?? "—"}</dd></div>
          <div><dt>Ansprechpartner</dt><dd>{p.ansprechpartner ?? "—"}</dd></div>
          <div><dt>Telefon</dt><dd>{p.telefon ? <a href={`tel:${p.telefon.replace(/\s/g, "")}`}>{p.telefon}</a> : "—"}</dd></div>
        </dl>
      )}

      {/* Auftrag & Abtretungserklärung (A&A) — Unterschrift direkt am Projekt. */}
      <div className="aundv-row">
        <div>
          <div className="aundv-title">Auftrag &amp; Abtretung (A&amp;A)</div>
          <div className="muted small">
            {p.aundv_unterschrieben
              ? `✓ unterschrieben${p.aundv_unterschrift_name ? ` · ${p.aundv_unterschrift_name}` : ""}${p.aundv_datum ? ` · ${fmtDatum(p.aundv_datum)}` : ""}`
              : "Noch nicht unterschrieben"}
          </div>
        </div>
        <div className="btn-row">
          {canEdit && <button className="btn btn-sm" onClick={() => setAundvOffen(true)}>{p.aundv_unterschrieben ? "Neu erfassen" : "Unterschreiben"}</button>}
          <button className="btn btn-sm" onClick={() => printHtml(aundvHtml(p, db))}><Icon name="fileText" size={14} /> PDF</button>
        </div>
      </div>

      {/* Vertretervollmacht — Unterschrift direkt am Projekt. */}
      <div className="aundv-row">
        <div>
          <div className="aundv-title">Vertretervollmacht</div>
          <div className="muted small">
            {p.vollmacht_unterschrift
              ? `✓ unterschrieben${p.vollmacht_unterschrift_name ? ` · ${p.vollmacht_unterschrift_name}` : ""}${p.vollmacht_datum ? ` · ${fmtDatum(p.vollmacht_datum)}` : ""}`
              : "Noch nicht unterschrieben"}
          </div>
        </div>
        <div className="btn-row">
          {canEdit && <button className="btn btn-sm" onClick={() => setVollmachtOffen(true)}>{p.vollmacht_unterschrift ? "Neu erfassen" : "Unterschreiben"}</button>}
          <button className="btn btn-sm" onClick={() => printHtml(vollmachtHtml(p, db))}><Icon name="fileText" size={14} /> PDF</button>
        </div>
      </div>

      <AnimatePresence>{aundvOffen && <AundVModal projektId={p.id} userId={userId} onClose={() => setAundvOffen(false)} />}</AnimatePresence>
      <AnimatePresence>{vollmachtOffen && <VollmachtModal projektId={p.id} userId={userId} onClose={() => setVollmachtOffen(false)} />}</AnimatePresence>

      <AnimatePresence>
        {qrOffen && (
          <Modal onClose={() => setQrOffen(false)}>
            <h2>Projekt {p.projektnummer}</h2>
            <p className="muted small">Scannen öffnet dieses Projekt direkt in Torrek — z. B. am Objekt oder für Kollegen.</p>
            <div className="qr-box"><QrCode value={deepLink} size={220} /></div>
            <p className="muted small" style={{ wordBreak: "break-all", textAlign: "center" }}>{deepLink}</p>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setQrOffen(false)}>Schließen</button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </section>
  );
}

// Auftrag & Abtretungserklärung unterschreiben (SignaturPad + Name + Datum).
function AundVModal({ projektId, userId, onClose }: { projektId: string; userId: string; onClose: () => void }) {
  const db = useDB();
  const p = db.projekt.find((x) => x.id === projektId);
  const heute = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState(p?.aundv_unterschrift_name ?? "");
  const [datum, setDatum] = useState(p?.aundv_datum?.slice(0, 10) ?? heute);
  const [sig, setSig] = useState<string | null>(p?.aundv_unterschrift ?? null);

  const speichern = () => {
    store.setAundV({ projekt_id: projektId, unterschrift: sig, name: name.trim() || null, datum, autor_id: userId });
    onClose();
  };

  return (
    <Modal onClose={onClose} dismissable={false}>
      <h2>Auftrag &amp; Abtretungserklärung</h2>
      <p className="muted small">Der Auftraggeber beauftragt die Trocknung und tritt den Erstattungsanspruch gegenüber der Versicherung ab. Unterschrift direkt auf dem Gerät.</p>
      <div className="two-col">
        <label className="field"><span>Datum</span>
          <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </label>
        <label className="field"><span>Name des Auftraggebers</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vor- und Nachname" />
        </label>
      </div>
      <label className="field"><span>Unterschrift Auftraggeber</span></label>
      <SignaturPad value={sig} onChange={setSig} />
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Abbrechen</button>
        <button className="btn btn-primary" onClick={speichern} disabled={!sig}>Unterschrift speichern</button>
      </div>
    </Modal>
  );
}

// Vertretervollmacht unterschreiben (SignaturPad + Name + Datum).
function VollmachtModal({ projektId, userId, onClose }: { projektId: string; userId: string; onClose: () => void }) {
  const db = useDB();
  const p = db.projekt.find((x) => x.id === projektId);
  const heute = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState(p?.vollmacht_unterschrift_name ?? "");
  const [datum, setDatum] = useState(p?.vollmacht_datum?.slice(0, 10) ?? heute);
  const [sig, setSig] = useState<string | null>(p?.vollmacht_unterschrift ?? null);

  const speichern = () => {
    store.setVollmacht({ projekt_id: projektId, unterschrift: sig, name: name.trim() || null, datum, autor_id: userId });
    onClose();
  };

  return (
    <Modal onClose={onClose} dismissable={false}>
      <h2>Vertretervollmacht</h2>
      <p className="muted small">Der Auftraggeber bevollmächtigt das Unternehmen, ihn gegenüber der Versicherung zu vertreten. Unterschrift direkt auf dem Gerät.</p>
      <div className="two-col">
        <label className="field"><span>Datum</span>
          <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </label>
        <label className="field"><span>Name des Vollmachtgebers</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vor- und Nachname" />
        </label>
      </div>
      <label className="field"><span>Unterschrift Auftraggeber</span></label>
      <SignaturPad value={sig} onChange={setSig} />
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Abbrechen</button>
        <button className="btn btn-primary" onClick={speichern} disabled={!sig}>Unterschrift speichern</button>
      </div>
    </Modal>
  );
}

function UebersichtTab(props: {
  projektId: string; status: import("../domain/types").ProjektStatus;
  kontamination: import("../domain/types").KontaminationArt | null; gefahr: boolean; erst: boolean;
  versicherung: string | null; angelegt: string;
  raeume: import("../domain/types").Raum[]; laufend: number; canEdit: boolean; userId: string;
}) {
  const [neuerRaum, setNeuerRaum] = useState("");
  const [raumDetail, setRaumDetail] = useState<string | null>(null);
  const naechste = PROJEKT_STATUS_REIHENFOLGE.filter((s) => s !== props.status);

  return (
    <>
      <section className="card">
        <div className="card-head"><h2>Status</h2></div>
        {props.canEdit ? (
          <label className="field"><span>Projektstatus (Lebenszyklus FR-PROJ-010)</span>
            <select value={props.status} onChange={(e) => store.setProjektStatus(props.projektId, e.target.value as import("../domain/types").ProjektStatus, props.userId)}>
              <option value={props.status}>{PROJEKT_STATUS_LABEL[props.status]} (aktuell)</option>
              {naechste.map((s) => <option key={s} value={s}>{PROJEKT_STATUS_LABEL[s]}</option>)}
            </select>
          </label>
        ) : <p className="muted">Statusänderung nur für Disposition/Projektleiter (FR-ROLE).</p>}
      </section>

      <section className="card">
        <div className="card-head"><h2>Eckdaten</h2></div>
        <dl className="facts">
          <div><dt>Erstmaßnahme</dt><dd>{props.erst ? "Ja" : "Nein"}</dd></div>
          <div><dt>Kontamination</dt><dd>{props.kontamination ? KONTAMINATION_LABEL[props.kontamination] : "—"}</dd></div>
          <div><dt>Gefährdungsbeurteilung</dt><dd>{props.gefahr ? "✓ abgeschlossen" : "offen"}</dd></div>
          <div><dt>Versicherung</dt><dd>{props.versicherung ?? "—"}</dd></div>
          <div><dt>Laufende Geräte</dt><dd>{props.laufend}</dd></div>
          <div><dt>Angelegt</dt><dd>{props.angelegt}</dd></div>
        </dl>
      </section>

      <ObjektdatenCard projektId={props.projektId} canEdit={props.canEdit} userId={props.userId} />

      <section className="card">
        <div className="card-head"><h2>Räume</h2></div>
        {props.raeume.length === 0 && <p className="muted">Noch keine Räume erfasst.</p>}
        {props.raeume.map((r) => {
          const warnungen = [
            r.faekalschaden && "Fäkalschaden",
            r.freies_wasser && "freies Wasser",
            r.sichtbarer_schimmel && "Schimmel",
          ].filter(Boolean).join(" · ");
          const sub = [r.geschoss, r.wohneinheit, r.daemmstoff_status ? `Dämmstoff: ${r.daemmstoff_status}` : null]
            .filter(Boolean).join(" · ");
          return (
            <button key={r.id} className="listrow" onClick={() => setRaumDetail(r.id)}>
              <div className="listrow-main">
                <span className="listrow-title">{r.bezeichnung}</span>
                {sub && <span className="listrow-sub">{sub}</span>}
              </div>
              <div className="listrow-side">
                {warnungen && <span className="chip small chip-danger">{warnungen}</span>}
                <span className="muted small">Details ›</span>
              </div>
            </button>
          );
        })}
        <div className="inline-add">
          <input placeholder="Neuer Raum (z. B. Kinderzimmer)" value={neuerRaum} onChange={(e) => setNeuerRaum(e.target.value)} />
          <button className="btn" disabled={!neuerRaum.trim()} onClick={() => { store.addRaum(props.projektId, neuerRaum.trim()); setNeuerRaum(""); }}>+ Raum</button>
        </div>
      </section>

      <AnimatePresence>{raumDetail && <RaumDetailModal raumId={raumDetail} onClose={() => setRaumDetail(null)} />}</AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------

export function EinsaetzeTab({ projektId, einsaetze }: { projektId: string; einsaetze: Einsatz[] }) {
  const db = useDB();
  const [abbau, setAbbau] = useState<Einsatz | null>(null);
  const [korrektur, setKorrektur] = useState<Einsatz | null>(null);
  const laufend = einsaetze.filter(istLaufend);
  const beendet = einsaetze.filter((e) => !istLaufend(e));
  void projektId;

  const raumName = (rid: string | null) => rid ? db.raum.find((r) => r.id === rid)?.bezeichnung ?? "?" : "ohne Raum";

  const zeile = (e: Einsatz) => {
    const geraet = db.geraet.find((g) => g.inventarnummer === e.geraet_inventarnummer);
    const typ = db.geraetetyp.find((t) => t.id === geraet?.geraetetyp_id);
    // Robust gegen verwaiste Referenzen (Gerät remote gelöscht/umbenannt): kein Absturz.
    const verbrauch = geraet ? berechneVerbrauch(e, geraet, typ) : null;
    return (
      <div key={e.id} className="einsatz">
        <div className="einsatz-head">
          <button className="einsatz-geraet editierbar" title="Nummer korrigieren" onClick={() => setKorrektur(e)}>
            {e.geraet_inventarnummer} <Icon name="pen" size={11} />
          </button>
          <span className="muted small">{typ?.bezeichnung}</span>
          {istLaufend(e) ? <span className="chip chip-live">läuft</span> : <span className="chip">abgebaut</span>}
        </div>
        <div className="einsatz-meta">
          <span>Raum: {raumName(e.raum_id)}</span>
          <span>Aufbau: {fmtDatumZeit(e.aufbau_datum)}</span>
          <span>{istLaufend(e) ? `${einsatzTage(e)} Tage (läuft)` : `Abbau: ${fmtDatumZeit(e.abbau_datum)}`}</span>
        </div>
        <div className="einsatz-meta">
          <button className="editierbar" title="Zählerstand korrigieren" onClick={() => setKorrektur(e)}>
            Start: {fmtZahl(e.zaehlerstand_start)} kWh <Icon name="pen" size={10} />
          </button>
          {e.zaehlerstand_ende !== null && (
            <button className="editierbar" title="Zählerstand korrigieren" onClick={() => setKorrektur(e)}>
              Ende: {fmtZahl(e.zaehlerstand_ende)} kWh <Icon name="pen" size={10} />
            </button>
          )}
          {verbrauch && (
            <span className={verbrauch.geschaetzt ? "verbrauch-schaetz" : "verbrauch"}>
              Verbrauch: {fmtZahl(verbrauch.verbrauch)} kWh{verbrauch.geschaetzt ? " (geschätzt, ohne Gewähr)" : ""}
            </span>
          )}
        </div>
        {istLaufend(e) && <button className="btn btn-sm" onClick={() => setAbbau(e)}>Abbauen</button>}
      </div>
    );
  };

  return (
    <>
      <section className="card">
        <div className="card-head"><h2>Laufende Einsätze <span className="count">{laufend.length}</span></h2></div>
        {laufend.length === 0 ? <p className="muted">Keine laufenden Geräte.</p> : laufend.map(zeile)}
      </section>
      {beendet.length > 0 && (
        <section className="card">
          <div className="card-head"><h2>Abgeschlossene Einsätze</h2></div>
          {beendet.map(zeile)}
        </section>
      )}
      <AnimatePresence>{abbau && <AbbauModal einsatz={abbau} onClose={() => setAbbau(null)} />}</AnimatePresence>
      <AnimatePresence>{korrektur && <KorrekturModal einsatz={korrektur} onClose={() => setKorrektur(null)} />}</AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------

const KATEGORIEN: FeedKategorie[] = ["notiz", "problem", "hinweis", "kunde", "dispo"];

export function FeedTab({ projektId, userId }: { projektId: string; userId: string }) {
  const db = useDB();
  const [text, setText] = useState("");
  const [kat, setKat] = useState<FeedKategorie>("notiz");

  const eintraege = db.feed_eintrag
    .filter((f) => f.projekt_id === projektId)
    .sort((a, b) => (a.erstellt_am < b.erstellt_am ? 1 : -1));
  const benutzerName = (uid: string) => db.benutzer.find((b) => b.id === uid)?.name ?? "?";

  const senden = () => {
    if (!text.trim()) return;
    store.addFeedEintrag({ projekt_id: projektId, kategorie: kat, inhalt: text.trim(), autor_id: userId });
    setText("");
  };

  return (
    <section className="card">
      <div className="composer">
        <select value={kat} onChange={(e) => setKat(e.target.value as FeedKategorie)}>
          {KATEGORIEN.map((k) => <option key={k} value={k}>{FEED_KATEGORIE_LABEL[k]}</option>)}
        </select>
        <input placeholder="Eintrag zum Projekt-Feed…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && senden()} />
        <button className="btn btn-primary" onClick={senden} disabled={!text.trim()}>Senden</button>
      </div>

      <div className="feed">
        {eintraege.length === 0 && <p className="muted">Noch keine Einträge.</p>}
        {eintraege.map((f) => {
          const kommentare = db.feed_kommentar.filter((k) => k.feed_eintrag_id === f.id);
          const auto = f.ursprung !== "manuell";
          return (
            <div key={f.id} className={`feed-item${auto ? " auto" : ""}`}>
              <div className="feed-meta">
                <span className={`chip small ${f.kategorie === "problem" ? "chip-danger" : ""}`}>
                  {auto ? FEED_URSPRUNG_LABEL[f.ursprung] : FEED_KATEGORIE_LABEL[f.kategorie!]}
                </span>
                <span className="muted small">{benutzerName(f.autor_id)} · {relativZeit(f.erstellt_am)}</span>
              </div>
              <p className="feed-text">{f.inhalt}</p>
              {kommentare.map((k) => (
                <div key={k.id} className="feed-comment">
                  <span className="muted small">{benutzerName(k.autor_id)}:</span> {k.inhalt}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

function DokumenteTab({ projektId, kostenSichtbar, benutzerName, userId }: { projektId: string; kostenSichtbar: boolean; benutzerName: (u: string) => string; userId: string }) {
  const db = useDB();
  const projekt = db.projekt.find((p) => p.id === projektId)!;
  // KVA-Sichtbarkeit (04 Rollenmodell): Monteur sieht keine Kosten-/KVA-Dokumente.
  const dokumente = db.dokument
    .filter((d) => d.projekt_id === projektId)
    .filter((d) => kostenSichtbar || d.typ !== "kva");
  const kvaVersteckt = !kostenSichtbar && db.dokument.some((d) => d.projekt_id === projektId && d.typ === "kva");

  const strombrief = () => {
    printHtml(strombriefHtml(projekt, db));
    store.addDokument({ projekt_id: projektId, typ: "strombrief", speicher_referenz: `strombrief://${projektId}/${Date.now()}.pdf`, erstellt_von: userId });
  };
  const abschlussbericht = () => {
    printHtml(abschlussberichtHtml(projekt, db));
    store.addDokument({ projekt_id: projektId, typ: "abschlussbericht", speicher_referenz: `abschlussbericht://${projektId}/${Date.now()}.pdf`, erstellt_von: userId });
  };
  // Einfache Erklärungs-/Merkblatt-Dokumente (Alt-System "Neue Dokumente").
  const erzeuge = (typ: import("../domain/types").DokumentTyp, html: string) => {
    printHtml(html);
    store.addDokument({ projekt_id: projektId, typ, speicher_referenz: `${typ}://${projektId}/${Date.now()}.pdf`, erstellt_von: userId });
  };

  // Doc-Zeile erneut als PDF öffnen (für generierte Dokumente; andere Typen sind Platzhalter).
  const oeffnen = (typ: string) => {
    if (typ === "strombrief") printHtml(strombriefHtml(projekt, db));
    else if (typ === "abschlussbericht") printHtml(abschlussberichtHtml(projekt, db));
    else if (typ === "zusatzerklaerung") printHtml(zusatzerklaerungHtml(projekt, db));
    else if (typ === "organschaft") printHtml(organschaftHtml(projekt, db));
    else if (typ === "merkblatt_hochwasser") printHtml(merkblattHochwasserHtml(projekt));
  };

  return (
    <section className="card">
      <div className="card-head"><h2>Dokumente</h2>
        <div className="btn-row">
          <button className="btn btn-sm" onClick={strombrief}><Icon name="fileText" size={14} /> Strombrief</button>
          <button className="btn btn-sm btn-primary" onClick={abschlussbericht}><Icon name="fileText" size={14} /> Abschlussbericht</button>
        </div>
      </div>
      <div className="btn-row" style={{ marginBottom: 12, flexWrap: "wrap" }}>
        <button className="btn btn-sm" onClick={() => erzeuge("zusatzerklaerung", zusatzerklaerungHtml(projekt, db))}>Zusatzerklärung</button>
        <button className="btn btn-sm" onClick={() => erzeuge("organschaft", organschaftHtml(projekt, db))}>Organschaft</button>
        <button className="btn btn-sm" onClick={() => erzeuge("merkblatt_hochwasser", merkblattHochwasserHtml(projekt))}>Merkblatt Hochwasser</button>
      </div>
      {dokumente.length === 0 && <p className="muted">Noch keine Dokumente. Abschlussbericht fasst Trocknungsergebnis, Geräteeinsätze und Verbrauch zusammen; der Strombrief listet Einsatzdauer und Stromverbrauch je Gerät.</p>}
      {dokumente.map((d) => (
        <button key={d.id} className="listrow" onClick={() => oeffnen(d.typ)}>
          <div className="listrow-main">
            <span className="listrow-title">{DOKUMENT_TYP_LABEL[d.typ]}</span>
            <span className="listrow-sub">{benutzerName(d.erstellt_von)} · {fmtDatum(d.erstellt_am)}</span>
          </div>
          <span className="muted small"><Icon name="fileText" size={13} /> PDF</span>
        </button>
      ))}
      {kvaVersteckt && <p className="muted small">🔒 KVA/Kostendokumente sind für Ihre Rolle ausgeblendet (04 Rollenmodell).</p>}
    </section>
  );
}
