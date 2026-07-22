// Aufmaß-Formeln (Positionsauflistung, Alt-System): "(3,97*3,77)+(1,55*2,15)".
// Eigener Mini-Parser statt eval — nur Zahlen (Komma oder Punkt), + - * / ( ).
// Liefert null für alles, was keine reine Rechenformel ist.

export function berechneAufmass(formel: string): number | null {
  const s = formel.replace(/\s+/g, "").replace(/,/g, ".");
  if (!s || !/^[0-9+\-*/().]*$/.test(s)) return null;
  let i = 0;

  function ausdruck(): number {
    let v = term();
    while (s[i] === "+" || s[i] === "-") {
      const op = s[i++];
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  function term(): number {
    let v = faktor();
    while (s[i] === "*" || s[i] === "/") {
      const op = s[i++];
      const r = faktor();
      v = op === "*" ? v * r : v / r;
    }
    return v;
  }
  function faktor(): number {
    if (s[i] === "(") {
      i++;
      const v = ausdruck();
      if (s[i] !== ")") throw new Error("Klammer");
      i++;
      return v;
    }
    if (s[i] === "-") { i++; return -faktor(); }
    const m = /^\d+(\.\d+)?/.exec(s.slice(i));
    if (!m) throw new Error("Zahl erwartet");
    i += m[0].length;
    return parseFloat(m[0]);
  }

  try {
    const v = ausdruck();
    return i === s.length && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** Summe mehrerer Aufmaß-Zeilen; null wenn keine Zeile auswertbar ist. */
export function summeAufmass(formeln: string[]): number | null {
  const werte = formeln.map(berechneAufmass).filter((v): v is number => v != null);
  if (!werte.length) return null;
  return Math.round(werte.reduce((a, b) => a + b, 0) * 100) / 100;
}
