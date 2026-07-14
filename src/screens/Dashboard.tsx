import { useDB } from "../app/useStore";
import { useSession } from "../app/session";
import { useNav } from "../app/nav";
import { FEED_KATEGORIE_LABEL, FEED_URSPRUNG_LABEL, PROJEKT_STATUS_LABEL, PROJEKT_STATUS_REIHENFOLGE } from "../app/labels";
import { relativZeit } from "../app/format";
import { istLaufend } from "../domain/einsatz";
import { Icon, type IconName } from "../ui/Icon";
import { motion, staggerContainer, fadeUpItem } from "../ui/motion";
import type { FeedUrsprung } from "../domain/types";

// Farbrampe für den Geräteverteilungs-Donut (Akzent → Ausläufer).
const DONUT_FARBEN = ["#4f46e5", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#94a3b8"];

const geraeteText = (n: number) => `${n} ${n === 1 ? "Gerät" : "Geräte"}`;

const AKTIVITAET_ICON: Record<FeedUrsprung, IconName> = {
  scan: "scan", zaehlerstand: "gauge", teilabbau: "wind", e_check_faellig: "alert",
  check_in: "clock", check_out: "clock", manuell: "fileText",
};

export function Dashboard() {
  const db = useDB();
  const { user } = useSession();
  const nav = useNav();

  const imEinsatz = db.geraet.filter((g) => g.status === "baustelle").length;
  const imLager = db.geraet.filter((g) => g.status === "lager").length;
  const inWerkstatt = db.geraet.filter((g) => g.status === "werkstatt").length;
  const offene = db.projekt.filter((p) => !p.storniert && p.status !== "abgeschlossen");
  const laufende = db.einsatz.filter(istLaufend).length;

  // E-Check-Triage: überfällig / ≤7 Tage / ≤30 Tage / in Ordnung
  const heute = Date.now();
  const tage = (d: string) => (new Date(d).getTime() - heute) / 864e5;
  const mitEcheck = db.geraet.filter((g) => g.e_check_datum);
  const ueberfaellig = mitEcheck.filter((g) => tage(g.e_check_datum!) < 0).length;
  const in7 = mitEcheck.filter((g) => { const t = tage(g.e_check_datum!); return t >= 0 && t <= 7; }).length;
  const in30 = mitEcheck.filter((g) => { const t = tage(g.e_check_datum!); return t > 7 && t <= 30; }).length;
  const inOrdnung = db.geraet.length - ueberfaellig - in7 - in30;

  // Geräteverteilung nach Typ
  const verteilung = db.geraetetyp
    .map((t) => ({ label: t.bezeichnung, value: db.geraet.filter((g) => g.geraetetyp_id === t.id).length }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  // Globale letzte Aktivitäten (Audit-Trail aus allen Projekt-Feeds)
  const aktivitaeten = [...db.feed_eintrag]
    .sort((a, b) => (a.erstellt_am < b.erstellt_am ? 1 : -1))
    .slice(0, 4);
  const projektNr = (pid: string) => db.projekt.find((p) => p.id === pid)?.projektnummer ?? "";

  const stunde = new Date().getHours();
  const gruss = stunde < 11 ? "Guten Morgen" : stunde < 18 ? "Guten Tag" : "Guten Abend";

  return (
    <div className="screen">
      <motion.div className="bento" variants={staggerContainer} initial="hidden" animate="show">
        {/* Hero */}
        <motion.section variants={fadeUpItem} className="tile accent col-all hero">
          <div className="hero-row">
            <div>
              <span className="eyebrow">{new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })}</span>
              <h1>{gruss}, {user.name.split(" ")[0]}.</h1>
              <p className="muted" style={{ margin: 0 }}>Alles im Blick. Alles im Griff.</p>
            </div>
            <button className="btn" style={{ background: "rgba(255,255,255,.16)", color: "#fff", borderColor: "transparent" }} onClick={() => nav({ name: "scan" })}>
              <Icon name="scan" size={18} /> Scannen
            </button>
          </div>
        </motion.section>

        {/* KPIs */}
        <Kpi value={offene.length} label="Aktive Projekte" icon="folder" onClick={() => nav({ name: "projekte" })} />
        <Kpi value={imEinsatz} label="Geräte im Einsatz" icon="wind" onClick={() => nav({ name: "geraete" })} />
        <Kpi value={imLager} label="Frei im Lager" icon="layers" onClick={() => nav({ name: "geraete" })} />
        <Kpi value={laufende} label="Laufende Einsätze" icon="clock" />

        {/* Aktive Projekte mit Fortschritt */}
        <motion.section variants={fadeUpItem} className="tile col-2">
          <div className="card-head"><h2>Aktive Projekte</h2>
            <button className="linkbtn" onClick={() => nav({ name: "projekte" })}>Alle anzeigen</button>
          </div>
          {offene.length === 0 && <p className="muted">Keine offenen Projekte.</p>}
          {offene.slice(0, 5).map((p) => {
            const idx = PROJEKT_STATUS_REIHENFOLGE.indexOf(p.status);
            const prog = Math.round((idx / (PROJEKT_STATUS_REIHENFOLGE.length - 1)) * 100);
            return (
              <button key={p.id} className="projrow" onClick={() => nav({ name: "projekt", id: p.id })}>
                <div className="projrow-top">
                  <div className="listrow-main">
                    <span className="listrow-title">{p.bezeichnung}</span>
                    <span className="listrow-sub">{p.projektnummer} · {p.adresse.split(",").pop()?.trim()}</span>
                  </div>
                  <span className={`chip small status-${p.status}`}>{PROJEKT_STATUS_LABEL[p.status]}</span>
                </div>
                <div className="proj-progress">
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${prog}%` }} /></div>
                  <span className="pct">{prog}%</span>
                </div>
              </button>
            );
          })}
        </motion.section>

        {/* E-Check Übersicht (Triage-Buckets) */}
        <motion.section variants={fadeUpItem} className="tile col-2">
          <div className="card-head"><h2>E-Check Übersicht</h2>
            {(ueberfaellig + in7) > 0 && <span className="chip chip-danger"><Icon name="alert" size={13} /> {ueberfaellig + in7}</span>}
          </div>
          {ueberfaellig > 0 && <Bucket farbe="var(--danger)" label="Überfällig" wert={geraeteText(ueberfaellig)} tone="danger" onClick={() => nav({ name: "geraete" })} />}
          <Bucket farbe="var(--danger)" label="Fällig in 7 Tagen" wert={geraeteText(in7)} tone={in7 ? "danger" : undefined} onClick={() => nav({ name: "geraete" })} />
          <Bucket farbe="var(--warn)" label="Fällig in 30 Tagen" wert={geraeteText(in30)} tone={in30 ? "warn" : undefined} onClick={() => nav({ name: "geraete" })} />
          <Bucket farbe="var(--ok)" label="In Ordnung" wert={geraeteText(inOrdnung)} tone="ok" onClick={() => nav({ name: "geraete" })} />
          <button className="linkbtn" style={{ marginTop: 10 }} onClick={() => nav({ name: "geraete" })}>Zur Geräteübersicht →</button>
        </motion.section>

        {/* Termine heute/morgen */}
        <TermineKachel />

        {/* Einsätze auf einen Blick (schematische Karte aus Geo-Koordinaten) */}
        <EinsatzKarte />

        {/* Geräteverteilung */}
        <motion.section variants={fadeUpItem} className="tile col-2">
          <div className="card-head"><h2>Geräteverteilung</h2></div>
          <div className="donut-wrap">
            <Donut data={verteilung} total={db.geraet.length} />
            <div className="donut-legend">
              {verteilung.map((d, i) => (
                <div key={d.label} className="row">
                  <span className="name"><i className="ldot" style={{ background: DONUT_FARBEN[i % DONUT_FARBEN.length] }} />{d.label}</span>
                  <b>{Math.round((d.value / Math.max(1, db.geraet.length)) * 100)}%</b>
                </div>
              ))}
            </div>
          </div>
          {inWerkstatt > 0 && <p className="muted small" style={{ marginBottom: 0 }}>{geraeteText(inWerkstatt)} aktuell in der Werkstatt.</p>}
        </motion.section>

        {/* Letzte Aktivitäten */}
        <motion.section variants={fadeUpItem} className="tile col-2">
          <div className="card-head"><h2>Letzte Aktivitäten</h2></div>
          {aktivitaeten.length === 0 && <p className="muted small">Noch keine Aktivitäten.</p>}
          {aktivitaeten.map((f) => (
            <button key={f.id} className="activity" onClick={() => nav({ name: "projekt", id: f.projekt_id })}>
              <span className="iconbox"><Icon name={AKTIVITAET_ICON[f.ursprung]} size={15} /></span>
              <div style={{ minWidth: 0 }}>
                <div className="activity-text">{f.inhalt}</div>
                <div className="muted small">
                  {projektNr(f.projekt_id)} · {f.ursprung === "manuell" && f.kategorie ? FEED_KATEGORIE_LABEL[f.kategorie] : FEED_URSPRUNG_LABEL[f.ursprung]} · {relativZeit(f.erstellt_am)}
                </div>
              </div>
            </button>
          ))}
        </motion.section>
      </motion.div>
    </div>
  );
}

/**
 * Schematische Einsatzkarte: Projekt-Pins aus geo_lat/geo_lng (relative Lage, Luftlinie),
 * Pin-Zahl = laufende Geräte. Bewusst ohne externe Karten-Tiles (offlinefähig, CSP-sicher) —
 * echtes Kartenmaterial + Geocoding kommt mit der Office-Anbindung.
 */
function EinsatzKarte() {
  const db = useDB();
  const nav = useNav();
  const punkte = db.projekt
    .filter((p) => !p.storniert && p.status !== "abgeschlossen" && p.geo_lat != null && p.geo_lng != null)
    .map((p) => ({
      p,
      laufend: db.einsatz.filter((e) => e.projekt_id === p.id && istLaufend(e)).length,
      ort: (p.adresse.split(",").pop() ?? "").replace(/\d+/g, "").trim(),
    }));
  if (punkte.length === 0) return null;

  const lats = punkte.map((x) => x.p.geo_lat!), lngs = punkte.map((x) => x.p.geo_lng!);
  const spanLat = Math.max(0.2, Math.max(...lats) - Math.min(...lats));
  const spanLng = Math.max(0.3, Math.max(...lngs) - Math.min(...lngs));
  const W = 400, H = 210, PAD = 56;
  const x = (lng: number) => PAD + ((lng - Math.min(...lngs)) / spanLng) * (W - 2 * PAD);
  const y = (lat: number) => H - PAD - ((lat - Math.min(...lats)) / spanLat) * (H - 2 * PAD);

  return (
    <motion.section variants={fadeUpItem} className="tile col-2">
      <div className="card-head"><h2>Einsätze auf einen Blick</h2>
        <span className="muted small">schematisch</span>
      </div>
      <svg className="karte" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Schematische Karte der Einsatzorte">
        <defs>
          <pattern id="kgrid" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.2" fill="var(--border)" />
          </pattern>
        </defs>
        <rect width={W} height={H} rx="12" fill="var(--surface-2)" />
        <rect width={W} height={H} rx="12" fill="url(#kgrid)" />
        {punkte.map(({ p, laufend, ort }) => (
          <g key={p.id} className="pin" onClick={() => nav({ name: "projekt", id: p.id })}>
            <circle cx={x(p.geo_lng!)} cy={y(p.geo_lat!)} r="17" fill="var(--accent)" opacity="0.18" />
            <circle cx={x(p.geo_lng!)} cy={y(p.geo_lat!)} r="11" fill="var(--accent)" />
            <text x={x(p.geo_lng!)} y={y(p.geo_lat!) + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--on-accent)">{laufend}</text>
            <text x={x(p.geo_lng!)} y={y(p.geo_lat!) + 30} textAnchor="middle" fontSize="9.5" fill="var(--muted)">{ort}</text>
          </g>
        ))}
      </svg>
      <p className="muted small" style={{ marginBottom: 0 }}>Zahl im Pin = laufende Geräte · Tippen öffnet das Projekt · relative Lage (Luftlinie)</p>
    </motion.section>
  );
}

function TermineKachel() {
  const db = useDB();
  const nav = useNav();
  const heute = new Date().toISOString().slice(0, 10);
  const morgen = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const anstehend = db.termin
    .filter((t) => !t.erledigt && (t.datum === heute || t.datum === morgen))
    .sort((a, b) => (a.datum + (a.uhrzeit ?? "99")) < (b.datum + (b.uhrzeit ?? "99")) ? -1 : 1)
    .slice(0, 3);
  const projektNr = (pid: string) => db.projekt.find((p) => p.id === pid)?.projektnummer ?? "";

  return (
    <motion.section variants={fadeUpItem} className="tile col-2">
      <div className="card-head"><h2>Termine</h2>
        <button className="linkbtn" onClick={() => nav({ name: "termine" })}>Wochenansicht</button>
      </div>
      {anstehend.length === 0 && <p className="muted small">Heute und morgen keine offenen Termine.</p>}
      {anstehend.map((t) => (
        <button key={t.id} className="activity" onClick={() => nav({ name: "projekt", id: t.projekt_id })}>
          <span className="iconbox"><Icon name="calendar" size={15} /></span>
          <div style={{ minWidth: 0 }}>
            <div className="activity-text">{t.beschreibung}</div>
            <div className="muted small">{t.datum === heute ? "Heute" : "Morgen"}{t.uhrzeit ? `, ${t.uhrzeit}` : ""} · {projektNr(t.projekt_id)}</div>
          </div>
        </button>
      ))}
    </motion.section>
  );
}

function Kpi({ value, label, icon, onClick }: { value: number; label: string; icon: IconName; onClick?: () => void }) {
  const Tag = onClick ? motion.button : motion.div;
  return (
    <Tag className={`tile${onClick ? " click" : ""}`} variants={fadeUpItem} onClick={onClick} style={{ textAlign: "left" }}>
      <div className="kpi-head">
        <span className="iconbox"><Icon name={icon} size={16} /></span>
        <span className="kpi-label2">{label}</span>
      </div>
      <span className="kpi-value">{value}</span>
    </Tag>
  );
}

function Bucket({ farbe, label, wert, tone, onClick }: { farbe: string; label: string; wert: string; tone?: "danger" | "warn" | "ok"; onClick: () => void }) {
  return (
    <button className="bucket" onClick={onClick}>
      <span className="b-label"><i className="bdot" style={{ background: farbe }} />{label}</span>
      <b className={tone ? `t-${tone}` : undefined}>{wert}</b>
    </button>
  );
}

function Donut({ data, total }: { data: { label: string; value: number }[]; total: number }) {
  const R = 38, C = 2 * Math.PI * R;
  const sum = data.reduce((s, d) => s + d.value, 0) || 1;
  let cum = 0;
  return (
    <svg viewBox="0 0 100 100" width={112} height={112} role="img" aria-label="Geräteverteilung">
      <circle cx="50" cy="50" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="13" />
      {data.map((d, i) => {
        const frac = d.value / sum;
        const el = (
          <circle
            key={d.label} cx="50" cy="50" r={R} fill="none"
            stroke={DONUT_FARBEN[i % DONUT_FARBEN.length]} strokeWidth="13"
            strokeDasharray={`${frac * C} ${C - frac * C}`}
            strokeDashoffset={-cum * C}
            transform="rotate(-90 50 50)"
          />
        );
        cum += frac;
        return el;
      })}
      <text x="50" y="47" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--text)">{total}</text>
      <text x="50" y="62" textAnchor="middle" fontSize="8.5" fill="var(--muted)">Gesamt</text>
    </svg>
  );
}
