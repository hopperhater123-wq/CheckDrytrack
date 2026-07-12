import { useDB } from "../app/useStore";
import { useSession } from "../app/session";
import { useNav } from "../app/nav";
import { GERAET_STATUS_LABEL, PROJEKT_STATUS_LABEL } from "../app/labels";
import { fmtDatum } from "../app/format";
import { istLaufend } from "../domain/einsatz";

// Live-Übersicht für die Disposition (000 Vision: "Wo ist welches Gerät? Welche Projekte laufen?").
export function Dashboard() {
  const db = useDB();
  const { user } = useSession();
  const nav = useNav();

  const geraeteGesamt = db.geraet.length;
  const imEinsatz = db.geraet.filter((g) => g.status === "baustelle").length;
  const imLager = db.geraet.filter((g) => g.status === "lager").length;
  const inWerkstatt = db.geraet.filter((g) => g.status === "werkstatt").length;

  const offeneProjekte = db.projekt.filter((p) => !p.storniert && p.status !== "abgeschlossen");
  const laufendeEinsaetze = db.einsatz.filter(istLaufend).length;

  // E-Check fällig in den nächsten 30 Tagen oder überfällig.
  const heute = Date.now();
  const echeckFaellig = db.geraet
    .filter((g) => g.e_check_datum && new Date(g.e_check_datum).getTime() - heute < 30 * 864e5)
    .sort((a, b) => (a.e_check_datum! < b.e_check_datum! ? -1 : 1));

  const auslastung = geraeteGesamt ? Math.round((imEinsatz / geraeteGesamt) * 100) : 0;

  return (
    <div className="screen">
      <h1>Guten Tag, {user.name.split(" ")[0]}.</h1>

      <div className="kpi-grid">
        <button className="kpi" onClick={() => nav({ name: "geraete" })}>
          <span className="kpi-value">{imEinsatz}</span>
          <span className="kpi-label">Geräte im Einsatz</span>
        </button>
        <button className="kpi" onClick={() => nav({ name: "geraete" })}>
          <span className="kpi-value">{imLager}</span>
          <span className="kpi-label">Frei im Lager</span>
        </button>
        <button className="kpi" onClick={() => nav({ name: "projekte" })}>
          <span className="kpi-value">{offeneProjekte.length}</span>
          <span className="kpi-label">Offene Projekte</span>
        </button>
        <div className="kpi">
          <span className="kpi-value">{laufendeEinsaetze}</span>
          <span className="kpi-label">Laufende Einsätze</span>
        </div>
      </div>

      <section className="card">
        <div className="card-head"><h2>Geräteauslastung</h2><span className="muted">{auslastung}%</span></div>
        <div className="bar"><div className="bar-fill" style={{ width: `${auslastung}%` }} /></div>
        <div className="legend">
          <span><i className="dot dot-baustelle" /> {GERAET_STATUS_LABEL.baustelle} {imEinsatz}</span>
          <span><i className="dot dot-lager" /> {GERAET_STATUS_LABEL.lager} {imLager}</span>
          <span><i className="dot dot-werkstatt" /> {GERAET_STATUS_LABEL.werkstatt} {inWerkstatt}</span>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>Offene Projekte</h2>
          <button className="linkbtn" onClick={() => nav({ name: "projekte" })}>Alle</button>
        </div>
        {offeneProjekte.length === 0 && <p className="muted">Keine offenen Projekte.</p>}
        {offeneProjekte.slice(0, 5).map((p) => {
          const geraeteImProjekt = db.einsatz.filter((e) => e.projekt_id === p.id && istLaufend(e)).length;
          return (
            <button key={p.id} className="listrow" onClick={() => nav({ name: "projekt", id: p.id })}>
              <div className="listrow-main">
                <span className="listrow-title">{p.projektnummer} · {p.bezeichnung}</span>
                <span className="listrow-sub">{p.adresse}</span>
              </div>
              <div className="listrow-side">
                <span className={`chip status-${p.status}`}>{PROJEKT_STATUS_LABEL[p.status]}</span>
                <span className="muted small">{geraeteImProjekt} Geräte</span>
              </div>
            </button>
          );
        })}
      </section>

      {echeckFaellig.length > 0 && (
        <section className="card warn">
          <div className="card-head"><h2>⚠ E-Check fällig</h2></div>
          {echeckFaellig.map((g) => {
            const ueberfaellig = new Date(g.e_check_datum!).getTime() < heute;
            return (
              <button key={g.inventarnummer} className="listrow" onClick={() => nav({ name: "geraet", inv: g.inventarnummer })}>
                <div className="listrow-main">
                  <span className="listrow-title">{g.inventarnummer}</span>
                  <span className="listrow-sub">{GERAET_STATUS_LABEL[g.status]}</span>
                </div>
                <span className={`chip ${ueberfaellig ? "chip-danger" : "chip-warn"}`}>
                  {ueberfaellig ? "überfällig seit " : "fällig "}{fmtDatum(g.e_check_datum)}
                </span>
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
}
