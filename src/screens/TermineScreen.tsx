import { useState, type DragEvent } from "react";
import { Modal, AnimatePresence, motion, staggerContainer, fadeUpItem } from "../ui/motion";
import { useDB } from "../app/useStore";
import { useSession } from "../app/session";
import { useNav } from "../app/nav";
import { store } from "../domain/store";
import { Icon } from "../ui/Icon";
import type { Termin } from "../domain/types";

// Termin-Wochenansicht (Alt-System "Terminübersicht", Backlog ③).
// Liste nach Tagen gruppiert — mobil wie am Desktop gut lesbar.

const TAG_MS = 864e5;
const isoTag = (d: Date) => d.toISOString().slice(0, 10);

/** Montag der Woche mit Offset in Wochen (0 = aktuelle Woche). */
function montag(offsetWochen: number): Date {
  const heute = new Date();
  const tag = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate());
  const wochentag = (tag.getDay() + 6) % 7; // Mo=0
  return new Date(tag.getTime() - wochentag * TAG_MS + offsetWochen * 7 * TAG_MS);
}

export function TermineScreen() {
  const db = useDB();
  const { user } = useSession();
  const nav = useNav();
  const [woche, setWoche] = useState(0);
  const [nurMeine, setNurMeine] = useState(user.rolle === "monteur");
  const [neu, setNeu] = useState(false);
  // Plantafel-light (Roadmap 011 „Büro & Kommunikation", PO 18.07.): Woche × Mitarbeiter,
  // Termine per Ziehen umplanen. Bewusst klein gehalten — kein ERP, keine Kapazitätsplanung.
  const [ansicht, setAnsicht] = useState<"liste" | "tafel">("liste");

  const start = montag(woche);
  const tage = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * TAG_MS));
  const heuteIso = isoTag(new Date());

  const projekt = (pid: string) => db.projekt.find((p) => p.id === pid);
  const mitarbeiter = (mid: string | null) => (mid ? db.benutzer.find((b) => b.id === mid)?.name ?? "?" : null);

  const termineAm = (tagIso: string) =>
    db.termin
      .filter((t) => t.datum === tagIso)
      .filter((t) => !nurMeine || t.mitarbeiter_id === user.id)
      .sort((a, b) => (a.uhrzeit ?? "99") < (b.uhrzeit ?? "99") ? -1 : 1);

  const wochenLabel = `${start.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} – ${new Date(start.getTime() + 6 * TAG_MS).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}`;

  return (
    <div className="screen">
      <div className="screen-head">
        <h1>Termine</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setNeu(true)}><Icon name="plus" size={15} /> Termin</button>
      </div>

      <div className="wochen-nav">
        <button className="iconbtn" onClick={() => setWoche(woche - 1)} aria-label="Vorherige Woche"><Icon name="chevronLeft" size={18} /></button>
        <button className="linkbtn" onClick={() => setWoche(0)}>{woche === 0 ? "Aktuelle Woche" : "Zu heute"}</button>
        <span className="muted small">{wochenLabel}</span>
        <button className="iconbtn" onClick={() => setWoche(woche + 1)} aria-label="Nächste Woche"><Icon name="chevronRight" size={18} /></button>
      </div>

      <div className="btn-row" style={{ alignItems: "center", justifyContent: "space-between" }}>
        <div className="segmented" style={{ display: "inline-flex" }}>
          <button className={ansicht === "liste" ? "seg active" : "seg"} onClick={() => setAnsicht("liste")}>Liste</button>
          <button className={ansicht === "tafel" ? "seg active" : "seg"} onClick={() => setAnsicht("tafel")}>Plantafel</button>
        </div>
        {ansicht === "liste" && (
          <label className="toggle" style={{ margin: 0 }}>
            <input type="checkbox" checked={nurMeine} onChange={(e) => setNurMeine(e.target.checked)} /> Nur meine Termine
          </label>
        )}
      </div>

      {ansicht === "tafel" && <Plantafel tage={tage} heuteIso={heuteIso} />}

      {ansicht === "liste" && (
      <motion.div className="tage" variants={staggerContainer} initial="hidden" animate="show" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {tage.map((tag) => {
        const tagIso = isoTag(tag);
        const termine = termineAm(tagIso);
        if (!termine.length && woche !== 0) return null; // leere Tage nur in der aktuellen Woche zeigen
        return (
          <motion.section layout variants={fadeUpItem} key={tagIso} className={`card tag-card${tagIso === heuteIso ? " heute" : ""}`}>
            <div className="card-head">
              <h2>{tag.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit" })}</h2>
              {tagIso === heuteIso && <span className="chip small">Heute</span>}
            </div>
            {termine.length === 0 && <p className="muted small" style={{ margin: 0 }}>Keine Termine.</p>}
            {termine.map((t) => <TerminZeile key={t.id} termin={t} projektNr={projekt(t.projekt_id)?.projektnummer} projektName={projekt(t.projekt_id)?.bezeichnung} mitarbeiter={mitarbeiter(t.mitarbeiter_id)} onOpen={() => nav({ name: "projekt", id: t.projekt_id })} />)}
          </motion.section>
        );
      })}
      </motion.div>
      )}

      <AnimatePresence>{neu && <TerminForm userId={user.id} onClose={() => setNeu(false)} />}</AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------

// Plantafel-light: Zeilen = Mitarbeiter (+ „Nicht zugewiesen"), Spalten = Wochentage.
// Karte ziehen = Termin auf anderen Tag/Monteur umplanen (store.verschiebeTermin).
function Plantafel({ tage, heuteIso }: { tage: Date[]; heuteIso: string }) {
  const db = useDB();
  const nav = useNav();
  const [ueber, setUeber] = useState<string | null>(null); // Zellen-Key unter dem Zeiger

  const tagIsos = tage.map(isoTag);
  // Monteure zuerst — die Tafel plant primär das Feld; Büro-Rollen folgen darunter.
  const zeilen: { id: string | null; name: string }[] = [
    ...[...db.benutzer].sort((a, b) => Number(b.rolle === "monteur") - Number(a.rolle === "monteur")).map((b) => ({ id: b.id as string | null, name: b.name })),
    { id: null, name: "Nicht zugewiesen" },
  ];
  const projekt = (pid: string) => db.projekt.find((p) => p.id === pid);
  const zelle = (mid: string | null, tagIso: string) =>
    db.termin.filter((t) => t.mitarbeiter_id === mid && t.datum === tagIso)
      .sort((a, b) => ((a.uhrzeit ?? "99") < (b.uhrzeit ?? "99") ? -1 : 1));

  const ablegen = (e: DragEvent, mid: string | null, tagIso: string) => {
    e.preventDefault(); setUeber(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) store.verschiebeTermin(id, tagIso, mid);
  };

  return (
    <div className="plantafel-scroll card">
      <div className="plantafel" style={{ gridTemplateColumns: `130px repeat(${tage.length}, minmax(118px, 1fr))` }}>
        <div className="pt-ecke" />
        {tage.map((tag, i) => (
          <div key={tagIsos[i]} className={`pt-tag${tagIsos[i] === heuteIso ? " heute" : ""}`}>
            {tag.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}
          </div>
        ))}
        {zeilen.map((z) => (
          <PlantafelZeile key={z.id ?? "frei"} zeile={z} tagIsos={tagIsos} heuteIso={heuteIso}
            zelle={zelle} ueber={ueber} setUeber={setUeber} ablegen={ablegen}
            projekt={projekt} oeffnen={(pid) => nav({ name: "projekt", id: pid })} />
        ))}
      </div>
      <p className="muted small" style={{ margin: "10px 2px 2px" }}>Karte auf einen anderen Tag oder Mitarbeiter ziehen, um den Termin umzuplanen. Klick öffnet das Projekt.</p>
    </div>
  );
}

function PlantafelZeile({ zeile, tagIsos, heuteIso, zelle, ueber, setUeber, ablegen, projekt, oeffnen }: {
  zeile: { id: string | null; name: string }; tagIsos: string[]; heuteIso: string;
  zelle: (mid: string | null, tagIso: string) => Termin[];
  ueber: string | null; setUeber: (k: string | null) => void;
  ablegen: (e: DragEvent, mid: string | null, tagIso: string) => void;
  projekt: (pid: string) => { projektnummer: string; bezeichnung: string } | undefined;
  oeffnen: (projektId: string) => void;
}) {
  return (
    <>
      <div className={`pt-name${zeile.id === null ? " frei" : ""}`}>{zeile.name}</div>
      {tagIsos.map((tagIso) => {
        const key = `${zeile.id ?? "frei"}|${tagIso}`;
        return (
          <div key={key}
            className={`pt-zelle${tagIso === heuteIso ? " heute" : ""}${ueber === key ? " ueber" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setUeber(key); }}
            onDragLeave={() => setUeber(null)}
            onDrop={(e) => ablegen(e, zeile.id, tagIso)}
          >
            {zelle(zeile.id, tagIso).map((t) => {
              const p = projekt(t.projekt_id);
              return (
                <div key={t.id} className={`pt-karte${t.erledigt ? " erledigt" : ""}`} draggable
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", t.id); e.dataTransfer.effectAllowed = "move"; }}
                  onClick={() => oeffnen(t.projekt_id)}
                  title={`${t.beschreibung} · ${p?.projektnummer ?? ""}`}
                >
                  <span className="pt-karte-zeit">{t.uhrzeit ?? "—"}</span>
                  <span className="pt-karte-text">{t.beschreibung}</span>
                  <span className="pt-karte-projekt">{p?.projektnummer}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

function TerminZeile({ termin, projektNr, projektName, mitarbeiter, onOpen }: {
  termin: Termin; projektNr?: string; projektName?: string; mitarbeiter: string | null; onOpen: () => void;
}) {
  return (
    <motion.div layout className={`termin${termin.erledigt ? " erledigt" : ""}`}>
      <button
        className={`termin-check${termin.erledigt ? " on" : ""}`}
        onClick={() => store.setTerminErledigt(termin.id, !termin.erledigt)}
        aria-label={termin.erledigt ? "Als offen markieren" : "Als erledigt markieren"}
      >
        {termin.erledigt && <Icon name="check" size={13} />}
      </button>
      <button className="termin-main" onClick={onOpen}>
        <span className="termin-zeit">{termin.uhrzeit ?? "—"}</span>
        <span className="termin-text">
          <b>{termin.beschreibung}</b>
          <span className="muted small">{projektNr} · {projektName}{mitarbeiter ? ` · ${mitarbeiter}` : " · nicht zugewiesen"}</span>
        </span>
        <Icon name="chevronRight" size={16} />
      </button>
    </motion.div>
  );
}

function TerminForm({ userId, onClose }: { userId: string; onClose: () => void }) {
  const db = useDB();
  const offene = db.projekt.filter((p) => !p.storniert && p.status !== "abgeschlossen");
  const [projektId, setProjektId] = useState(offene[0]?.id ?? "");
  const [datum, setDatum] = useState(isoTag(new Date()));
  const [uhrzeit, setUhrzeit] = useState("08:00");
  const [mitarbeiterId, setMitarbeiterId] = useState("");
  const [beschreibung, setBeschreibung] = useState("");

  const gueltig = projektId && datum && beschreibung.trim();
  const speichern = () => {
    if (!gueltig) return;
    store.addTermin({
      projekt_id: projektId, datum, uhrzeit: uhrzeit || null,
      mitarbeiter_id: mitarbeiterId || null, beschreibung: beschreibung.trim(), erstellt_von: userId,
    });
    onClose();
  };

  return (
    <Modal onClose={onClose}>
        <h2>Neuer Termin</h2>
        <label className="field"><span>Projekt *</span>
          <select value={projektId} onChange={(e) => setProjektId(e.target.value)}>
            {offene.map((p) => <option key={p.id} value={p.id}>{p.projektnummer} · {p.bezeichnung}</option>)}
          </select>
        </label>
        <div className="two-col">
          <label className="field"><span>Datum *</span>
            <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
          </label>
          <label className="field"><span>Uhrzeit</span>
            <input type="time" value={uhrzeit} onChange={(e) => setUhrzeit(e.target.value)} />
          </label>
        </div>
        <label className="field"><span>Mitarbeiter</span>
          <select value={mitarbeiterId} onChange={(e) => setMitarbeiterId(e.target.value)}>
            <option value="">— noch nicht zugewiesen —</option>
            {db.benutzer.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Was ist zu tun? *</span>
          <input value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} placeholder="z. B. TRO Abbau / WH aufnehmen" />
        </label>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={speichern} disabled={!gueltig}>Anlegen</button>
        </div>
      </Modal>
  );
}
