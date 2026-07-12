// PDF-Export via Druckdialog. Der Report wird in ein isoliertes iframe geschrieben
// und dort gedruckt (sandbox-sicher) — der Browser bietet „Als PDF speichern" an.
import type { DryTrackDB, Projekt } from "./types";
import { bewerteMessung, BEWERTUNG_LABEL } from "./mess";

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
