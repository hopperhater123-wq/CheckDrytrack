import { useDB } from "../app/useStore";
import { useNav } from "../app/nav";
import { GERAET_STATUS_LABEL } from "../app/labels";
import { fmtDatum, fmtDatumZeit, fmtZahl } from "../app/format";
import { berechneVerbrauch, einsatzTage, istLaufend } from "../domain/einsatz";
import { Icon } from "../ui/Icon";

// Geräte-Historie = gefilterte Sicht auf dieselben Einsatz-/Feed-Daten (FR-KOMM-002).
export function GeraetDetail({ inv }: { inv: string }) {
  const db = useDB();
  const nav = useNav();

  const g = db.geraet.find((x) => x.inventarnummer === inv);
  if (!g) return <div className="screen"><p className="muted">Gerät nicht gefunden.</p></div>;

  const typ = db.geraetetyp.find((t) => t.id === g.geraetetyp_id);
  const einsaetze = db.einsatz
    .filter((e) => e.geraet_inventarnummer === inv)
    .sort((a, b) => (a.aufbau_datum < b.aufbau_datum ? 1 : -1));
  const projektNummer = (pid: string) => db.projekt.find((p) => p.id === pid)?.projektnummer ?? "?";
  const echeckUeberfaellig = g.e_check_datum && new Date(g.e_check_datum).getTime() < Date.now();

  return (
    <div className="screen">
      <button className="back" onClick={() => nav({ name: "geraete" })}><Icon name="chevronLeft" size={16} /> Geräte</button>
      <div className="detail-head">
        <div>
          <h1>{g.inventarnummer}</h1>
          <p className="muted">{typ?.bezeichnung}</p>
        </div>
        <span className={`chip dot-chip dot-${g.status}`}>{GERAET_STATUS_LABEL[g.status]}</span>
      </div>

      <section className="card">
        <div className="card-head"><h2>Stammdaten</h2></div>
        <dl className="facts">
          <div><dt>Gerätetyp</dt><dd>{typ?.bezeichnung}</dd></div>
          <div><dt>Nennleistung</dt><dd>{typ?.leistungswert_kw != null ? `${fmtZahl(typ.leistungswert_kw, 2)} kW` : "—"}</dd></div>
          <div><dt>Luftleistung</dt><dd>{typ?.luftleistung_m3h != null ? `${fmtZahl(typ.luftleistung_m3h, 0)} m³/h` : "—"}</dd></div>
          <div><dt>Eigentum</dt><dd>{g.eigentum === "eigen" ? "Eigengerät" : "Mietgerät"}</dd></div>
          <div><dt>Aktuelles Projekt</dt><dd>{g.aktuelles_projekt_id ? projektNummer(g.aktuelles_projekt_id) : "—"}</dd></div>
          <div><dt>E-Check</dt><dd className={echeckUeberfaellig ? "danger-text" : ""}>{fmtDatum(g.e_check_datum)}{echeckUeberfaellig ? " ⚠" : ""}</dd></div>
        </dl>
      </section>

      <section className="card">
        <div className="card-head"><h2>Geräte-Historie <span className="count">{einsaetze.length}</span></h2></div>
        {einsaetze.length === 0 && <p className="muted">Noch keine Einsätze.</p>}
        {einsaetze.map((e) => {
          const verbrauch = berechneVerbrauch(e, g, typ);
          return (
            <button key={e.id} className="einsatz clickable" onClick={() => nav({ name: "projekt", id: e.projekt_id })}>
              <div className="einsatz-head">
                <span className="einsatz-geraet">{projektNummer(e.projekt_id)}</span>
                {istLaufend(e) ? <span className="chip chip-live">läuft</span> : <span className="chip">abgebaut</span>}
              </div>
              <div className="einsatz-meta">
                <span>{fmtDatumZeit(e.aufbau_datum)} → {istLaufend(e) ? "läuft" : fmtDatumZeit(e.abbau_datum)}</span>
                <span>{einsatzTage(e)} Tage</span>
                {verbrauch && <span className={verbrauch.geschaetzt ? "verbrauch-schaetz" : "verbrauch"}>{fmtZahl(verbrauch.verbrauch)} kWh{verbrauch.geschaetzt ? " (gesch.)" : ""}</span>}
              </div>
              {(e.foto_start || e.foto_ende) && (
                <div className="einsatz-fotos">
                  {e.foto_start && <img src={e.foto_start} alt="Zählerfoto Aufbau" title="Zählerfoto Aufbau" />}
                  {e.foto_ende && <img src={e.foto_ende} alt="Zählerfoto Abbau" title="Zählerfoto Abbau" />}
                </div>
              )}
              {e.notiz && <p className="einsatz-notiz">{e.notiz}</p>}
            </button>
          );
        })}
      </section>
    </div>
  );
}
