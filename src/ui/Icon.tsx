// Konsistente Outline-Icons (Lucide-abgeleitet), inline als SVG — keine externe Abhängigkeit.
type IconName =
  | "dashboard" | "folder" | "scan" | "wind" | "menu" | "plus" | "chevronRight" | "chevronLeft"
  | "alert" | "droplet" | "fileText" | "map" | "search" | "check" | "x" | "gauge" | "clock"
  | "layers" | "logout" | "qr" | "barcode" | "spark";

const PATHS: Record<IconName, JSX.Element> = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  folder: <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />,
  scan: <><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M7 12h10" /></>,
  wind: <><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" /><path d="M9.6 4.6A2 2 0 1 1 11 8H2" /><path d="M12.6 19.4A2 2 0 1 0 14 16H2" /></>,
  menu: <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  alert: <><path d="m10.29 3.86-8.18 14.14a2 2 0 0 0 1.71 3h16.36a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
  droplet: <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5S12.5 5 12 2.5C11.5 5 10 7.4 8 9.5S5 13 5 15a7 7 0 0 0 7 7Z" />,
  fileText: <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v5h5" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></>,
  map: <><path d="M14.5 4 9 6 3.5 4A1 1 0 0 0 2 5v13a1 1 0 0 0 .68.95L9 21l6-2 5.32 1.9A1 1 0 0 0 22 20V7a1 1 0 0 0-.68-.95Z" /><path d="M9 6v15" /><path d="M15 4v15" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  gauge: <><path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
  qr: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3" /><path d="M20 14v7" /><path d="M14 20h3" /></>,
  barcode: <><path d="M4 6v12" /><path d="M8 6v12" /><path d="M12 6v12" /><path d="M16 6v12" /><path d="M20 6v12" /></>,
  spark: <path d="M12 3v4m0 10v4m9-9h-4M7 12H3m13.5-6.5-2.8 2.8m-5.4 5.4-2.8 2.8m11 0-2.8-2.8m-5.4-5.4L5.5 5.5" />,
};

export function Icon({ name, size = 22, className, strokeWidth = 1.75 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

export type { IconName };
