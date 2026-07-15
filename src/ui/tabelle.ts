// Tabelle als CSV exportieren und teilen (öffnet direkt in Excel).
// Bewusst ohne schwere xlsx-Bibliothek (Offline-First, kleines Bundle):
// ";"-getrennt + UTF-8-BOM → deutsche Excel-Version zeigt Spalten und Umlaute korrekt.
// Teilen per Web-Share (E-Mail/WhatsApp) wenn möglich, sonst Download.
type Zelle = string | number | null | undefined;

function csvZelle(v: Zelle): string {
  const s = v == null ? "" : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function tabelleTeilen(dateiname: string, zeilen: Zelle[][]): Promise<void> {
  const csv = "﻿" + zeilen.map((z) => z.map(csvZelle).join(";")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const datei = new File([blob], dateiname, { type: "text/csv" });

  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.share && nav.canShare?.({ files: [datei] })) {
    try { await nav.share({ files: [datei], title: dateiname }); return; }
    catch { /* Nutzer bricht ab oder Teilen nicht möglich → Download */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = dateiname; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
