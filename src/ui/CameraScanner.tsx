import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

// Echter Kamera-Scan (FR-SCAN-001) über die native BarcodeDetector-API
// (Android/Chrome; erkennt QR + gängige 1D-Barcodes). Wo nicht verfügbar
// (z. B. iOS Safari) oder ohne Kamerafreigabe: sauberer Fallback auf Nummer-Eingabe.
type BarcodeDetectorLike = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

const FORMATE = ["qr_code", "code_128", "code_39", "code_93", "ean_13", "ean_8", "upc_a", "upc_e", "itf", "codabar"];

/** Rohwert bereinigen: bei Deep-Link-URL die Inventarnummer/Projekt-Referenz ziehen, sonst 1:1. */
export function codeAusScan(raw: string): string {
  const s = raw.trim();
  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);
      const inv = u.searchParams.get("inv");
      if (inv) return inv;
    }
  } catch { /* kein URL */ }
  return s;
}

export function CameraScanner({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const supported = typeof window !== "undefined" && "BarcodeDetector" in window;

  useEffect(() => {
    if (!supported) { setFehler("Dieses Gerät unterstützt keinen Kamera-Scan. Bitte die Nummer eingeben."); return; }

    let stream: MediaStream | null = null;
    let stop = false;
    let raf = 0;
    const Detector = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
    const detector = new Detector({ formats: FORMATE });

    const cleanup = () => { stop = true; if (raf) cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        void v.play().catch(() => { /* Autoplay ohne Geste kann ablehnen — Erkennung läuft trotzdem */ });
        const tick = async () => {
          if (stop) return;
          try {
            const codes = await detector.detect(v);
            if (codes && codes.length) { cleanup(); onDetect(codeAusScan(codes[0].rawValue)); return; }
          } catch { /* einzelner Frame nicht lesbar — weiter */ }
          if (!stop) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setFehler("Kamerazugriff nicht möglich. Bitte Berechtigung erlauben — oder die Nummer eingeben.");
      }
    })();

    return cleanup;
  }, [supported, onDetect]);

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
