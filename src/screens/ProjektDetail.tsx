import { useState } from "react";
import { AnimatePresence, motion, EASE } from "../ui/motion";
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

      <div className="tabs">
        <button className={tab === "uebersicht" ? "tabh active" : "tabh"} onClick={() => setTab("uebersicht")}>Übersicht</button>
        <button className={tab === "einsaetze" ? "tabh active" : "tabh"} onClick={() => setTab("einsaetze")}>Einsätze <span className="count">{einsaetze.length}</span></button>
        <button className={tab === "messung" ? "tabh active" : "tabh"} onClick={() => setTab("messung")}>Messprotokoll</button>
        <button className={tab === "grundriss" ? "tabh active" : "tabh"} onClick={() => setTab("grundriss")}>Grundriss</button>
        <button className={tab === "berichte" ? "tabh active" : "tabh"} onClick={() => setTab("berichte")}>Berichte</button>
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

      {tab === "dokumente" && <DokumenteTab projektId={id} kostenSichtbar={can.kostenSichtbar} benutzerName={benutzerName} />}
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------

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

function EinsaetzeTab({ projektId, einsaetze }: { projektId: string; einsaetze: Einsatz[] }) {
  const db = useDB();
  const [abbau, setAbbau] = useState<Einsatz | null>(null);
  const laufend = einsaetze.filter(istLaufend);
  const beendet = einsaetze.filter((e) => !istLaufend(e));
  void projektId;

  const raumName = (rid: string | null) => rid ? db.raum.find((r) => r.id === rid)?.bezeichnung ?? "?" : "ohne Raum";

  const zeile = (e: Einsatz) => {
    const geraet = db.geraet.find((g) => g.inventarnummer === e.geraet_inventarnummer);
    const typ = db.geraetetyp.find((t) => t.id === geraet?.geraetetyp_id);
    const verbrauch = berechneVerbrauch(e, geraet!, typ);
    return (
      <div key={e.id} className="einsatz">
        <div className="einsatz-head">
          <span className="einsatz-geraet">{e.geraet_inventarnummer}</span>
          <span className="muted small">{typ?.bezeichnung}</span>
          {istLaufend(e) ? <span className="chip chip-live">läuft</span> : <span className="chip">abgebaut</span>}
        </div>
        <div className="einsatz-meta">
          <span>Raum: {raumName(e.raum_id)}</span>
          <span>Aufbau: {fmtDatumZeit(e.aufbau_datum)}</span>
          <span>{istLaufend(e) ? `${einsatzTage(e)} Tage (läuft)` : `Abbau: ${fmtDatumZeit(e.abbau_datum)}`}</span>
        </div>
        <div className="einsatz-meta">
          <span>Start: {fmtZahl(e.zaehlerstand_start)} kWh</span>
          {e.zaehlerstand_ende !== null && <span>Ende: {fmtZahl(e.zaehlerstand_ende)} kWh</span>}
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
    </>
  );
}

// ---------------------------------------------------------------------------

const KATEGORIEN: FeedKategorie[] = ["notiz", "problem", "hinweis", "kunde", "dispo"];

function FeedTab({ projektId, userId }: { projektId: string; userId: string }) {
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

function DokumenteTab({ projektId, kostenSichtbar, benutzerName }: { projektId: string; kostenSichtbar: boolean; benutzerName: (u: string) => string }) {
  const db = useDB();
  // KVA-Sichtbarkeit (04 Rollenmodell): Monteur sieht keine Kosten-/KVA-Dokumente.
  const dokumente = db.dokument
    .filter((d) => d.projekt_id === projektId)
    .filter((d) => kostenSichtbar || d.typ !== "kva");
  const kvaVersteckt = !kostenSichtbar && db.dokument.some((d) => d.projekt_id === projektId && d.typ === "kva");

  return (
    <section className="card">
      <div className="card-head"><h2>Dokumente</h2></div>
      {dokumente.length === 0 && <p className="muted">Keine Dokumente.</p>}
      {dokumente.map((d) => (
        <div key={d.id} className="listrow static">
          <div className="listrow-main">
            <span className="listrow-title">{DOKUMENT_TYP_LABEL[d.typ]}</span>
            <span className="listrow-sub">{benutzerName(d.erstellt_von)} · {fmtDatum(d.erstellt_am)}</span>
          </div>
          <span className="muted small">PDF ↓</span>
        </div>
      ))}
      {kvaVersteckt && <p className="muted small">🔒 KVA/Kostendokumente sind für Ihre Rolle ausgeblendet (04 Rollenmodell).</p>}
    </section>
  );
}
