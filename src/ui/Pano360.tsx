import { useEffect, useRef } from "react";
import { Modal } from "./motion";

// 360°-Raumansicht (Roadmap C-Detail, PO 18.07.): ein Panorama-Foto je Raum,
// als Kugel-Ansicht schwenkbar — wie die alten HTC-Photo-Spheres.
// Bewusst OHNE three.js: ein kleiner WebGL-Shader projiziert das
// equirektangulare Bild direkt (≈100 Zeilen, kein externes Paket, offline-fähig).
// Ohne WebGL fällt die Ansicht auf ein seitlich scrollbares Bild zurück.

const VERTEX = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
// Blickrichtung je Pixel aus Yaw/Pitch/FOV → Länge/Breite → Texturkoordinate.
const FRAGMENT = `precision mediump float;
uniform sampler2D bild; uniform vec2 groesse; uniform float yaw; uniform float pitch; uniform float fov;
void main(){
  vec2 ndc = (gl_FragCoord.xy / groesse) * 2.0 - 1.0;
  float f = 1.0 / tan(fov * 0.5);
  vec3 blick = normalize(vec3(ndc.x * (groesse.x / groesse.y), ndc.y, -f));
  float cp = cos(pitch), sp = sin(pitch);
  blick = vec3(blick.x, blick.y * cp - blick.z * sp, blick.y * sp + blick.z * cp);
  float cy = cos(yaw), sy = sin(yaw);
  blick = vec3(blick.x * cy + blick.z * sy, blick.y, -blick.x * sy + blick.z * cy);
  float lon = atan(blick.x, -blick.z);
  float lat = asin(clamp(blick.y, -1.0, 1.0));
  vec2 uv = vec2(lon / 6.2831853 + 0.5, 0.5 - lat / 3.1415927);
  gl_FragColor = texture2D(bild, uv);
}`;

/** Startet die WebGL-Kugelansicht; gibt false zurück, wenn WebGL fehlt. */
function starteViewer(canvas: HTMLCanvasElement, bild: HTMLImageElement): (() => void) | false {
  const gl = canvas.getContext("webgl", { antialias: true });
  if (!gl) return false;

  const shader = (typ: number, quelle: string) => {
    const s = gl.createShader(typ)!;
    gl.shaderSource(s, quelle); gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
  gl.useProgram(prog);

  // Vollbild-Dreieckspaar
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const pLoc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(pLoc);
  gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bild);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const u = {
    groesse: gl.getUniformLocation(prog, "groesse"),
    yaw: gl.getUniformLocation(prog, "yaw"),
    pitch: gl.getUniformLocation(prog, "pitch"),
    fov: gl.getUniformLocation(prog, "fov"),
  };

  // Blickzustand: Ziehen schwenkt, Rad/Pinch zoomt (FOV), leichte Trägheit.
  const zustand = { yaw: 0, pitch: 0, fov: (75 * Math.PI) / 180, vy: 0.003, aktiv: false };
  let zeiger: { x: number; y: number } | null = null;
  let pinch = 0;
  let raf = 0;

  const zeichnen = () => {
    const b = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(b.width * dpr)), h = Math.max(1, Math.round(b.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    if (!zustand.aktiv) zustand.yaw += zustand.vy; // sanfte Auto-Drehung bis zum ersten Griff
    gl.uniform2f(u.groesse, w, h);
    gl.uniform1f(u.yaw, zustand.yaw);
    gl.uniform1f(u.pitch, zustand.pitch);
    gl.uniform1f(u.fov, zustand.fov);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(zeichnen);
  };
  raf = requestAnimationFrame(zeichnen);

  const runter = (e: PointerEvent) => {
    zustand.aktiv = true; zustand.vy = 0;
    zeiger = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  };
  const bewegt = (e: PointerEvent) => {
    if (!zeiger) return;
    const skala = zustand.fov / canvas.clientHeight; // Zoom-abhängige Empfindlichkeit
    zustand.yaw -= (e.clientX - zeiger.x) * skala;
    zustand.pitch = Math.max(-1.45, Math.min(1.45, zustand.pitch + (e.clientY - zeiger.y) * skala));
    zeiger = { x: e.clientX, y: e.clientY };
  };
  const hoch = () => { zeiger = null; };
  const rad = (e: WheelEvent) => {
    e.preventDefault();
    zustand.fov = Math.max(0.5, Math.min(2.2, zustand.fov + e.deltaY * 0.002));
  };
  const touchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  };
  const touchMove = (e: TouchEvent) => {
    if (e.touches.length !== 2 || !pinch) return;
    e.preventDefault();
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    zustand.fov = Math.max(0.5, Math.min(2.2, zustand.fov * (pinch / d)));
    pinch = d;
  };

  canvas.addEventListener("pointerdown", runter);
  canvas.addEventListener("pointermove", bewegt);
  canvas.addEventListener("pointerup", hoch);
  canvas.addEventListener("pointercancel", hoch);
  canvas.addEventListener("wheel", rad, { passive: false });
  canvas.addEventListener("touchstart", touchStart, { passive: true });
  canvas.addEventListener("touchmove", touchMove, { passive: false });

  return () => {
    cancelAnimationFrame(raf);
    canvas.removeEventListener("pointerdown", runter);
    canvas.removeEventListener("pointermove", bewegt);
    canvas.removeEventListener("pointerup", hoch);
    canvas.removeEventListener("pointercancel", hoch);
    canvas.removeEventListener("wheel", rad);
    canvas.removeEventListener("touchstart", touchStart);
    canvas.removeEventListener("touchmove", touchMove);
  };
}

export function Pano360({ src, titel, onClose }: { src: string; titel: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let aufraeumen: (() => void) | false = false;
    const bild = new Image();
    bild.onload = () => {
      if (canvasRef.current) aufraeumen = starteViewer(canvasRef.current, bild);
      if (!aufraeumen && fallbackRef.current && canvasRef.current) {
        // Kein WebGL: Canvas verstecken, scrollbares Breitbild zeigen.
        canvasRef.current.style.display = "none";
        fallbackRef.current.style.display = "block";
      }
    };
    bild.src = src;
    return () => { if (aufraeumen) aufraeumen(); };
  }, [src]);

  return (
    <Modal onClose={onClose}>
      <h2>{titel}</h2>
      <p className="muted small">Ziehen zum Umsehen · Rad/Pinch zum Zoomen</p>
      <canvas ref={canvasRef} className="pano-canvas" aria-label={`360°-Ansicht ${titel}`} />
      <div ref={fallbackRef} className="pano-fallback" style={{ display: "none" }}>
        <img src={src} alt={`Panorama ${titel}`} />
      </div>
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={onClose}>Schließen</button>
      </div>
    </Modal>
  );
}
