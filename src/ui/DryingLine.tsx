// Signatur-Element: Die Trocknungslinie — ein Feuchte-Instrument.
// Zeigt den Trocknungsfortschritt (0 = nass, 1 = trocken) als Skala mit Nadel.
// Gedacht für den dunklen Hero-Kontext (helle Schrift auf tiefem Petrol).
export function DryingLine({ value, label = "Trocknungsfortschritt", sub }: { value: number; label?: string; sub?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="dryline" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
      <div className="dryline-top">
        <span className="dryline-cap">{label}</span>
        <span className="dryline-read">{pct}<span className="unit">% tr.</span></span>
      </div>
      <div className="dryline-track">
        <span className="dryline-needle" style={{ left: `${pct}%` }} />
      </div>
      <div className="dryline-ends"><span>Nass</span>{sub ? <span style={{ letterSpacing: 0, textTransform: "none", fontFamily: "var(--font)" }}>{sub}</span> : null}<span>Trocken</span></div>
    </div>
  );
}
