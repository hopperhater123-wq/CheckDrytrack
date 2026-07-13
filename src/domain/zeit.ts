// Zeitrechnung für den Stundennachweis (Besuchsbericht).

/** "08:30" → Minuten seit Mitternacht; ungültig → null. */
export function zeitZuMinuten(z: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(z.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10), min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Arbeitszeit in Minuten (bis − von − Pause); über Mitternacht wird nicht unterstützt. */
export function arbeitszeitMin(von: string, bis: string, pauseMin: number): number | null {
  const v = zeitZuMinuten(von), b = zeitZuMinuten(bis);
  if (v === null || b === null || b < v) return null;
  return Math.max(0, b - v - (pauseMin || 0));
}

/** Minuten → "06:00". */
export function minutenZuText(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
