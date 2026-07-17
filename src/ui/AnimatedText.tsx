import { motion, useReducedMotion } from "motion/react";
import { EASE } from "./motion";

// Zeichen-für-Zeichen-Reveal (Referenz-Idee, übersetzt): jeder Buchstabe zieht
// von halb sichtbar auf voll auf, gestaffelt. Bewusst inline (kein inline-block),
// damit der Satz normal umbricht. Barrierefrei: der Screenreader liest den Text
// einmal über aria-label, die Buchstaben-Spans sind aria-hidden.
// Bei Reduced Motion steht der Text sofort vollständig.

export type TextSegment = { text: string; className?: string };

export function AnimatedText({ segments, className, delay = 0, stagger = 0.022, start = true }: {
  segments: TextSegment[];
  className?: string;
  delay?: number;
  stagger?: number;
  // Reveal erst starten, wenn der Text wirklich sichtbar ist (z. B. nach dem Intro).
  // Solange false, ruhen die Zeichen halb sichtbar; flippt es auf true, ziehen sie auf.
  start?: boolean;
}) {
  const ruhig = useReducedMotion();
  const voll = segments.map((s) => s.text).join("");
  let i = 0;

  return (
    <p className={className} aria-label={voll}>
      {segments.map((seg, si) => (
        <span key={si} className={seg.className}>
          {[...seg.text].map((ch, ci) => {
            const idx = i++;
            return (
              <motion.span
                key={ci}
                aria-hidden="true"
                initial={ruhig ? false : { opacity: 0.2 }}
                animate={{ opacity: start ? 1 : 0.2 }}
                transition={{ duration: 0.4, ease: EASE, delay: ruhig || !start ? 0 : delay + idx * stagger }}
              >
                {ch}
              </motion.span>
            );
          })}
        </span>
      ))}
    </p>
  );
}
