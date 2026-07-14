import qrcode from "qrcode-generator";

// Echter, scannbarer QR-Code als SVG (dependency-free, offlinefähig — kein externer Dienst).
// Fehlerkorrektur "M" (~15 %), damit auch ein leicht verschmutztes Etikett noch lesbar bleibt.
export function QrCode({ value, size = 200, className }: { value: string; size?: number; className?: string }) {
  const qr = qrcode(0, "M"); // Typnummer 0 = automatisch passend zur Länge
  qr.addData(value);
  qr.make();
  const count = qr.getModuleCount();
  const cell = size / count;

  const rects: string[] = [];
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) rects.push(`<rect x="${(c * cell).toFixed(2)}" y="${(r * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}"/>`);
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><g fill="#0b0d12">${rects.join("")}</g></svg>`;

  return <span className={className} aria-label="QR-Code" dangerouslySetInnerHTML={{ __html: svg }} />;
}
