// Bild aus einer Datei (Kamera/Galerie) auf eine handhabbare Größe bringen und als
// JPEG-Data-URL zurückgeben. Nötig, weil Fotos offline-first in localStorage/Sync landen —
// Originale von Handykameras (mehrere MB) würden den Speicher sprengen.

const MAX_KANTE = 1280; // px längste Kante
const QUALITAET = 0.72; // JPEG

/** Liest eine Bilddatei, skaliert sie herunter und liefert eine komprimierte JPEG-Data-URL.
 *  maxKante überschreibbar: 360°-Panoramen brauchen mehr Breite (Detail beim Schwenken). */
export function komprimiereBild(datei: File, maxKante: number = MAX_KANTE): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!datei.type.startsWith("image/")) { reject(new Error("Keine Bilddatei")); return; }
    const url = URL.createObjectURL(datei);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const skala = Math.min(1, maxKante / Math.max(img.width, img.height));
      const w = Math.round(img.width * skala);
      const h = Math.round(img.height * skala);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas nicht verfügbar")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", QUALITAET));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Bild konnte nicht geladen werden")); };
    img.src = url;
  });
}
