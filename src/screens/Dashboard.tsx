import { useDB } from "../app/useStore";
import { useSession } from "../app/session";
import { useNav } from "../app/nav";
import { GERAET_STATUS_LABEL, PROJEKT_STATUS_LABEL } from "../app/labels";
import { fmtDatum } from "../app/format";
import { istLaufend } from "../domain/einsatz";
import { Icon, type IconName } from "../ui/Icon";

// Live-Übersicht als Bento-Grid — ruhig, scanbar, eine Akzentfarbe.
export function Dashboard() {
  const db = useDB();
  const { user } = useSession();
  const nav = useNav();

  const gesamt = db.geraet.length;
  const imEinsatz = db.geraet.filter((g) => g.status === "baustelle").length;
  const imLager = db.geraet.filter((g) => g.status === "lager").length;
  const inWerkstatt = db.geraet.filter((g) => g.status === "werkstatt").length;
  const offene = db.projekt.filter((p) => !p.storniert && p.status !== "abgeschlossen");
  const laufende = db.einsatz.filter(istLaufend).length;
  const auslastung = gesamt ? Math.round((imEinsatz / gesamt) * 100) : 0;

  const heute = Date.now();
  const echeck = db.geraet
    .filter((g) => g.e_check_datum && new Date(g.e_check_datum).getTime() - heute < 30 * 864e5)
    .sort((a, b) => (a.e_check_datum! < b.e_check_datum! ? -1 : 1));

  const pct = (n: number) => (gesamt ? (n / gesamt) * 100 : 0);

  return (
    <div className="screen">
      <div className="bento">
        {/* Hero */}
        <section className="tile accent col-all hero">
          <div className="hero-row">
            <div>
              <span className="eyebrow">{new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })}</span>
              <h1>Guten Tag, {user.name.split(" ")[0]}.</h1>
              <p className="muted" style={{ margin: 0 }}>{offene.length} offene Projekte · {laufende} Geräte trocknen gerade.</p>
            </div>
            <button className="btn" style={{ background: "rgba(255,255,255,.16)", color: "#fff", borderColor: "transparent" }} onClick={() => nav({ name: "scan" })}>
              <Icon name="scan" size={18} /> Scannen
            </button>
          </div>
        </section>

        {/* KPIs */}
        <Kpi value={imEinsatz} label="Im Einsatz" icon="wind" onClick={() => nav({ name: "geraete" })} />
        <Kpi value={imLager} label="Frei im Lager" icon="layers" onClick={() => nav({ name: "geraete" })} />
        <Kpi value={offene.length} label="Offene Projekte" icon="folder" onClick={() => nav({ name: "projekte" })} />
        <Kpi value={laufende} label="Laufende Einsätze" icon="clock" />

        {/* Auslastung */}
        <section className="tile col-2">
          <div className="card-head"><h2>Geräteauslastung</h2><span className="kpi-value" style={{ fontSize: "1.3rem" }}>{auslastung}%</span></div>
          <div className="bar">
            <div className="bar-seg baustelle" style={{ width: `${pct(imEinsatz)}%` }} />
            <div className="bar-seg lager" style={{ width: `${pct(imLager)}%` }} />
            <div className="bar-seg werkstatt" style={{ width: `${pct(inWerkstatt)}%` }} />
          </div>
          <div className="legend">
            <span><i className="dot baustelle" />{GERAET_STATUS_LABEL.baustelle} <b>{imEinsatz}</b></span>
            <span><i className="dot lager" />{GERAET_STATUS_LABEL.lager} <b>{imLager}</b></span>
            <span><i className="dot werkstatt" />{GERAET_STATUS_LABEL.werkstatt} <b>{inWerkstatt}</b></span>
          </div>
        </section>

        {/* E-Check */}
        <section className={`tile col-2${echeck.length ? " warn" : ""}`}>
          <div className="card-head">
            <h2>{echeck.length ? "E-Check fällig" : "E-Check"}</h2>
            {echeck.length > 0 && <span className="chip chip-warn"><Icon name="alert" size={13} /> {echeck.length}</span>}
          </div>
          {echeck.length === 0 && <p className="muted small" style={{ margin: 0 }}>Alle Prüfungen aktuell. ✓</p>}
          {echeck.slice(0, 3).map((g) => {
            const ueber = new Date(g.e_check_datum!).getTime() < heute;
            return (
              <button key={g.inventarnummer} className="listrow" onClick={() => nav({ name: "geraet", inv: g.inventarnummer })}>
                <div className="listrow-main">
                  <span className="listrow-title">{g.inventarnummer}</span>
                  <span className="listrow-sub">{GERAET_STATUS_LABEL[g.status]}</span>
                </div>
                <span className={`chip ${ueber ? "chip-danger" : "chip-warn"}`}>{ueber ? "überfällig" : fmtDatum(g.e_check_datum)}</span>
              </button>
            );
          })}
        </section>

        {/* Offene Projekte */}
        <section className="tile col-all">
          <div className="card-head"><h2>Offene Projekte</h2>
            <button className="linkbtn" onClick={() => nav({ name: "projekte" })}>Alle ansehen</button>
          </div>
          {offene.length === 0 && <p className="muted">Keine offenen Projekte.</p>}
          {offene.slice(0, 5).map((p) => {
            const geraete = db.einsatz.filter((e) => e.projekt_id === p.id && istLaufend(e)).length;
            return (
              <button key={p.id} className="listrow" onClick={() => nav({ name: "projekt", id: p.id })}>
                <div className="listrow-main">
                  <span className="listrow-title">{p.projektnummer} · {p.bezeichnung}</span>
                  <span className="listrow-sub">{p.adresse}</span>
                </div>
                <div className="listrow-side">
                  <span className={`chip status-${p.status}`}>{PROJEKT_STATUS_LABEL[p.status]}</span>
                  {geraete > 0 && <span className="muted small">{geraete} Geräte</span>}
                </div>
              </button>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function Kpi({ value, label, icon, onClick }: { value: number; label: string; icon: IconName; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={`tile${onClick ? " click" : ""}`} onClick={onClick} style={{ textAlign: "left" }}>
      <span className="kpi-value">{value}</span>
      <span className="kpi-label"><span className="kpi-ico"><Icon name={icon} size={15} /></span>{label}</span>
    </Tag>
  );
}
