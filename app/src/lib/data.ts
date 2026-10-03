/** Typy i wczytanie bundle'a danych. Dane są statyczne — żadnego backendu. */
import innovationsRaw from "../data/innovations.json";
import libraryRaw from "../data/library.json";
import mapRaw from "../data/malopolska.json";

export interface Deployment {
  powiat: string;
  org: string;
  year: number;
  email: string;
  phone: string;
  /** zawsze true — geografia wdrożeń to dane demo, ROPS ich nie publikuje */
  demo: boolean;
}

export interface Innovation {
  id: string;
  name: string;
  cat: string;
  catName: string;
  problem: string;
  desc: string;
  target: string;
  benef: string;
  evidence: string;
  authors: string[];
  badges: string[];
  video: string | null;
  pdf: string | null;
  zip: string | null;
  license: string | null;
  url: string;
  deployments: Deployment[];
}

export interface LibraryItem {
  section: string;
  title: string;
  year: string | null;
  type: string;
  url: string;
  desc: string;
  bytes: number | null;
}

export interface MapUnit {
  id: string;
  name: string;
  city: boolean;
  /** gotowy atrybut `d` dla <path> */
  d: string;
  cx: number;
  cy: number;
}

export const CATEGORIES = (innovationsRaw as any).categories as {
  slug: string;
  title: string;
}[];

export const INNOVATIONS = (innovationsRaw as any).innovations as Innovation[];

export const LIBRARY = (libraryRaw as any).items as LibraryItem[];

export const MAP = mapRaw as { viewBox: string; source: string; units: MapUnit[] };

export const POWIATY: string[] = [...MAP.units.map((u) => u.id)].sort((a, b) =>
  a.localeCompare(b, "pl"),
);

export function byId(id: string): Innovation | undefined {
  return INNOVATIONS.find((i) => i.id === id);
}

/** Liczba innowacji wdrożonych (demo) w danym powiecie. */
export function countByPowiat(): Map<string, number> {
  const m = new Map<string, number>();
  for (const inn of INNOVATIONS) {
    for (const d of inn.deployments) {
      m.set(d.powiat, (m.get(d.powiat) ?? 0) + 1);
    }
  }
  return m;
}
