// PDF-Export via Druckdialog. Der Report wird in ein isoliertes iframe geschrieben
// und dort gedruckt (sandbox-sicher) — der Browser bietet „Als PDF speichern" an.
import type { Besuchsbericht, DryTrackDB, Projekt } from "./types";
import { bewerteMessung, BEWERTUNG_LABEL } from "./mess";
import { arbeitszeitMin, minutenZuText } from "./zeit";
import { berechneVerbrauch, einsatzTage, istLaufend } from "./einsatz";

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

const SCHICHT_LABEL: Record<string, string> = { oberbelag: "Oberbelag", estrich: "Estrich", daemmung: "Dämmstoff" };

export function messprotokollHtml(projekt: Projekt, db: DryTrackDB): string {
  const mat = (id: string) => db.materialdatenbank.find((m) => m.id === id);
  const benutzer = (id: string) => db.benutzer.find((b) => b.id === id)?.name ?? "—";
  const raeume = db.raum.filter((r) => r.projekt_id === projekt.id);

  const raumBlocks = raeume.map((r) => {
    const schichten = db.bodenaufbau_schicht.filter((s) => s.raum_id === r.id).sort((a, b) => a.reihenfolge - b.reihenfolge);
    const aufbau = schichten.length
      ? schichten.map((s) => `<li><b>${SCHICHT_LABEL[s.schicht_typ]}:</b> ${esc(mat(s.material_id)?.bezeichnung ?? "—")}</li>`).join("")
      : "<li class='muted'>kein Bodenaufbau erfasst</li>";

    const messungen = db.messung.filter((m) => m.raum_id === r.id).sort((a, b) => (a.gemessen_am < b.gemessen_am ? -1 : 1));
    const zeilen = messungen.map((m) => {
      const material = mat(m.material_id);
      const b = bewerteMessung(m, material);
      const wert = m.anzeige_digit != null ? `${m.anzeige_digit} Digits` : m.status_checkliste ? "Status" : "—";
      const gkg = m.absolute_feuchte_g_kg != null ? `${m.absolute_feuchte_g_kg} g/kg` : "—";
      return `<tr>
        <td>${esc(material?.bezeichnung ?? "—")}</td>
        <td>${m.anlass === "eingangsmessung" ? "Eingang" : "Frei"}</td>
        <td>${wert}</td>
        <td>${gkg}</td>
        <td class="b-${b.bewertung}">${BEWERTUNG_LABEL[b.bewertung]}${b.praxisrichtwert ? " ¹" : ""}</td>
        <td>${new Date(m.gemessen_am).toLocaleDateString("de-DE")}</td>
      </tr>`;
    }).join("");

    return `<section class="raum">
      <h3>${esc(r.bezeichnung)}</h3>
      <div class="aufbau"><span class="lbl">Bodenaufbau</span><ul>${aufbau}</ul></div>
      ${messungen.length ? `<table><thead><tr><th>Material</th><th>Anlass</th><th>Wert</th><th>abs. Feuchte</th><th>Bewertung</th><th>Datum</th></tr></thead><tbody>${zeilen}</tbody></table>` : "<p class='muted'>Keine Messungen erfasst.</p>"}
    </section>`;
  }).join("");

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Messprotokoll ${esc(projekt.projektnummer)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #0b0d12; margin: 32px; font-size: 13px; }
    header { border-bottom: 2px solid #4f46e5; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .brand span { color: #4f46e5; }
    h1 { font-size: 16px; margin: 0 0 2px; } h3 { font-size: 14px; margin: 0 0 8px; color: #4f46e5; }
    .meta { color: #667085; font-size: 12px; }
    .raum { margin-bottom: 22px; padding: 14px; border: 1px solid #e7e9ee; border-radius: 10px; page-break-inside: avoid; }
    .aufbau { margin-bottom: 10px; } .aufbau .lbl { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #667085; }
    .aufbau ul { margin: 4px 0 0; padding-left: 18px; } .aufbau li { margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #667085; border-bottom: 1px solid #e7e9ee; padding: 6px 8px; }
    td { padding: 7px 8px; border-bottom: 1px solid #f0f1f4; }
    .muted { color: #98a1b0; }
    .b-trocken { color: #059669; font-weight: 600; } .b-feucht, .b-kontaminiert, .b-austausch { color: #dc2626; font-weight: 600; } .b-grenzwertig { color: #d97706; font-weight: 600; }
    footer { margin-top: 24px; font-size: 11px; color: #98a1b0; border-top: 1px solid #e7e9ee; padding-top: 10px; }
  </style></head><body>
    <header>
      <div><div class="brand">◐ Dry<span>Track</span></div><h1 style="margin-top:8px">Messprotokoll</h1></div>
      <div class="meta">
        <div><b>${esc(projekt.projektnummer)}</b> · ${esc(projekt.bezeichnung)}</div>
        <div>${esc(projekt.adresse)}</div>
        <div>Erstellt am ${new Date().toLocaleDateString("de-DE")} · ${esc(benutzer(projekt.angelegt_von))}</div>
      </div>
    </header>
    ${raumBlocks || "<p class='muted'>Keine Räume erfasst.</p>"}
    <footer>¹ Praxisrichtwert (kein DIN-Normwert). Widerstandsmessung maßgeblich; dielektrische Werte sind Orientierung. Richtwert absolute Feuchte ≤ 10 g/kg = trocken.</footer>
  </body></html>`;
}

/** Besuchsbericht mit Stundennachweis — Layout angelehnt an den Alt-System-Bericht. */
export function besuchsberichtHtml(bericht: Besuchsbericht, projekt: Projekt, db: DryTrackDB): string {
  const benutzer = (id: string) => db.benutzer.find((b) => b.id === id)?.name ?? "—";
  const stunden = db.stunden_eintrag.filter((s) => s.besuchsbericht_id === bericht.id);

  let gesamtMin = 0;
  const zeilen = stunden.map((s) => {
    const min = arbeitszeitMin(s.von, s.bis, s.pause_min);
    if (min !== null) gesamtMin += min;
    return `<tr>
      <td>${esc(s.mitarbeiter_name)}</td>
      <td>${esc(s.gewerk)}</td>
      <td>${esc(s.von)}</td>
      <td>${esc(s.bis)}</td>
      <td>${s.pause_min}</td>
      <td><b>${min !== null ? minutenZuText(min) : "—"}</b></td>
    </tr>`;
  }).join("");

  const absatz = (t: string) => esc(t).replace(/\n/g, "<br>");

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Besuchsbericht ${esc(projekt.projektnummer)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #0b0d12; margin: 32px; font-size: 13px; }
    header { border-bottom: 2px solid #4f46e5; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; } .brand span { color: #4f46e5; }
    h1 { font-size: 16px; margin: 0 0 2px; } h3 { font-size: 12px; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: .05em; color: #667085; }
    .meta { color: #667085; font-size: 12px; text-align: right; }
    .kopf { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 6px; }
    .kopf div { border: 1px solid #e7e9ee; border-radius: 8px; padding: 8px 10px; }
    .kopf .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #667085; display: block; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #667085; border-bottom: 1px solid #e7e9ee; padding: 6px 8px; }
    td { padding: 7px 8px; border-bottom: 1px solid #f0f1f4; }
    tfoot td { border-top: 2px solid #e7e9ee; border-bottom: none; font-weight: 700; }
    .text { border: 1px solid #e7e9ee; border-radius: 8px; padding: 10px 12px; line-height: 1.5; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 8px; page-break-inside: avoid; }
    .sig img { height: 64px; max-width: 100%; object-fit: contain; display: block; }
    .sig-leer { height: 64px; }
    .sig-linie { border-bottom: 1px solid #0b0d12; margin-top: 2px; }
    .sig-label { font-size: 11px; color: #667085; margin-top: 4px; }
    footer { margin-top: 28px; font-size: 11px; color: #98a1b0; border-top: 1px solid #e7e9ee; padding-top: 10px; }
  </style></head><body>
    <header>
      <div><div class="brand">◐ Dry<span>Track</span></div><h1 style="margin-top:8px">Besuchsbericht · Stundennachweis</h1></div>
      <div class="meta">
        <div><b>${esc(projekt.projektnummer)}</b> · ${esc(projekt.bezeichnung)}</div>
        <div>${esc(projekt.adresse)}</div>
        <div>Erstellt von ${esc(benutzer(bericht.erstellt_von))}</div>
      </div>
    </header>

    <div class="kopf">
      <div><span class="lbl">Datum</span><b>${new Date(bericht.datum).toLocaleDateString("de-DE")}</b></div>
      <div><span class="lbl">Nächster Termin</span><b>${bericht.naechster_termin ? new Date(bericht.naechster_termin).toLocaleDateString("de-DE") : "—"}</b></div>
      <div><span class="lbl">Fahrtkilometer</span><b>${bericht.fahrtkilometer ?? 0} km</b></div>
    </div>

    <h3>Stundennachweis</h3>
    <table>
      <thead><tr><th>Mitarbeiter</th><th>Gewerk</th><th>Von</th><th>Bis</th><th>Pause (min)</th><th>Arbeitszeit</th></tr></thead>
      <tbody>${zeilen || "<tr><td colspan='6' style='color:#98a1b0'>Keine Einträge</td></tr>"}</tbody>
      <tfoot><tr><td colspan="5">Gesamt</td><td>${minutenZuText(gesamtMin)}</td></tr></tfoot>
    </table>

    ${bericht.bemerkungen ? `<h3>Bemerkungen</h3><div class="text">${absatz(bericht.bemerkungen)}</div>` : ""}
    <h3>Geleistete Arbeiten</h3><div class="text">${absatz(bericht.geleistete_arbeiten)}</div>

    <h3>Unterschriften</h3>
    <div class="sig-grid">
      <div class="sig">
        ${bericht.unterschrift_kunde ? `<img src="${bericht.unterschrift_kunde}" alt="Unterschrift Kunde">` : `<div class="sig-leer"></div>`}
        <div class="sig-linie"></div>
        <div class="sig-label">Kunde / Auftraggeber${bericht.unterschrift_kunde_name ? ` · ${esc(bericht.unterschrift_kunde_name)}` : ""}</div>
      </div>
      <div class="sig">
        ${bericht.unterschrift_mitarbeiter ? `<img src="${bericht.unterschrift_mitarbeiter}" alt="Unterschrift Mitarbeiter">` : `<div class="sig-leer"></div>`}
        <div class="sig-linie"></div>
        <div class="sig-label">Mitarbeiter · ${esc(benutzer(bericht.erstellt_von))}</div>
      </div>
    </div>

    <footer>DryTrack · Besuchsbericht vom ${new Date(bericht.datum).toLocaleDateString("de-DE")} · erstellt am ${new Date(bericht.erstellt_am).toLocaleString("de-DE")}</footer>
  </body></html>`;
}

/**
 * Strombrief (14 · Dokumente): Nachweis von Einsatzdauer und Stromverbrauch je Gerät.
 * Verbrauch = Zählerdifferenz (FR-EINSATZ-002) bzw. Näherung Tage × kW × 24 h bei
 * defektem Zähler (FR-EINSATZ-003, im Brief als "ohne Gewähr" gekennzeichnet).
 */
export function strombriefHtml(projekt: Projekt, db: DryTrackDB): string {
  const raumName = (rid: string | null) => (rid ? db.raum.find((r) => r.id === rid)?.bezeichnung ?? "—" : "—");
  const einsaetze = db.einsatz
    .filter((e) => e.projekt_id === projekt.id)
    .sort((a, b) => (a.aufbau_datum < b.aufbau_datum ? -1 : 1));

  let summe = 0;
  let gabSchaetzung = false;
  const zeilen = einsaetze.map((e) => {
    const g = db.geraet.find((x) => x.inventarnummer === e.geraet_inventarnummer);
    const typ = db.geraetetyp.find((t) => t.id === g?.geraetetyp_id);
    const laeuft = istLaufend(e);
    const v = g ? berechneVerbrauch(e, g, typ) : null;
    if (v && !laeuft) { summe += v.verbrauch; if (v.geschaetzt) gabSchaetzung = true; }
    return `<tr>
      <td>${esc(e.geraet_inventarnummer)}<br><span class="sub">${esc(typ?.bezeichnung ?? "")}</span></td>
      <td>${esc(raumName(e.raum_id))}</td>
      <td>${new Date(e.aufbau_datum).toLocaleDateString("de-DE")}</td>
      <td>${laeuft ? "läuft" : new Date(e.abbau_datum!).toLocaleDateString("de-DE")}</td>
      <td class="num">${einsatzTage(e)}</td>
      <td class="num">${e.zaehlerstand_ende != null ? esc(e.zaehlerstand_start.toLocaleString("de-DE")) + " → " + e.zaehlerstand_ende.toLocaleString("de-DE") : "—"}</td>
      <td class="num">${laeuft ? "<span class='sub'>offen</span>" : v ? esc(v.verbrauch.toLocaleString("de-DE", { maximumFractionDigits: 1 })) + (v.geschaetzt ? " ¹" : "") : "—"}</td>
    </tr>`;
  }).join("");

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Strombrief ${esc(projekt.projektnummer)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #0b0d12; margin: 32px; font-size: 13px; }
    header { border-bottom: 2px solid #4f46e5; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; } .brand span { color: #4f46e5; }
    h1 { font-size: 16px; margin: 0 0 2px; } .meta { color: #667085; font-size: 12px; text-align: right; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #667085; border-bottom: 1px solid #e7e9ee; padding: 6px 8px; }
    td { padding: 7px 8px; border-bottom: 1px solid #f0f1f4; vertical-align: top; }
    td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
    .sub { color: #98a1b0; font-size: 11px; }
    tfoot td { border-top: 2px solid #e7e9ee; font-weight: 700; font-size: 14px; }
    footer { margin-top: 22px; font-size: 11px; color: #98a1b0; border-top: 1px solid #e7e9ee; padding-top: 10px; }
  </style></head><body>
    <header>
      <div><div class="brand">◐ Dry<span>Track</span></div><h1 style="margin-top:8px">Strombrief</h1></div>
      <div class="meta">
        <div><b>${esc(projekt.projektnummer)}</b> · ${esc(projekt.bezeichnung)}</div>
        <div>${esc(projekt.adresse)}</div>
        <div>Erstellt am ${new Date().toLocaleDateString("de-DE")}</div>
      </div>
    </header>
    <table>
      <thead><tr><th>Gerät</th><th>Raum</th><th>Aufbau</th><th>Abbau</th><th class="num">Tage</th><th class="num">Zählerstand (kWh)</th><th class="num">Verbrauch (kWh)</th></tr></thead>
      <tbody>${zeilen || "<tr><td colspan='7' class='sub'>Keine Einsätze erfasst.</td></tr>"}</tbody>
      <tfoot><tr><td colspan="6">Gesamtverbrauch (abgeschlossene Einsätze)</td><td class="num">${summe.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kWh</td></tr></tfoot>
    </table>
    <footer>${gabSchaetzung ? "¹ Näherungswert (Tage × Geräteleistung), Zähler defekt/unlesbar — ohne Gewähr (FR-EINSATZ-003). " : ""}Laufende Einsätze sind noch nicht abgerechnet. DryTrack · Strombrief zum ${new Date().toLocaleDateString("de-DE")}.</footer>
  </body></html>`;
}

/** Öffnet den Druckdialog für den übergebenen HTML-Report in einem isolierten iframe. */
export function printHtml(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0"; iframe.style.bottom = "0";
  iframe.style.width = "0"; iframe.style.height = "0"; iframe.style.border = "0";
  iframe.srcdoc = html;
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => iframe.remove(), 1000);
    }
  };
  document.body.appendChild(iframe);
}
