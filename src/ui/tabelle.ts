// Tabellen-Export für Büro/Versicherung. Echte Excel-Datei (.xlsx) wie bei
// Torrek Scan — nicht mehr nur CSV, das die Mail-App als Text/CSV anhängt und
// das unübersichtlich wirkt. SheetJS liegt lokal im Bundle (Offline-First).
// Teilen per Web-Share (E-Mail/WhatsApp) wenn möglich, sonst Download.
import * as XLSX from "xlsx";

type Zelle = string | number | null | undefined;
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Spaltenbreite (Zeichen) für eine Liste — angelehnt an Torrek Scan. */
export interface Blatt {
  blattname: string;          // Reiterbeschriftung
  titel?: string;             // fette Kopfzeile
  kopfzeilen?: [string, Zelle][]; // Projekt/Datum-Block über der Tabelle
  spalten: string[];          // Spaltenüberschriften
  zeilen: Zelle[][];          // Datenzeilen (ohne Überschrift)
  summe?: [string, Zelle]; // optionale Summenzeile am Ende (Label, Wert)
  breiten?: number[];         // Spaltenbreiten in Zeichen
}

function baueBlatt(b: Blatt): XLSX.WorkSheet {
  const a: Zelle[][] = [];
  if (b.titel) a.push([b.titel]);
  (b.kopfzeilen ?? []).forEach(([k, v]) => a.push([k, v]));
  if (b.titel || b.kopfzeilen?.length) a.push([]); // Leerzeile vor der Tabelle
  a.push(b.spalten);
  b.zeilen.forEach((z) => a.push(z));
  if (b.summe) {
    a.push([]);
    // Summe rechtsbündig unter die letzten beiden Spalten (Wert unter der Zahlenspalte).
    const n = b.spalten.length;
    const zeile: Zelle[] = new Array(n).fill("");
    zeile[Math.max(0, n - 2)] = b.summe[0];
    zeile[n - 1] = b.summe[1];
    a.push(zeile);
  }
  const ws = XLSX.utils.aoa_to_sheet(a);
  if (b.breiten) ws["!cols"] = b.breiten.map((wch) => ({ wch }));
  return ws;
}

/** Eine Excel-Arbeitsmappe (ein Blatt) erzeugen und teilen/herunterladen. */
export async function arbeitsmappeTeilen(dateiname: string, blatt: Blatt, teilenText?: string): Promise<void> {
  const buch = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(buch, baueBlatt(blatt), blatt.blattname.slice(0, 31));
  const bytes: ArrayBuffer = XLSX.write(buch, { bookType: "xlsx", type: "array" });
  const datei = new File([bytes], dateiname, { type: XLSX_MIME });

  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.share && nav.canShare?.({ files: [datei] })) {
    try { await nav.share({ files: [datei], title: dateiname, text: teilenText }); return; }
    catch (e) { if (e instanceof DOMException && e.name === "AbortError") return; /* sonst Download */ }
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: XLSX_MIME }));
  const a = document.createElement("a");
  a.href = url; a.download = dateiname; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
