/**
 * Obserwowane potrzeby + „Nie jesteś sam".
 *
 * To domyka drugą połowę pętli, której nie było w prototypie: mieszkaniec
 * zgłasza potrzebę (albo zakłada obserwację) → ROPS dodaje innowację do
 * katalogu → mieszkanka dowiaduje się o tym z powrotem. Bez tego zgłoszenie
 * znika w panelu i nikomu nic nie wraca — a wymóg techniczny zadania mówi
 * wprost o „automatycznych powiadomieniach o nowych pomysłach".
 *
 * Mechanizm jest rozmyślnie prosty i offline-first: stan w localStorage
 * (wzorzec z lib/store.ts), a przełączenie dema „ról" odbywa się w jednym
 * oknie przeglądarki, więc powiadomienie pojawia się natychmiast po dodaniu
 * karty w Panelu ROPS. Powiadomienia tworzy wyłącznie `notifyCatalogAddition`
 * wywoływany przy jawnej akcji administratora — commity z backendu (sync
 * 115 kart na starcie) celowo nie generują szumu, żeby przy otwieraniu
 * aplikacji nie zasypywać użytkownika 115 „nowościami".
 *
 * Liczby „Nie jesteś sam" to dane demonstracyjne (deterministyczne, nie
 * losowe, żeby demo się nie rozjeżdżało między odświeżeniami). Tak jak reszta
 * danych demo w prototypie są opisane w stopce aplikacji.
 */
import type { Innovation } from "./data";
import { STEM_TO_CONCEPTS } from "./concepts";
import { stems } from "./text";

const KEY = "hubmi.watches.v1";

export interface WatchEntry {
  /** stabilny klucz zapytania — po nim rozpoznajemy „już obserwujesz" */
  id: string;
  /** opis problemu użytkownika, pokazywany w powiadomieniu */
  text: string;
  /** rozpoznane wątki (id + etykieta z analysis z backendu) */
  concepts: { id: string; label: string }[];
  createdAt: number;
}

export interface WatchNotice {
  id: string;
  innovationId: string;
  innovationName: string;
  /** opis obserwowanej potrzeby, do której pasuje innowacja */
  watchText: string;
  createdAt: number;
  read: boolean;
}

interface WatchState {
  watches: WatchEntry[];
  notices: WatchNotice[];
}

export interface ConceptRef {
  id: string;
  label: string;
}

/** Puste przy braku localStorage (tryb prywatny) — wtedy pracuje tylko w pamięci. */
function load(): WatchState {
  if (typeof window === "undefined") return { watches: [], notices: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WatchState;
      return {
        watches: Array.isArray(parsed.watches) ? parsed.watches : [],
        notices: Array.isArray(parsed.notices) ? parsed.notices : [],
      };
    }
  } catch {
    // uszkodzony wpis - startujemy od pustego stanu
  }
  return { watches: [], notices: [] };
}

let state: WatchState = load();
const listeners = new Set<() => void>();

function commit(next: WatchState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // brak miejsca / tryb prywatny - stan zostaje w pamięci
  }
  listeners.forEach((l) => l());
}

export function subscribeWatch(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Cały stan jako niezmienny wyciąg — pod useSyncExternalStore. */
export function getWatchState(): WatchState {
  return state;
}

/** Normalizacja klucza: drobne różnice wypowiedzi nie mnożą obserwacji. */
export function watchKey(problem: string): string {
  return problem.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 160);
}

export function watchNeed(problem: string, concepts: ConceptRef[]) {
  const key = watchKey(problem);
  const rest = state.watches.filter((w) => w.id !== key);
  commit({
    ...state,
    watches: [
      ...rest,
      { id: key, text: problem, concepts, createdAt: Date.now() },
    ],
  });
}

export function unwatchNeed(id: string) {
  commit({
    ...state,
    watches: state.watches.filter((w) => w.id !== id),
  });
}

export function isWatched(problem: string | undefined | null): boolean {
  if (!problem) return false;
  return state.watches.some((w) => w.id === watchKey(problem));
}

export function markNoticesRead() {
  if (state.notices.every((n) => n.read)) return;
  commit({
    ...state,
    notices: state.notices.map((n) => ({ ...n, read: true })),
  });
}

export function unreadNotices(): WatchNotice[] {
  return state.notices.filter((n) => !n.read);
}

/** Wątki karty wyciągnięte tą samą warstwą, co matchmaking (rdzenie → wątki). */
function conceptsOf(inn: Innovation): Set<string> {
  const text = [inn.name, inn.problem, inn.desc, inn.target, inn.benef, inn.catName]
    .join(" ");
  const out = new Set<string>();
  for (const s of stems(text)) {
    for (const id of STEM_TO_CONCEPTS.get(s) ?? []) out.add(id);
  }
  return out;
}

function matches(w: WatchEntry, inn: Innovation): boolean {
  if (w.concepts.length > 0) {
    const card = conceptsOf(inn);
    return w.concepts.some((c) => card.has(c.id));
  }
  // Zapytanie bez rozpoznanych wątków - jedyny możliwy sygnał to po prostu
  // wspólne rdzenie słów między opisem a kartą.
  const watchStems = new Set(stems(w.text));
  const cardStems = new Set(
    stems([inn.name, inn.problem, inn.desc, inn.target].join(" ")),
  );
  for (const s of watchStems) {
    if (s.length > 3 && cardStems.has(s)) return true;
  }
  return false;
}

/**
 * Wywołuje wyłącznie jawne dodanie karty przez administratora (moduł VI).
 * Commity z synchronizacji backendu ignorujemy, żeby przy starcie aplikacji
 * nie zasypywać użytkownika 115 „nowościami".
 */
export function notifyCatalogAddition(inn: Innovation) {
  const fresh: WatchNotice[] = [];
  for (const w of state.watches) {
    if (!matches(w, inn)) continue;
    fresh.push({
      id: `${inn.id}:${w.id}:${Date.now()}`,
      innovationId: inn.id,
      innovationName: inn.name,
      watchText: w.text,
      createdAt: Date.now(),
      read: false,
    });
  }
  if (fresh.length === 0) return;
  commit({ ...state, notices: [...fresh, ...state.notices] });
}

// --- „Nie jesteś sam": bazowe liczby podobnych zgłoszeń (dane demo) ----------

/** FNV-1a - stabilny, bo nie chcemy, żeby liczby skakały między odświeżeniami. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/** Bazowa liczba podobnych zgłoszeń w tygodniu dla jednego wątku (2–10). */
function seedFor(conceptId: string): number {
  return 2 + (hash(conceptId) % 9);
}

/**
 * Suma bazowych liczników demo po wątkach zapytania (wątki bez dublowania).
 * Zgłoszenia z tej samej przeglądarki nie są doliczane - to są dane samego
 * użytkownika, a nie „inni mieszkańcy".
 */
export function similarSearches(concepts: ConceptRef[]): number {
  let total = 0;
  const seen = new Set<string>();
  for (const c of concepts) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    total += seedFor(c.id);
  }
  return total;
}

/** Do luki: „podobnej pomocy szukało N osób przed Tobą". */
export function seekersBeforeYou(concepts: ConceptRef[]): number {
  return similarSearches(concepts) + 1;
}
