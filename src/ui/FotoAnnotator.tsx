import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

// Schadenskartierung wie im Alt-System: direkt auf Foto/Skizze zeichnen —
// freihändig, Pfeile und Text in Signalfarben. Das Ergebnis wird ins Bild
// eingebrannt (JPEG-Data-URL), genau wie die Filzstift-Skizzen auf Papier.

type Werkzeug = "stift" | "pfeil" | "text";
interface Punkt { x: number; y: number }
interface Op { werkzeug: Werkzeug; farbe: string; punkte: Punkt[]; text?: string }

const FARBEN = ["#E02D1B", "#0E7C86", "#E0A43B", "#FFFFFF"];
const MAX_KANTE = 1600;

export function FotoAnnotator({ src, titel, onSave, onClose }: {
  src: string; titel?: string; onSave: (dataUrl: string) => void; onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const opsRef = useRef<Op[]>([]);
  const aktuelleRef = useRef<Op | null>(null);
  const [bereit, setBereit] = useState(false);
  const [farbe, setFarbe] = useState(FARBEN[0]);
  const [werkzeug, setWerkzeug] = useState<Werkzeug>("stift");
  const [text, setText] = useState("");
  const [anzahl, setAnzahl] = useState(0); // für Undo/Speichern-Zustand

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const c = canvasRef.current;
      if (!c) return;
      const skala = Math.min(1, MAX_KANTE / Math.max(img.naturalWidth, img.naturalHeight));
      c.width = Math.max(1, Math.round(img.naturalWidth * skala));
      c.height = Math.max(1, Math.round(img.naturalHeight * skala));
      setBereit(true);
      zeichne();
    };
    img.src = src;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const zeichne = () => {
    const c = canvasRef.current, img = imgRef.current;
    if (!c || !img) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const dicke = Math.max(3, Math.round(c.width / 220));
    const alle = aktuelleRef.current ? [...opsRef.current, aktuelleRef.current] : opsRef.current;
    for (const op of alle) {
      ctx.strokeStyle = op.farbe;
      ctx.fillStyle = op.farbe;
      ctx.lineWidth = dicke;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (op.werkzeug === "stift" && op.punkte.length > 1) {
        ctx.beginPath();
        ctx.moveTo(op.punkte[0].x, op.punkte[0].y);
        for (const p of op.punkte.slice(1)) ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else if (op.werkzeug === "pfeil" && op.punkte.length >= 2) {
        const a = op.punkte[0], b = op.punkte[op.punkte.length - 1];
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        const winkel = Math.atan2(b.y - a.y, b.x - a.x);
        const kopf = dicke * 4;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - kopf * Math.cos(winkel - 0.45), b.y - kopf * Math.sin(winkel - 0.45));
        ctx.lineTo(b.x - kopf * Math.cos(winkel + 0.45), b.y - kopf * Math.sin(winkel + 0.45));
        ctx.closePath(); ctx.fill();
      } else if (op.werkzeug === "text" && op.text) {
        const groesse = Math.max(18, Math.round(c.width / 26));
        ctx.font = `700 ${groesse}px system-ui, sans-serif`;
        ctx.lineWidth = Math.max(3, Math.round(groesse / 6));
        ctx.strokeStyle = "rgba(0,0,0,0.65)";
        ctx.strokeText(op.text, op.punkte[0].x, op.punkte[0].y);
        ctx.fillText(op.text, op.punkte[0].x, op.punkte[0].y);
      }
    }
  };

  const pos = (e: React.PointerEvent): Punkt => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  };

  const start = (e: React.PointerEvent) => {
    if (!bereit) return;
    e.preventDefault();
    try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* Maus ohne Capture ist ok */ }
    const p = pos(e);
    if (werkzeug === "text") {
      if (!text.trim()) return;
      opsRef.current.push({ werkzeug: "text", farbe, punkte: [p], text: text.trim() });
      setAnzahl(opsRef.current.length);
      zeichne();
      return;
    }
    aktuelleRef.current = { werkzeug, farbe, punkte: [p] };
  };

  const bewege = (e: React.PointerEvent) => {
    const op = aktuelleRef.current;
    if (!op) return;
    e.preventDefault();
    const p = pos(e);
    if (op.werkzeug === "stift") op.punkte.push(p);
    else op.punkte = [op.punkte[0], p];
    zeichne();
  };

  const ende = () => {
    const op = aktuelleRef.current;
    if (op && op.punkte.length > 1) {
      opsRef.current.push(op);
      setAnzahl(opsRef.current.length);
    }
    aktuelleRef.current = null;
    zeichne();
  };

  const rueckgaengig = () => {
    opsRef.current.pop();
    setAnzahl(opsRef.current.length);
    zeichne();
  };

  const speichern = () => {
    const c = canvasRef.current;
    if (!c) return;
    onSave(c.toDataURL("image/jpeg", 0.85));
  };

  // Portal nach <body>: animierte Vorfahren (transform) würden position:fixed
  // sonst relativ zu sich selbst verankern statt zum Viewport.
  return createPortal(
    <div className="anno-overlay" role="dialog" aria-label="Foto markieren">
      <div className="anno-top">
        <button className="iconbtn anno-hell" onClick={onClose} aria-label="Schließen"><Icon name="x" size={18} /></button>
        <span className="anno-titel">{titel ?? "Markieren"}</span>
        <button className="iconbtn anno-hell" onClick={rueckgaengig} disabled={anzahl === 0} aria-label="Rückgängig" title="Rückgängig">↶</button>
      </div>

      <div className="anno-tools">
        <div className="segmented small anno-seg">
          <button className={werkzeug === "stift" ? "seg active" : "seg"} onClick={() => setWerkzeug("stift")}>Stift</button>
          <button className={werkzeug === "pfeil" ? "seg active" : "seg"} onClick={() => setWerkzeug("pfeil")}>Pfeil</button>
          <button className={werkzeug === "text" ? "seg active" : "seg"} onClick={() => setWerkzeug("text")}>Text</button>
        </div>
        <div className="anno-farben">
          {FARBEN.map((f) => (
            <button key={f} className={`anno-farbe${farbe === f ? " aktiv" : ""}`} style={{ background: f }}
              onClick={() => setFarbe(f)} aria-label={`Farbe ${f}`} />
          ))}
        </div>
      </div>
      {werkzeug === "text" && (
        <div className="anno-textzeile">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Text eingeben, dann aufs Bild tippen" />
        </div>
      )}

      <div className="anno-canvas-wrap">
        <canvas
          ref={canvasRef} className="anno-canvas"
          onPointerDown={start} onPointerMove={bewege} onPointerUp={ende} onPointerCancel={ende}
        />
      </div>

      <div className="anno-fuss">
        <button className="btn" onClick={onClose}>Abbrechen</button>
        <button className="btn btn-primary" onClick={speichern} disabled={!bereit || anzahl === 0}>
          <Icon name="check" size={15} /> Markierungen speichern
        </button>
      </div>
    </div>,
    document.body,
  );
}
