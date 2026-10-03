/**
 * Typy i wczytanie bundle'a danych HubMI.
 *
 * Wspiera zarówno bazę startową z JSON (dla natychmiastowego startu offline/demo),
 * jak i dynamiczną synchronizację z backendem PostgreSQL (`/api/innovations/`, `/api/library/`).
 */
import innovationsRaw from "../data/innovations.json";
import libraryRaw from "../data/library.json";
import mapRaw from "../data/malopolska.json";
import { api } from "./api";
import { buildIndex } from "./match";

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
  id?: string;
  section: string;
  title: string;
  year: string | null;
  type: string;
  url: string;
  desc: string;
  bytes: number | null;
  featured?: boolean;
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

export let INNOVATIONS: Innovation[] = [...(innovationsRaw as any).innovations];

export let LIBRARY: LibraryItem[] = [...(libraryRaw as any).items];

export const MAP = mapRaw as { viewBox: string; source: string; units: MapUnit[] };

export const POWIATY: string[] = [...MAP.units.map((u) => u.id)].sort((a, b) =>
  a.localeCompare(b, "pl"),
);

const catalogListeners = new Set<() => void>();

function notifyCatalogListeners() {
  catalogListeners.forEach((fn) => fn());
}

export function subscribeCatalog(fn: () => void): () => void {
  catalogListeners.add(fn);
  return () => {
    catalogListeners.delete(fn);
  };
}

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

/**
 * Dodaje nową innowację do katalogu (np. z formularza administratora),
 * aktualizuje indeks wyszukiwania i powiadamia widoki.
 */
export function addCustomInnovation(inn: Innovation) {
  const existing = INNOVATIONS.findIndex((i) => i.id === inn.id);
  if (existing >= 0) {
    INNOVATIONS[existing] = inn;
  } else {
    INNOVATIONS = [inn, ...INNOVATIONS];
  }
  buildIndex(INNOVATIONS);
  notifyCatalogListeners();
}

/**
 * Pobiera dane katalogu z prawdziwego backendu Django REST Framework,
 * jeśli serwer jest uruchomiony.
 */
export async function loadCatalogFromBackend(): Promise<boolean> {
  try {
    const [innRes, libRes] = await Promise.all([
      api.innovations.list(),
      api.library.list(),
    ]);

    let changed = false;

    if (innRes.ok && Array.isArray(innRes.data) && innRes.data.length > 0) {
      const serverInnovations: Innovation[] = innRes.data.map((item: any) => ({
        id: String(item.id),
        name: item.name,
        cat: item.cat || (item.category?.slug ?? "inne"),
        catName: item.catName || (item.category?.title ?? "Innowacja społeczna"),
        problem: item.problem || "",
        desc: item.desc || item.description || "",
        target: item.target || "",
        benef: item.benef || item.beneficiaries || "",
        evidence: item.evidence || "",
        authors: item.authors || [],
        badges: item.badges || [],
        video: item.video || null,
        pdf: item.pdf || null,
        zip: item.zip || null,
        license: item.license || null,
        url: item.url || "",
        deployments: item.deployments || [],
      }));

      // Zachowaj unikalne wpisy lokalne
      const serverIds = new Set(serverInnovations.map((i) => i.id));
      const localOnly = INNOVATIONS.filter((i) => !serverIds.has(i.id));
      INNOVATIONS = [...serverInnovations, ...localOnly];
      buildIndex(INNOVATIONS);
      changed = true;
    }

    if (libRes.ok && Array.isArray(libRes.data) && libRes.data.length > 0) {
      LIBRARY = libRes.data.map((item: any) => ({
        id: String(item.id),
        section: item.section,
        title: item.title,
        year: item.year ? String(item.year) : null,
        type: item.type || "dokument",
        url: item.url || "",
        desc: item.desc || "",
        bytes: typeof item.bytes === "number" ? item.bytes : null,
        featured: Boolean(item.featured),
      }));
      changed = true;
    }

    if (changed) {
      notifyCatalogListeners();
    }
    return true;
  } catch {
    return false;
  }
}

// Uruchomienie ładowania z backendu w tle
if (typeof window !== "undefined") {
  setTimeout(() => {
    loadCatalogFromBackend();
  }, 200);
}
