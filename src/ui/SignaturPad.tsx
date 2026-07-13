import { useEffect, useRef } from "react";

// Unterschrift auf dem Gerät (Alt-System-Analyse, Backlog ②).
// Canvas mit Pointer-Events (Finger, Stift, Maus); Ergebnis als PNG-Data-URL.
// Wiederverwendbar für Besuchsbericht, Abnahmeprotokoll, A&A, Ersatzfliesenbericht.
export function SignaturPad({
  value,
  onChange,
  hoehe = 140,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  hoehe?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zeichnet = useRef(false);
  const hatStriche = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const breite = canvas.parentElement?.clientWidth ?? 320;
    canvas.width = breite * dpr;
    canvas.height = hoehe * dpr;
    canvas.style.width = `${breite}px`;
    canvas.style.height = `${hoehe}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1b2540";

    // Bestehende Unterschrift wieder anzeigen (z. B. nach Re-Mount)
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, breite, hoehe);
      img.src = value;
      hatStriche.current = true;
    }
  }, [hoehe]); // eslint-disable-line react-hooks/exhaustive-deps

  const pos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    canvasRef.current!.setPointerCapture(e.pointerId);
    zeichnet.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const bewege = (e: React.PointerEvent) => {
    if (!zeichnet.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hatStriche.current = true;
  };

  const ende = () => {
    if (!zeichnet.current) return;
    zeichnet.current = false;
    if (hatStriche.current) onChange(canvasRef.current!.toDataURL("image/png"));
  };

  const loeschen = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hatStriche.current = false;
    onChange(null);
  };

  return (
    <div className="signatur">
      <canvas
        ref={canvasRef}
        className="signatur-canvas"
        onPointerDown={start}
        onPointerMove={bewege}
        onPointerUp={ende}
        onPointerCancel={ende}
        aria-label="Unterschriftenfeld"
      />
      <div className="signatur-fuss">
        <span className="muted small">✕ hier unterschreiben</span>
        <button type="button" className="linkbtn" onClick={loeschen}>Löschen</button>
      </div>
    </div>
  );
}
