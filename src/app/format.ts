export function fmtDatum(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtDatumZeit(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function fmtZahl(n: number, digits = 1): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function relativZeit(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const tage = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (tage <= 0) {
    const std = Math.floor(diff / (1000 * 60 * 60));
    return std <= 0 ? "gerade eben" : `vor ${std} h`;
  }
  if (tage === 1) return "gestern";
  return `vor ${tage} Tagen`;
}
