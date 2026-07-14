// PDF-Export via Druckdialog. Der Report wird in ein isoliertes iframe geschrieben
// und dort gedruckt (sandbox-sicher) — der Browser bietet „Als PDF speichern" an.
import type { Abnahmeprotokoll, Besuchsbericht, DryTrackDB, Ersatzfliesenbericht, Kundenzufriedenheit, Notdiensteinsatzbericht, Projekt } from "./types";
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

/** Notdienst-Einsatzbericht (14 · Dokumente): Erstmaßnahme/Notdienst mit Sofortmaßnahmen und Unterschriften. */
export function notdiensteinsatzberichtHtml(bericht: Notdiensteinsatzbericht, projekt: Projekt, db: DryTrackDB): string {
  const benutzer = (id: string) => db.benutzer.find((b) => b.id === id)?.name ?? "—";
  const absatz = (t: string) => esc(t).replace(/\n/g, "<br>");

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Notdienst-Einsatzbericht ${esc(projekt.projektnummer)}</title>
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
    .text { border: 1px solid #e7e9ee; border-radius: 8px; padding: 10px 12px; line-height: 1.5; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 14px; page-break-inside: avoid; }
    .sig img { height: 64px; max-width: 100%; object-fit: contain; display: block; }
    .sig-leer { height: 64px; }
    .sig-linie { border-bottom: 1px solid #0b0d12; margin-top: 2px; }
    .sig-label { font-size: 11px; color: #667085; margin-top: 4px; }
    footer { margin-top: 24px; font-size: 11px; color: #98a1b0; border-top: 1px solid #e7e9ee; padding-top: 10px; }
  </style></head><body>
    <header>
      <div><div class="brand">◐ Dry<span>Track</span></div><h1 style="margin-top:8px">Notdienst-Einsatzbericht</h1></div>
      <div class="meta">
        <div><b>${esc(projekt.projektnummer)}</b> · ${esc(projekt.bezeichnung)}</div>
        <div>${esc(projekt.adresse)}</div>
        <div>Erstellt von ${esc(benutzer(bericht.erstellt_von))}</div>
      </div>
    </header>

    <div class="kopf">
      <div><span class="lbl">Datum</span><b>${new Date(bericht.datum).toLocaleDateString("de-DE")}</b></div>
      <div><span class="lbl">Alarmierung</span><b>${bericht.alarmierung ? esc(bericht.alarmierung) + " Uhr" : "—"}</b></div>
      <div><span class="lbl">Ankunft</span><b>${bericht.ankunft ? esc(bericht.ankunft) + " Uhr" : "—"}</b></div>
    </div>

    ${bericht.schadenursache ? `<h3>Schadenursache</h3><div class="text">${absatz(bericht.schadenursache)}</div>` : ""}
    <h3>Durchgeführte Sofortmaßnahmen</h3><div class="text">${absatz(bericht.sofortmassnahmen)}</div>
    ${bericht.bemerkungen ? `<h3>Bemerkungen</h3><div class="text">${absatz(bericht.bemerkungen)}</div>` : ""}

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

    <footer>DryTrack · Notdienst-Einsatzbericht vom ${new Date(bericht.datum).toLocaleDateString("de-DE")} · erstellt am ${new Date(bericht.erstellt_am).toLocaleString("de-DE")}</footer>
  </body></html>`;
}

/** Kundenzufriedenheit (14 · Dokumente): Bewertung der Leistung durch den Kunden (1–5) mit Unterschrift. */
export function kundenzufriedenheitHtml(bericht: Kundenzufriedenheit, projekt: Projekt, db: DryTrackDB): string {
  const benutzer = (id: string) => db.benutzer.find((b) => b.id === id)?.name ?? "—";
  const absatz = (t: string) => esc(t).replace(/\n/g, "<br>");
  const sterne = (n: number) => `<span class="sterne"><span class="voll">${"★".repeat(n)}</span>${"★".repeat(5 - n)}</span> <span class="wert">${n}/5</span>`;
  const schnitt = ((bericht.bewertung_freundlichkeit + bericht.bewertung_sauberkeit + bericht.bewertung_termintreue + bericht.bewertung_qualitaet) / 4);
  const zeile = (label: string, n: number) => `<tr><td>${label}</td><td class="rate">${sterne(n)}</td></tr>`;

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Kundenzufriedenheit ${esc(projekt.projektnummer)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #0b0d12; margin: 32px; font-size: 13px; }
    header { border-bottom: 2px solid #4f46e5; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; } .brand span { color: #4f46e5; }
    h1 { font-size: 16px; margin: 0 0 2px; } h3 { font-size: 12px; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: .05em; color: #667085; }
    .meta { color: #667085; font-size: 12px; text-align: right; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    td { padding: 8px 8px; border-bottom: 1px solid #f0f1f4; }
    td.rate { text-align: right; white-space: nowrap; }
    .sterne { letter-spacing: 2px; color: #d7dae1; } .sterne .voll { color: #f5a623; }
    .wert { color: #667085; font-size: 12px; }
    .schnitt { display: inline-flex; align-items: baseline; gap: 8px; margin-top: 10px; }
    .schnitt b { font-size: 24px; color: #4f46e5; }
    .empf { display: inline-block; font-weight: 700; padding: 5px 12px; border-radius: 999px; margin-top: 10px; }
    .empf.ja { background: #dcfce7; color: #059669; } .empf.nein { background: #fee2e2; color: #dc2626; }
    .text { border: 1px solid #e7e9ee; border-radius: 8px; padding: 10px 12px; line-height: 1.5; }
    .sig { margin-top: 18px; page-break-inside: avoid; max-width: 320px; }
    .sig img { height: 64px; max-width: 100%; object-fit: contain; display: block; }
    .sig-leer { height: 64px; }
    .sig-linie { border-bottom: 1px solid #0b0d12; margin-top: 2px; }
    .sig-label { font-size: 11px; color: #667085; margin-top: 4px; }
    footer { margin-top: 24px; font-size: 11px; color: #98a1b0; border-top: 1px solid #e7e9ee; padding-top: 10px; }
  </style></head><body>
    <header>
      <div><div class="brand">◐ Dry<span>Track</span></div><h1 style="margin-top:8px">Kundenzufriedenheit</h1></div>
      <div class="meta">
        <div><b>${esc(projekt.projektnummer)}</b> · ${esc(projekt.bezeichnung)}</div>
        <div>${esc(projekt.adresse)}</div>
        <div>Datum ${new Date(bericht.datum).toLocaleDateString("de-DE")}</div>
      </div>
    </header>

    <h3>Bewertung</h3>
    <table>
      ${zeile("Freundlichkeit / Beratung", bericht.bewertung_freundlichkeit)}
      ${zeile("Sauberkeit / Ordnung", bericht.bewertung_sauberkeit)}
      ${zeile("Termintreue", bericht.bewertung_termintreue)}
      ${zeile("Arbeitsqualität", bericht.bewertung_qualitaet)}
    </table>
    <div class="schnitt">Gesamteindruck: <b>${schnitt.toFixed(1)}</b> <span class="wert">/ 5</span></div><br>
    <span class="empf ${bericht.weiterempfehlung ? "ja" : "nein"}">${bericht.weiterempfehlung ? "Würde weiterempfehlen" : "Würde nicht weiterempfehlen"}</span>

    ${bericht.kommentar ? `<h3>Kommentar</h3><div class="text">${absatz(bericht.kommentar)}</div>` : ""}

    <h3>Unterschrift</h3>
    <div class="sig">
      ${bericht.unterschrift_kunde ? `<img src="${bericht.unterschrift_kunde}" alt="Unterschrift Kunde">` : `<div class="sig-leer"></div>`}
      <div class="sig-linie"></div>
      <div class="sig-label">Kunde / Auftraggeber${bericht.unterschrift_kunde_name ? ` · ${esc(bericht.unterschrift_kunde_name)}` : ""}</div>
    </div>

    <footer>DryTrack · Kundenzufriedenheit vom ${new Date(bericht.datum).toLocaleDateString("de-DE")} · erfasst von ${esc(benutzer(bericht.erstellt_von))} am ${new Date(bericht.erstellt_am).toLocaleString("de-DE")}</footer>
  </body></html>`;
}

/**
 * Ersatzfliesenbericht (14 · Dokumente): Für die Trocknung entfernte Fliesen und den mit dem
 * Kunden bemusterten Ersatz (aus Tabelle `bemusterung`), inkl. Musterfotos und Unterschriften.
 */
export function ersatzfliesenberichtHtml(bericht: Ersatzfliesenbericht, projekt: Projekt, db: DryTrackDB): string {
  const benutzer = (id: string) => db.benutzer.find((b) => b.id === id)?.name ?? "—";
  const absatz = (t: string) => esc(t).replace(/\n/g, "<br>");
  const muster = db.bemusterung.filter((m) => m.projekt_id === projekt.id);

  const karten = muster.map((m) => `<div class="muster">
      ${m.musterfoto_referenz ? `<img src="${m.musterfoto_referenz}" alt="Musterfoto">` : `<div class="muster-leer">kein Foto</div>`}
      <div class="muster-info">
        <div class="muster-mat">${esc(m.material_beschreibung)}</div>
        ${m.lieferant ? `<div class="muster-lief">Lieferant: ${esc(m.lieferant)}</div>` : ""}
      </div>
    </div>`).join("");

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Ersatzfliesenbericht ${esc(projekt.projektnummer)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #0b0d12; margin: 32px; font-size: 13px; }
    header { border-bottom: 2px solid #4f46e5; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; } .brand span { color: #4f46e5; }
    h1 { font-size: 16px; margin: 0 0 2px; } h3 { font-size: 12px; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: .05em; color: #667085; }
    .meta { color: #667085; font-size: 12px; text-align: right; }
    .satz { line-height: 1.6; margin: 12px 0; }
    .muster-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .muster { border: 1px solid #e7e9ee; border-radius: 10px; overflow: hidden; page-break-inside: avoid; }
    .muster img { width: 100%; height: 150px; object-fit: cover; display: block; }
    .muster-leer { height: 150px; display: flex; align-items: center; justify-content: center; color: #98a1b0; background: #f6f7f9; font-size: 12px; }
    .muster-info { padding: 8px 10px; } .muster-mat { font-weight: 600; } .muster-lief { color: #667085; font-size: 12px; margin-top: 2px; }
    .text { border: 1px solid #e7e9ee; border-radius: 8px; padding: 10px 12px; line-height: 1.5; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 14px; page-break-inside: avoid; }
    .sig img { height: 64px; max-width: 100%; object-fit: contain; display: block; }
    .sig-leer { height: 64px; }
    .sig-linie { border-bottom: 1px solid #0b0d12; margin-top: 2px; }
    .sig-label { font-size: 11px; color: #667085; margin-top: 4px; }
    footer { margin-top: 24px; font-size: 11px; color: #98a1b0; border-top: 1px solid #e7e9ee; padding-top: 10px; }
  </style></head><body>
    <header>
      <div><div class="brand">◐ Dry<span>Track</span></div><h1 style="margin-top:8px">Ersatzfliesenbericht</h1></div>
      <div class="meta">
        <div><b>${esc(projekt.projektnummer)}</b> · ${esc(projekt.bezeichnung)}</div>
        <div>${esc(projekt.adresse)}</div>
        <div>Abnahmedatum ${new Date(bericht.datum).toLocaleDateString("de-DE")} · ${esc(benutzer(bericht.erstellt_von))}</div>
      </div>
    </header>

    <p class="satz">Für die Durchführung der Trocknung mussten Fliesen entfernt werden, die nicht in
    identischer Ausführung wiederbeschafft werden können. Der nachfolgend bemusterte Ersatz wurde mit dem
    Auftraggeber abgestimmt und von diesem bestätigt.</p>

    <h3>Bemusterter Ersatz</h3>
    ${karten ? `<div class="muster-grid">${karten}</div>` : "<p style='color:#98a1b0'>Keine Bemusterung erfasst.</p>"}

    ${bericht.bemerkungen ? `<h3>Bemerkungen</h3><div class="text">${absatz(bericht.bemerkungen)}</div>` : ""}

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

    <footer>DryTrack · Ersatzfliesenbericht vom ${new Date(bericht.datum).toLocaleDateString("de-DE")} · erstellt am ${new Date(bericht.erstellt_am).toLocaleString("de-DE")}</footer>
  </body></html>`;
}

/**
 * Auftrag & Abtretungserklärung (A&A, 14 · Dokumente): Auftragserteilung des Kunden plus
 * Abtretung des Versicherungsanspruchs an das Sanierungsunternehmen — mit Unterschrift.
 */
export function aundvHtml(projekt: Projekt, db: DryTrackDB): string {
  const versicherung = projekt.versicherung_id ? db.versicherung.find((v) => v.id === projekt.versicherung_id)?.name ?? "—" : "—";
  const datum = projekt.aundv_datum ? new Date(projekt.aundv_datum).toLocaleDateString("de-DE") : "__________";

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Auftrag & Abtretung ${esc(projekt.projektnummer)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #0b0d12; margin: 32px; font-size: 13px; line-height: 1.5; }
    header { border-bottom: 2px solid #4f46e5; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; } .brand span { color: #4f46e5; }
    h1 { font-size: 16px; margin: 0 0 2px; } h3 { font-size: 12px; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: .05em; color: #667085; }
    .meta { color: #667085; font-size: 12px; text-align: right; }
    dl.facts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 24px; margin: 0 0 8px; }
    dl.facts > div { display: flex; justify-content: space-between; border-bottom: 1px solid #f0f1f4; padding: 5px 0; }
    dl.facts dt { color: #667085; } dl.facts dd { margin: 0; font-weight: 600; }
    .klausel { border: 1px solid #e7e9ee; border-radius: 8px; padding: 12px 14px; margin: 10px 0; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 18px; page-break-inside: avoid; }
    .sig img { height: 64px; max-width: 100%; object-fit: contain; display: block; }
    .sig-leer { height: 64px; }
    .sig-linie { border-bottom: 1px solid #0b0d12; margin-top: 2px; }
    .sig-label { font-size: 11px; color: #667085; margin-top: 4px; }
    footer { margin-top: 24px; font-size: 11px; color: #98a1b0; border-top: 1px solid #e7e9ee; padding-top: 10px; }
  </style></head><body>
    <header>
      <div><div class="brand">◐ Dry<span>Track</span></div><h1 style="margin-top:8px">Auftrag &amp; Abtretungserklärung</h1></div>
      <div class="meta">
        <div><b>${esc(projekt.projektnummer)}</b> · ${esc(projekt.bezeichnung)}</div>
        <div>${esc(projekt.adresse)}</div>
      </div>
    </header>

    <h3>Objekt &amp; Auftraggeber</h3>
    <dl class="facts">
      <div><dt>Projekt</dt><dd>${esc(projekt.projektnummer)}</dd></div>
      <div><dt>Objektadresse</dt><dd>${esc(projekt.adresse)}</dd></div>
      <div><dt>Versicherung</dt><dd>${esc(versicherung)}</dd></div>
      <div><dt>Datum</dt><dd>${datum}</dd></div>
    </dl>

    <h3>Auftragserteilung</h3>
    <div class="klausel">Der Auftraggeber beauftragt das ausführende Unternehmen mit der Durchführung der
    technischen Bautrocknung und der damit verbundenen Maßnahmen am oben genannten Objekt. Umfang und
    Ausführung richten sich nach der Schadenaufnahme und den anerkannten Regeln der Technik.</div>

    <h3>Abtretungserklärung</h3>
    <div class="klausel">Der Auftraggeber tritt hiermit seinen Anspruch auf Erstattung der Kosten für die
    beauftragten Leistungen gegenüber der eintrittspflichtigen Versicherung in Höhe der Auftragssumme an das
    ausführende Unternehmen ab. Das Unternehmen nimmt die Abtretung an. Die Versicherung wird angewiesen,
    die Zahlung mit befreiender Wirkung unmittelbar an das ausführende Unternehmen zu leisten.</div>

    <div class="sig-grid">
      <div class="sig">
        ${projekt.aundv_unterschrift ? `<img src="${projekt.aundv_unterschrift}" alt="Unterschrift Auftraggeber">` : `<div class="sig-leer"></div>`}
        <div class="sig-linie"></div>
        <div class="sig-label">Auftraggeber${projekt.aundv_unterschrift_name ? ` · ${esc(projekt.aundv_unterschrift_name)}` : ""}${projekt.aundv_datum ? ` · ${datum}` : ""}</div>
      </div>
      <div class="sig">
        <div class="sig-leer"></div>
        <div class="sig-linie"></div>
        <div class="sig-label">Ausführendes Unternehmen</div>
      </div>
    </div>

    <footer>DryTrack · Auftrag &amp; Abtretungserklärung${projekt.aundv_unterschrieben ? " · unterschrieben" : " · Entwurf, noch nicht unterschrieben"}.</footer>
  </body></html>`;
}

/**
 * Vertretervollmacht (14 · Dokumente): Der Auftraggeber bevollmächtigt das ausführende Unternehmen,
 * ihn im Rahmen der Schadenregulierung gegenüber der Versicherung zu vertreten — mit Unterschrift.
 */
export function vollmachtHtml(projekt: Projekt, db: DryTrackDB): string {
  const versicherung = projekt.versicherung_id ? db.versicherung.find((v) => v.id === projekt.versicherung_id)?.name ?? "—" : "—";
  const datum = projekt.vollmacht_datum ? new Date(projekt.vollmacht_datum).toLocaleDateString("de-DE") : "__________";
  const unterschrieben = !!projekt.vollmacht_unterschrift;

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Vertretervollmacht ${esc(projekt.projektnummer)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #0b0d12; margin: 32px; font-size: 13px; line-height: 1.5; }
    header { border-bottom: 2px solid #4f46e5; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; } .brand span { color: #4f46e5; }
    h1 { font-size: 16px; margin: 0 0 2px; } h3 { font-size: 12px; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: .05em; color: #667085; }
    .meta { color: #667085; font-size: 12px; text-align: right; }
    dl.facts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 24px; margin: 0 0 8px; }
    dl.facts > div { display: flex; justify-content: space-between; border-bottom: 1px solid #f0f1f4; padding: 5px 0; }
    dl.facts dt { color: #667085; } dl.facts dd { margin: 0; font-weight: 600; }
    .klausel { border: 1px solid #e7e9ee; border-radius: 8px; padding: 12px 14px; margin: 10px 0; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 18px; page-break-inside: avoid; }
    .sig img { height: 64px; max-width: 100%; object-fit: contain; display: block; }
    .sig-leer { height: 64px; }
    .sig-linie { border-bottom: 1px solid #0b0d12; margin-top: 2px; }
    .sig-label { font-size: 11px; color: #667085; margin-top: 4px; }
    footer { margin-top: 24px; font-size: 11px; color: #98a1b0; border-top: 1px solid #e7e9ee; padding-top: 10px; }
  </style></head><body>
    <header>
      <div><div class="brand">◐ Dry<span>Track</span></div><h1 style="margin-top:8px">Vertretervollmacht</h1></div>
      <div class="meta">
        <div><b>${esc(projekt.projektnummer)}</b> · ${esc(projekt.bezeichnung)}</div>
        <div>${esc(projekt.adresse)}</div>
      </div>
    </header>

    <h3>Objekt &amp; Versicherung</h3>
    <dl class="facts">
      <div><dt>Projekt</dt><dd>${esc(projekt.projektnummer)}</dd></div>
      <div><dt>Objektadresse</dt><dd>${esc(projekt.adresse)}</dd></div>
      <div><dt>Versicherung</dt><dd>${esc(versicherung)}</dd></div>
      <div><dt>Datum</dt><dd>${datum}</dd></div>
    </dl>

    <h3>Vollmacht</h3>
    <div class="klausel">Der Auftraggeber bevollmächtigt das ausführende Unternehmen, ihn im Rahmen der
    Regulierung des vorliegenden Schadens gegenüber der eintrittspflichtigen Versicherung zu vertreten.
    Die Vollmacht umfasst die Korrespondenz mit der Versicherung, die Übermittlung von Schadenunterlagen
    (Messprotokolle, Berichte, Strombrief) sowie die Abstimmung von Umfang und Ablauf der Maßnahmen. Sie
    kann jederzeit schriftlich widerrufen werden.</div>

    <div class="sig-grid">
      <div class="sig">
        ${projekt.vollmacht_unterschrift ? `<img src="${projekt.vollmacht_unterschrift}" alt="Unterschrift Auftraggeber">` : `<div class="sig-leer"></div>`}
        <div class="sig-linie"></div>
        <div class="sig-label">Auftraggeber (Vollmachtgeber)${projekt.vollmacht_unterschrift_name ? ` · ${esc(projekt.vollmacht_unterschrift_name)}` : ""}${projekt.vollmacht_datum ? ` · ${datum}` : ""}</div>
      </div>
      <div class="sig">
        <div class="sig-leer"></div>
        <div class="sig-linie"></div>
        <div class="sig-label">Ausführendes Unternehmen (Bevollmächtigter)</div>
      </div>
    </div>

    <footer>DryTrack · Vertretervollmacht${unterschrieben ? " · unterschrieben" : " · Entwurf, noch nicht unterschrieben"}.</footer>
  </body></html>`;
}

/** Abnahmeprotokoll (14 · Dokumente): Kunden-Abnahme der Trocknungsleistung mit Unterschriften. */
export function abnahmeprotokollHtml(protokoll: Abnahmeprotokoll, projekt: Projekt, db: DryTrackDB): string {
  const benutzer = (id: string) => db.benutzer.find((b) => b.id === id)?.name ?? "—";
  const absatz = (t: string) => esc(t).replace(/\n/g, "<br>");
  const statusText = protokoll.abnahme_status === "ohne_mangel" ? "Abnahme ohne Mängel"
    : protokoll.abnahme_status === "mit_mangel" ? "Abnahme mit Mängeln" : "Abnahme verweigert";
  const statusKlasse = protokoll.abnahme_status === "ohne_mangel" ? "ok" : protokoll.abnahme_status === "mit_mangel" ? "warn" : "danger";

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Abnahmeprotokoll ${esc(projekt.projektnummer)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #0b0d12; margin: 32px; font-size: 13px; }
    header { border-bottom: 2px solid #4f46e5; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; } .brand span { color: #4f46e5; }
    h1 { font-size: 16px; margin: 0 0 2px; } h3 { font-size: 12px; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: .05em; color: #667085; }
    .meta { color: #667085; font-size: 12px; text-align: right; }
    .kopf { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 6px; }
    .kopf div { border: 1px solid #e7e9ee; border-radius: 8px; padding: 8px 10px; }
    .kopf .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #667085; display: block; }
    .status { display: inline-block; font-weight: 700; padding: 6px 14px; border-radius: 999px; font-size: 13px; }
    .status.ok { background: #dcfce7; color: #059669; } .status.warn { background: #fef3c7; color: #b45309; } .status.danger { background: #fee2e2; color: #dc2626; }
    .text { border: 1px solid #e7e9ee; border-radius: 8px; padding: 10px 12px; line-height: 1.5; }
    .satz { line-height: 1.6; margin: 14px 0; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 8px; page-break-inside: avoid; }
    .sig img { height: 64px; max-width: 100%; object-fit: contain; display: block; }
    .sig-leer { height: 64px; }
    .sig-linie { border-bottom: 1px solid #0b0d12; margin-top: 2px; }
    .sig-label { font-size: 11px; color: #667085; margin-top: 4px; }
    footer { margin-top: 28px; font-size: 11px; color: #98a1b0; border-top: 1px solid #e7e9ee; padding-top: 10px; }
  </style></head><body>
    <header>
      <div><div class="brand">◐ Dry<span>Track</span></div><h1 style="margin-top:8px">Abnahmeprotokoll</h1></div>
      <div class="meta">
        <div><b>${esc(projekt.projektnummer)}</b> · ${esc(projekt.bezeichnung)}</div>
        <div>${esc(projekt.adresse)}</div>
        <div>Erstellt von ${esc(benutzer(protokoll.erstellt_von))}</div>
      </div>
    </header>

    <div class="kopf">
      <div><span class="lbl">Abnahmedatum</span><b>${new Date(protokoll.datum).toLocaleDateString("de-DE")}</b></div>
      <div><span class="lbl">Ergebnis</span><span class="status ${statusKlasse}">${statusText}</span></div>
    </div>

    <p class="satz">Die durchgeführte Trocknungsmaßnahme am oben genannten Objekt wurde durch den Auftraggeber
    abgenommen. Das Ergebnis der Abnahme ist oben festgehalten.</p>

    ${protokoll.maengel ? `<h3>Festgestellte Mängel</h3><div class="text">${absatz(protokoll.maengel)}</div>` : ""}
    ${protokoll.bemerkungen ? `<h3>Bemerkungen</h3><div class="text">${absatz(protokoll.bemerkungen)}</div>` : ""}

    <h3>Unterschriften</h3>
    <div class="sig-grid">
      <div class="sig">
        ${protokoll.unterschrift_kunde ? `<img src="${protokoll.unterschrift_kunde}" alt="Unterschrift Kunde">` : `<div class="sig-leer"></div>`}
        <div class="sig-linie"></div>
        <div class="sig-label">Kunde / Auftraggeber${protokoll.unterschrift_kunde_name ? ` · ${esc(protokoll.unterschrift_kunde_name)}` : ""}</div>
      </div>
      <div class="sig">
        ${protokoll.unterschrift_mitarbeiter ? `<img src="${protokoll.unterschrift_mitarbeiter}" alt="Unterschrift Mitarbeiter">` : `<div class="sig-leer"></div>`}
        <div class="sig-linie"></div>
        <div class="sig-label">Mitarbeiter · ${esc(benutzer(protokoll.erstellt_von))}</div>
      </div>
    </div>

    <footer>DryTrack · Abnahmeprotokoll vom ${new Date(protokoll.datum).toLocaleDateString("de-DE")} · erstellt am ${new Date(protokoll.erstellt_am).toLocaleString("de-DE")}</footer>
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

/**
 * Abschlussbericht (14 · Dokumente, DokumentTyp "abschlussbericht"): Projekt-Zusammenfassung
 * zum Abschluss der Trocknung. Fasst Objektdaten, das Trocknungsergebnis je Raum (letzte
 * Messung je Material), die Geräteeinsätze inkl. Gesamtverbrauch und ein Fazit zusammen.
 * Rein aus vorhandenen Daten abgeleitet — analog zum Strombrief, aber auf Projektebene.
 */
export function abschlussberichtHtml(projekt: Projekt, db: DryTrackDB): string {
  const benutzer = (id: string) => db.benutzer.find((b) => b.id === id)?.name ?? "—";
  const mat = (id: string) => db.materialdatenbank.find((m) => m.id === id);
  const versicherung = projekt.versicherung_id ? db.versicherung.find((v) => v.id === projekt.versicherung_id)?.name ?? "—" : "—";
  const raeume = db.raum.filter((r) => r.projekt_id === projekt.id);
  const einsaetze = db.einsatz.filter((e) => e.projekt_id === projekt.id);

  // Projektzeitraum: erster Aufbau → letzter Abbau (bzw. heute, wenn noch etwas läuft).
  const aufbauten = einsaetze.map((e) => new Date(e.aufbau_datum).getTime());
  const start = aufbauten.length ? Math.min(...aufbauten) : new Date(projekt.angelegt_am).getTime();
  const nochLaufend = einsaetze.some(istLaufend);
  const abbauten = einsaetze.filter((e) => e.abbau_datum).map((e) => new Date(e.abbau_datum!).getTime());
  const ende = nochLaufend || !abbauten.length ? Date.now() : Math.max(...abbauten);
  const dauerTage = Math.max(1, Math.ceil((ende - start) / (1000 * 60 * 60 * 24)));

  // Trocknungsergebnis je Raum: je Material die letzte Messung, deren Bewertung zählt.
  const raumBlocks = raeume.map((r) => {
    const messungen = db.messung.filter((m) => m.raum_id === r.id);
    const letztePerMaterial = new Map<string, typeof messungen[number]>();
    for (const m of messungen.sort((a, b) => (a.gemessen_am < b.gemessen_am ? -1 : 1))) letztePerMaterial.set(m.material_id, m);
    const bewertungen = [...letztePerMaterial.values()].map((m) => bewerteMessung(m, mat(m.material_id)));

    let ergebnis: "getrocknet" | "in_arbeit" | "kritisch" | "offen";
    if (bewertungen.length === 0) ergebnis = "offen";
    else if (bewertungen.some((b) => b.bewertung === "kontaminiert" || b.bewertung === "austausch")) ergebnis = "kritisch";
    else if (bewertungen.every((b) => b.bewertung === "trocken")) ergebnis = "getrocknet";
    else ergebnis = "in_arbeit";

    const ergLabel: Record<typeof ergebnis, string> = {
      getrocknet: "Trocken — abgeschlossen", in_arbeit: "Trocknung läuft", kritisch: "Austausch/Kontamination", offen: "Keine Messung",
    };
    const zeilen = [...letztePerMaterial.values()].map((m) => {
      const b = bewerteMessung(m, mat(m.material_id));
      return `<tr><td>${esc(mat(m.material_id)?.bezeichnung ?? "—")}</td><td class="b-${b.bewertung}">${BEWERTUNG_LABEL[b.bewertung]}</td><td>${new Date(m.gemessen_am).toLocaleDateString("de-DE")}</td></tr>`;
    }).join("");
    const zusatz = [
      r.geschoss, r.betroffene_flaeche_m2 != null ? `${r.betroffene_flaeche_m2} m²` : null,
      r.faekalschaden ? "Fäkalschaden" : null, r.sichtbarer_schimmel ? "Schimmel" : null,
    ].filter(Boolean).join(" · ");

    return `<section class="raum">
      <div class="raum-head"><h3>${esc(r.bezeichnung)}</h3><span class="erg erg-${ergebnis}">${ergLabel[ergebnis]}</span></div>
      ${zusatz ? `<p class="sub">${esc(zusatz)}</p>` : ""}
      ${zeilen ? `<table><thead><tr><th>Material</th><th>Ergebnis</th><th>Letzte Messung</th></tr></thead><tbody>${zeilen}</tbody></table>` : "<p class='sub'>Keine Messungen erfasst.</p>"}
    </section>`;
  }).join("");

  // Geräte-/Verbrauchssumme (wie Strombrief, aber verdichtet).
  let summe = 0, gesamtTage = 0, gabSchaetzung = false;
  for (const e of einsaetze) {
    if (istLaufend(e)) continue;
    const g = db.geraet.find((x) => x.inventarnummer === e.geraet_inventarnummer);
    const typ = db.geraetetyp.find((t) => t.id === g?.geraetetyp_id);
    const v = g ? berechneVerbrauch(e, g, typ) : null;
    if (v) { summe += v.verbrauch; gesamtTage += einsatzTage(e); if (v.geschaetzt) gabSchaetzung = true; }
  }
  const beendet = einsaetze.filter((e) => !istLaufend(e)).length;

  const alleTrocken = raeume.length > 0 && raeume.every((r) => {
    const ms = db.messung.filter((m) => m.raum_id === r.id);
    if (ms.length === 0) return false;
    const perMat = new Map<string, typeof ms[number]>();
    for (const m of ms.sort((a, b) => (a.gemessen_am < b.gemessen_am ? -1 : 1))) perMat.set(m.material_id, m);
    return [...perMat.values()].every((m) => bewerteMessung(m, mat(m.material_id)).bewertung === "trocken");
  });
  const fazit = alleTrocken
    ? "Alle erfassten Räume sind laut Freimessung trocken. Die Trocknungsmaßnahme kann als abgeschlossen gelten."
    : nochLaufend
      ? "Es sind noch Geräte im Einsatz bzw. Räume nicht freigemessen — die Trocknung ist noch nicht vollständig abgeschlossen."
      : "Nicht alle Räume sind freigemessen. Eine abschließende Kontrollmessung wird empfohlen.";

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Abschlussbericht ${esc(projekt.projektnummer)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #0b0d12; margin: 32px; font-size: 13px; }
    header { border-bottom: 2px solid #4f46e5; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; } .brand span { color: #4f46e5; }
    h1 { font-size: 16px; margin: 0 0 2px; } h2 { font-size: 12px; margin: 22px 0 8px; text-transform: uppercase; letter-spacing: .05em; color: #667085; }
    h3 { font-size: 14px; margin: 0; color: #0b0d12; }
    .meta { color: #667085; font-size: 12px; text-align: right; }
    .kennz { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .kennz div { border: 1px solid #e7e9ee; border-radius: 10px; padding: 10px 12px; }
    .kennz .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #667085; display: block; }
    .kennz b { font-size: 16px; }
    dl.facts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 24px; margin: 0; }
    dl.facts > div { display: flex; justify-content: space-between; border-bottom: 1px solid #f0f1f4; padding: 5px 0; }
    dl.facts dt { color: #667085; } dl.facts dd { margin: 0; font-weight: 600; }
    .raum { border: 1px solid #e7e9ee; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; page-break-inside: avoid; }
    .raum-head { display: flex; justify-content: space-between; align-items: center; }
    .sub { color: #98a1b0; font-size: 11px; margin: 4px 0 0; }
    .erg { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; }
    .erg-getrocknet { background: #dcfce7; color: #059669; } .erg-in_arbeit { background: #fef3c7; color: #b45309; }
    .erg-kritisch { background: #fee2e2; color: #dc2626; } .erg-offen { background: #eef0f4; color: #667085; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #667085; border-bottom: 1px solid #e7e9ee; padding: 5px 8px; }
    td { padding: 6px 8px; border-bottom: 1px solid #f0f1f4; }
    .b-trocken { color: #059669; font-weight: 600; } .b-feucht, .b-kontaminiert, .b-austausch { color: #dc2626; font-weight: 600; } .b-grenzwertig { color: #d97706; font-weight: 600; }
    .fazit { border: 1px solid #e7e9ee; border-left: 3px solid #4f46e5; border-radius: 8px; padding: 12px 14px; line-height: 1.5; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 14px; page-break-inside: avoid; }
    .sig-linie { border-bottom: 1px solid #0b0d12; margin-top: 34px; }
    .sig-label { font-size: 11px; color: #667085; margin-top: 4px; }
    footer { margin-top: 24px; font-size: 11px; color: #98a1b0; border-top: 1px solid #e7e9ee; padding-top: 10px; }
  </style></head><body>
    <header>
      <div><div class="brand">◐ Dry<span>Track</span></div><h1 style="margin-top:8px">Abschlussbericht</h1></div>
      <div class="meta">
        <div><b>${esc(projekt.projektnummer)}</b> · ${esc(projekt.bezeichnung)}</div>
        <div>${esc(projekt.adresse)}</div>
        <div>Erstellt am ${new Date().toLocaleDateString("de-DE")} · ${esc(benutzer(projekt.angelegt_von))}</div>
      </div>
    </header>

    <div class="kennz">
      <div><span class="lbl">Trocknungsdauer</span><b>${dauerTage} Tage</b></div>
      <div><span class="lbl">Geräteeinsätze</span><b>${beendet}${nochLaufend ? " (+laufend)" : ""}</b></div>
      <div><span class="lbl">Gerätetage</span><b>${gesamtTage}</b></div>
      <div><span class="lbl">Stromverbrauch</span><b>${summe.toLocaleString("de-DE", { maximumFractionDigits: 0 })} kWh</b></div>
    </div>

    <h2>Objekt &amp; Auftrag</h2>
    <dl class="facts">
      <div><dt>Baujahr</dt><dd>${projekt.baujahr ?? "—"}</dd></div>
      <div><dt>Geschosse</dt><dd>${projekt.geschosse ?? "—"}</dd></div>
      <div><dt>Bauweise</dt><dd>${esc(projekt.bauweise ?? "—")}</dd></div>
      <div><dt>Versicherung</dt><dd>${esc(versicherung)}</dd></div>
      <div><dt>Kontamination</dt><dd>${projekt.kontamination_art ?? "—"}</dd></div>
      <div><dt>A&amp;A unterschrieben</dt><dd>${projekt.aundv_unterschrieben ? "ja" : "offen"}</dd></div>
    </dl>

    <h2>Trocknungsergebnis je Raum</h2>
    ${raumBlocks || "<p class='sub'>Keine Räume erfasst.</p>"}

    <h2>Fazit</h2>
    <div class="fazit">${esc(fazit)}</div>

    <div class="sig-grid">
      <div><div class="sig-linie"></div><div class="sig-label">Kunde / Auftraggeber</div></div>
      <div><div class="sig-linie"></div><div class="sig-label">${esc(benutzer(projekt.angelegt_von))} · DryTrack</div></div>
    </div>

    <footer>${gabSchaetzung ? "Stromverbrauch teilweise als Näherung (Tage × Geräteleistung) berechnet — ohne Gewähr (FR-EINSATZ-003). " : ""}DryTrack · Abschlussbericht zum ${new Date().toLocaleDateString("de-DE")}. Feuchtebewertungen sind Praxisrichtwerte (FR-MESS-002).</footer>
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
