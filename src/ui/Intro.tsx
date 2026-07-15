import { useEffect } from "react";
import { motion } from "./motion";

// App-Intro — die Marken-Signatur als Eröffnung: ein Tropfen fällt, schlägt auf,
// TORREK setzt sich, die Trocknungslinie zieht von Nass nach Trocken durch.
// Kurz (~2,5 s), Tipp überspringt. Reduced-Motion: nur weiches Ein-/Ausblenden.

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const BUCHSTABEN = "TORREK".split("");

export function Intro({ onDone }: { onDone: () => void }) {
  const ruhig = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const t = setTimeout(onDone, ruhig ? 1100 : 2600);
    return () => clearTimeout(t);
  }, [onDone, ruhig]);

  return (
    <motion.div
      className="intro" role="presentation" onClick={onDone}
      initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.45, ease: EASE_OUT }}
    >
      <div className="intro-buehne">
        {/* Tropfen fällt und schlägt auf */}
        <div className="intro-tropfen-zone">
          <motion.svg
            className="intro-tropfen" viewBox="0 0 24 24" width="46" height="46"
            fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
            initial={ruhig ? { opacity: 0 } : { y: -150, opacity: 0, scaleY: 1.15 }}
            animate={ruhig ? { opacity: 1 } : { y: 0, opacity: 1, scaleY: 1 }}
            transition={{ duration: 0.55, ease: [0.5, 0, 0.9, 0.4] }}
          >
            <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5S12.5 5 12 2.5C11.5 5 10 7.4 8 9.5S5 13 5 15a7 7 0 0 0 7 7Z" />
          </motion.svg>
          {/* Aufprall-Wellen */}
          {!ruhig && [0, 1].map((i) => (
            <motion.span
              key={i} className="intro-welle"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 2.6 + i * 1.2, opacity: [0, 0.45, 0] }}
              transition={{ delay: 0.55 + i * 0.14, duration: 0.9, ease: "easeOut" }}
            />
          ))}
        </div>

        {/* Wortmarke, Buchstabe für Buchstabe */}
        <div className="intro-wort" aria-label="Torrek">
          {BUCHSTABEN.map((b, i) => (
            <motion.span
              key={i} className="intro-buchstabe"
              initial={ruhig ? { opacity: 0 } : { y: 34, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: (ruhig ? 0.1 : 0.75) + i * 0.055, duration: 0.5, ease: EASE_OUT }}
            >
              {b}
            </motion.span>
          ))}
        </div>

        {/* Die Trocknungslinie zieht durch: Nass → Trocken */}
        <div className="intro-line">
          <span className="intro-line-cap">Nass</span>
          <div className="intro-line-track">
            <motion.span
              className="intro-line-fill"
              initial={{ width: "0%" }} animate={{ width: "100%" }}
              transition={{ delay: ruhig ? 0.2 : 1.15, duration: ruhig ? 0.5 : 0.95, ease: EASE_OUT }}
            />
          </div>
          <span className="intro-line-cap">Trocken</span>
        </div>

        <motion.span
          className="intro-tagline eyebrow"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: ruhig ? 0.4 : 1.6, duration: 0.5 }}
        >
          Trocknung im Griff — vom Tropfen bis zur Freimessung
        </motion.span>
      </div>
    </motion.div>
  );
}
