import { useState } from "react";
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

      <label className="toggle">
        <input type="checkbox" checked={nurMeine} onChange={(e) => setNurMeine(e.target.checked)} /> Nur meine Termine
      </label>

      {tage.map((tag) => {
        const tagIso = isoTag(tag);
        const termine = termineAm(tagIso);
        if (!termine.length && woche !== 0) return null; // leere Tage nur in der aktuellen Woche zeigen
        return (
          <section key={tagIso} className={`card tag-card${tagIso === heuteIso ? " heute" : ""}`}>
            <div className="card-head">
              <h2>{tag.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit" })}</h2>
              {tagIso === heuteIso && <span className="chip small">Heute</span>}
            </div>
            {termine.length === 0 && <p className="muted small" style={{ margin: 0 }}>Keine Termine.</p>}
            {termine.map((t) => <TerminZeile key={t.id} termin={t} projektNr={projekt(t.projekt_id)?.projektnummer} projektName={projekt(t.projekt_id)?.bezeichnung} mitarbeiter={mitarbeiter(t.mitarbeiter_id)} onOpen={() => nav({ name: "projekt", id: t.projekt_id })} />)}
          </section>
        );
      })}

      {neu && <TerminForm userId={user.id} onClose={() => setNeu(false)} />}
    </div>
  );
}

function TerminZeile({ termin, projektNr, projektName, mitarbeiter, onOpen }: {
  termin: Termin; projektNr?: string; projektName?: string; mitarbeiter: string | null; onOpen: () => void;
}) {
  return (
    <div className={`termin${termin.erledigt ? " erledigt" : ""}`}>
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
    </div>
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
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
      </div>
    </div>
  );
}
