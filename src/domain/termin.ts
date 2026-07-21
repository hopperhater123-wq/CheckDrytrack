// Auftrags-Briefing-Status (F1, 21.07.): steuert den „Auftrag geändert/neu"-Hinweis.
// Vergleicht die letzte Büro-Änderung (briefing_stand) mit dem Zeitpunkt, zu dem der
// Monteur es zur Kenntnis genommen hat (briefing_quittiert).
import type { Termin } from "./types";

export type BriefingStatus = "keiner" | "neu" | "geaendert" | "aktuell";

export function hatBriefing(t: Termin): boolean {
  return !!(t.briefing?.trim() || (t.mitnehmen && t.mitnehmen.length));
}

export function briefingStatus(t: Termin): BriefingStatus {
  if (!hatBriefing(t) || !t.briefing_stand) return "keiner";
  if (!t.briefing_quittiert) return "neu";
  return t.briefing_quittiert < t.briefing_stand ? "geaendert" : "aktuell";
}
