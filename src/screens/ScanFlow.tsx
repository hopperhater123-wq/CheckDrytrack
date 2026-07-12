import { useState } from "react";
import { useDB } from "../app/useStore";
import { useSession } from "../app/session";
import { useNav } from "../app/nav";
import { store } from "../domain/store";
import { GERAET_STATUS_LABEL } from "../app/labels";
import { fmtZahl } from "../app/format";
import { AbbauModal } from "./AbbauModal";
import type { Einsatz } from "../domain/types";

// Scanner-Flow (08 Scanner / 10 Einsätze). Kamera-Scan in Produktion;
// hier manuelle Inventarnummer-Eingabe (auch der dokumentierte Fallback FR-SCAN-001).
export function ScanFlow() {
  const db = useDB();
  const { user } = useSession();
  const nav = useNav();
  const [eingabe, setEingabe] = useState("");
  const [inv, setInv] = useState<string | null>(null);
  const [abbau, setAbbau] = useState<Einsatz | null>(null);

  const geraet = inv ? db.geraet.find((g) => g.inventarnummer === inv) : undefined;
  const typ = geraet ? db.geraetetyp.find((t) => t.id === geraet.geraetetyp_id) : undefined;
  const aktiverEinsatz = geraet?.status === "baustelle"
    ? db.einsatz.find((e) => e.geraet_inventarnummer === geraet.inventarnummer && e.abbau_datum === null) ?? null
    : null;

  const suchen = () => {
    const code = eingabe.trim().toUpperCase();
    if (code) setInv(code);
  };
  const reset = () => { setEingabe(""); setInv(null); };

  return (
    <div className="screen">
      <h1>Scan</h1>
      <p className="muted">Barcode scannen oder Inventarnummer eingeben (FR-SCAN-001).</p>

      <div className="scanbox">
        <div className="scan-visual"><span>▚▚ ▚ ▚▚▚ ▚</span></div>
        <div className="inline-add">
          <input
            className="scan-input" placeholder="z. B. KT-1001" value={eingabe}
            onChange={(e) => setEingabe(e.target.value)} onKeyDown={(e) => e.key === "Enter" && suchen()} autoFocus
          />
          <button className="btn btn-primary" onClick={suchen} disabled={!eingabe.trim()}>Suchen</button>
        </div>
        {db.geraet.length > 0 && (
          <div className="quickpick">
            {db.geraet.slice(0, 6).map((g) => (
              <button key={g.inventarnummer} className="pill" onClick={() => { setEingabe(g.inventarnummer); setInv(g.inventarnummer); }}>{g.inventarnummer}</button>
            ))}
          </div>
        )}
      </div>

      {inv && !geraet && (
        <div className="banner danger">Kein Gerät mit Inventarnummer „{inv}" gefunden. Barcode defekt? Nummer prüfen.</div>
      )}

      {geraet && (
        <section className="card">
          <div className="detail-head">
            <div>
              <h2 style={{ margin: 0 }}>{geraet.inventarnummer}</h2>
              <p className="muted">{typ?.bezeichnung}</p>
            </div>
            <span className={`chip dot-chip dot-${geraet.status}`}>{GERAET_STATUS_LABEL[geraet.status]}</span>
          </div>

          {geraet.status === "werkstatt" && (
            <div className="banner">Gerät ist in der Werkstatt und kann nicht aufgebaut werden.</div>
          )}

          {geraet.status === "lager" && (
            <AufbauForm inv={geraet.inventarnummer} userId={user.id} onDone={(pid) => { reset(); nav({ name: "projekt", id: pid }); }} />
          )}

          {geraet.status === "baustelle" && aktiverEinsatz && (
            <div>
              <p className="muted">
                Läuft seit Aufbau · Start {fmtZahl(aktiverEinsatz.zaehlerstand_start)} kWh ·
                Projekt {db.projekt.find((p) => p.id === aktiverEinsatz.projekt_id)?.projektnummer}
              </p>
              <button className="btn btn-primary block" onClick={() => setAbbau(aktiverEinsatz)}>Gerät abbauen</button>
            </div>
          )}
        </section>
      )}

      {abbau && <AbbauModal einsatz={abbau} onClose={() => { setAbbau(null); reset(); }} />}
    </div>
  );
}

function AufbauForm({ inv, userId, onDone }: { inv: string; userId: string; onDone: (projektId: string) => void }) {
  const db = useDB();
  const offene = db.projekt.filter((p) => !p.storniert && p.status !== "abgeschlossen");
  const [projektId, setProjektId] = useState(offene[0]?.id ?? "");
  const [raumId, setRaumId] = useState("");
  const [start, setStart] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);

  const raeume = db.raum.filter((r) => r.projekt_id === projektId);
  const startNum = parseFloat(start.replace(",", "."));
  const gueltig = projektId && Number.isFinite(startNum) && startNum >= 0;

  const aufbauen = () => {
    setFehler(null);
    const res = store.aufbau({ inventarnummer: inv, projekt_id: projektId, raum_id: raumId || null, zaehlerstand_start: startNum, autor_id: userId });
    if (!res.ok) { setFehler(res.error ?? "Fehler"); return; }
    onDone(projektId);
  };

  if (offene.length === 0) return <div className="banner">Kein offenes Projekt vorhanden. Bitte zuerst ein Projekt anlegen.</div>;

  return (
    <div>
      <h3>Aufbau erfassen</h3>
      <label className="field"><span>Projekt</span>
        <select value={projektId} onChange={(e) => { setProjektId(e.target.value); setRaumId(""); }}>
          {offene.map((p) => <option key={p.id} value={p.id}>{p.projektnummer} · {p.bezeichnung}</option>)}
        </select>
      </label>
      <label className="field"><span>Raum (optional)</span>
        <select value={raumId} onChange={(e) => setRaumId(e.target.value)}>
          <option value="">— ohne Raum —</option>
          {raeume.map((r) => <option key={r.id} value={r.id}>{r.bezeichnung}</option>)}
        </select>
      </label>
      <label className="field"><span>Startzählerstand (kWh)</span>
        <input inputMode="decimal" value={start} onChange={(e) => setStart(e.target.value)} placeholder="z. B. 1240,5" />
      </label>
      {fehler && <p className="error">{fehler}</p>}
      <button className="btn btn-primary block" onClick={aufbauen} disabled={!gueltig}>Aufbau bestätigen</button>
    </div>
  );
}
