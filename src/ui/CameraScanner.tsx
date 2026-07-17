import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

// Echter Kamera-Scan (FR-SCAN-001):
//  1. Native BarcodeDetector-API (Android/Chrome) — schnell, ohne Zusatz-Code.
//  2. Fallback ZXing (iPhone/Safari, ältere Browser) — bei Bedarf nachgeladen,
//     gebündelt (kein CDN → offline-fähig, CSP-sicher).
//  3. Ohne Kamera/Freigabe: sauberer Rückfall auf die Nummer-Eingabe.
type BarcodeDetectorLike = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

const FORMATE = ["qr_code", "code_128", "code_39", "code_93", "ean_13", "ean_8", "upc_a", "upc_e", "itf", "codabar"];

/** EAN-13-Prüfziffer entfernen (Etiketten-Realität): Der Etikettendrucker codiert
 *  die 12 gedruckten Ziffern als EAN-13 — die Striche tragen eine 13. Ziffer
 *  (Prüfziffer), der Klartext auf dem Etikett nicht. Nur eine per Modulo-10
 *  GÜLTIGE Prüfziffer wird abgeschnitten; sonst bleibt der Code unangetastet.
 *  So ergeben Scan, Etikett und Abtippen dieselbe Inventarnummer. */
export function ohnePruefziffer(code: string): string {
  if (!/^\d{13}$/.test(code)) return code;
  let summe = 0;
  for (let i = 0; i < 12; i++) summe += Number(code[i]) * (i % 2 ? 3 : 1);
  return (10 - (summe % 10)) % 10 === Number(code[12]) ? code.slice(0, 12) : code;
}

/** Rohwert bereinigen: bei Deep-Link-URL die Inventarnummer/Projekt-Referenz ziehen, sonst 1:1. */
export function codeAusScan(raw: string): string {
  const s = raw.trim();
  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);
      const inv = u.searchParams.get("inv");
      if (inv) return ohnePruefziffer(inv);
    }
  } catch { /* kein URL */ }
  return ohnePruefziffer(s);
}

export function CameraScanner({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  // onDetect in einem Ref halten, damit ein Re-Render des Eltern-Screens die Kamera nicht neu startet.
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  useEffect(() => {
    const hatNativeDetector = typeof window !== "undefined" && "BarcodeDetector" in window;
    let stop = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    let zxing: { stop: () => void } | null = null;

    const cleanup = () => {
      stop = true;
      if (raf) cancelAnimationFrame(raf);
      try { zxing?.stop(); } catch { /* ignorieren */ }
      stream?.getTracks().forEach((t) => t.stop());
    };
    const treffer = (raw: string) => { if (stop) return; cleanup(); onDetectRef.current(codeAusScan(raw)); };

    (async () => {
      if (hatNativeDetector) {
        // Schneller nativer Weg (Android/Chrome).
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        } catch {
          setFehler("Kamerazugriff nicht möglich. Bitte Berechtigung erlauben — oder die Nummer eingeben.");
          return;
        }
        const v = videoRef.current;
        if (!v || stop) return;
        v.srcObject = stream;
        void v.play().catch(() => { /* Autoplay ohne Geste kann ablehnen — Erkennung läuft trotzdem */ });
        const Detector = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
        const detector = new Detector({ formats: FORMATE });
        const tick = async () => {
          if (stop) return;
          try {
            const codes = await detector.detect(v);
            if (codes && codes.length) { treffer(codes[0].rawValue); return; }
          } catch { /* einzelner Frame nicht lesbar — weiter */ }
          if (!stop) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } else {
        // Fallback (iPhone/Safari): ZXing bei Bedarf nachladen; Kamera verwaltet ZXing selbst.
        try {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          if (stop) return;
          const v = videoRef.current;
          if (!v) return;
          const reader = new BrowserMultiFormatReader();
          zxing = await reader.decodeFromConstraints(
            { video: { facingMode: "environment" } }, v,
            (result) => { if (result) treffer(result.getText()); },
          );
        } catch {
          setFehler("Kamera-Scan auf diesem Gerät nicht möglich. Bitte die Nummer eingeben.");
        }
      }
    })();

    return cleanup;
  }, []);

  return (
    <div className="scanner-overlay">
      <div className="scanner-top">
        <span>Code scannen</span>
        <button className="iconbtn" onClick={onClose} aria-label="Scanner schließen" style={{ color: "#fff" }}><Icon name="x" size={22} /></button>
      </div>

      {fehler ? (
        <div className="scanner-fehler">
          <Icon name="alert" size={30} />
          <p>{fehler}</p>
          <button className="btn btn-primary" onClick={onClose}>Zur Eingabe</button>
        </div>
      ) : (
        <div className="scanner-view">
          <video ref={videoRef} className="scanner-video" muted playsInline />
          <div className="scanner-rahmen"><div className="scanline" /></div>
          <p className="scanner-hint">Code im Rahmen platzieren — wird automatisch erkannt.</p>
        </div>
      )}
    </div>
  );
}
