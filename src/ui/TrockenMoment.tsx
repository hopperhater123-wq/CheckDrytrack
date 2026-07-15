import { useEffect } from "react";
import { motion } from "./motion";
import { DryingLine } from "./DryingLine";
import { spiele } from "./sound";

// „Objekt trocken"-Moment: zurückhaltende Mikro-Feier nach einer Freimessung mit
// Bewertung „trocken". Keine Konfetti — die Marken-Signatur selbst feiert: die
// Trocknungslinie schwingt auf 100 % ein. Schließt sich selbst (oder per Tap).
export function TrockenMoment({ titel, sub, onDone }: { titel: string; sub?: string; onDone: () => void }) {
  useEffect(() => {
    spiele("erfolg");
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="trocken-overlay">
      <motion.div
        className="trocken-card" role="status" aria-live="polite" onClick={onDone}
        initial={{ opacity: 0, y: 36, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24 }} transition={{ duration: 0.3 }}
      >
        <DryingLine value={1} label={titel} sub={sub} />
      </motion.div>
    </div>
  );
}
