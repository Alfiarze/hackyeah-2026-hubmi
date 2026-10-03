/**
 * Stan aplikacji - hybrydowy store (lokalny stan z automatyczną synchronizacją z API).
 *
 * Zasada działania:
 *  1. Zawsze startuje natychmiast z danych lokalnych (localStorage / seed) - zero opóźnień
 *     przy pierwszym renderze, 100% odporność na brak sieci (offline-first).
 *  2. W tle weryfikuje łączność z backendem Django (`/api/health/`).
 *  3. Gdy backend jest dostępny, automatycznie dociąga wątki z serwera (`/api/threads/`)
 *     i asynchronicznie przesyła nowe zgłoszenia, odpowiedzi i statusy.
 *  4. Gdy backend jest wyłączony, aplikacja działa bez żadnych błędów w trybie demo.
 */

import { api, BackendThread } from "./api";

export type ThreadKind = "pomysł" | "luka" | "pytanie" | "test";
export type ThreadStatus = "nowe" | "w trakcie" | "odpowiedziane" | "zamknięte";
export type Role = "mieszkaniec" | "ROPS" | "ekspert";

export interface Message {
  id: string;
  from: Role;
  author: string;
  text: string;
  at: number;
}

export interface Thread {
  id: string;
  kind: ThreadKind;
  title: string;
  /** autor - w demo zawsze pseudonim, nigdy prawdziwe dane osobowe */
  author: string;
  authorRole: Role;
  powiat?: string;
  body: string;
  status: ThreadStatus;
  createdAt: number;
  messages: Message[];
  /** przy luce: wątki rozpoznane i nierozpoznane w zapytaniu */
  concepts?: string[];
  unknownTerms?: string[];
  /** przy luce: najlepszy wynik dopasowania, 0–100 */
  topScore?: number;
  /** przy pomyśle: dane fiszki */
  fiszka?: Fiszka;
  /** przy zgłoszeniu na testera: id innowacji */
  innovationId?: string;
  /** ocena innowacji 1–5 (moduł IV) */
  rating?: number;
  /** czy admin oznaczył jako przeczytane */
  read?: boolean;
}

export interface Fiszka {
  istota: string;
  adresat: string;
  etap: "pomysł" | "prototyp" | "testowanie" | "gotowe do skalowania";
  obszar: string;
}

export interface AppState {
  threads: Thread[];
  /** kto jest „zalogowany" - przełącznik roli na potrzeby demo */
  role: Role;
  seenByAuthor: string[];
  backendConnected: boolean;
}

const KEY = "hubmi.state.v1";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Konwersja wątku z modelu Django REST Framework do formatu aplikacji frontendu. */
function backendToFrontend(b: BackendThread): Thread {
  const parseTime = (iso?: string) => {
    if (!iso) return Date.now();
    const t = Date.parse(iso);
    return isNaN(t) ? Date.now() : t;
  };

  return {
    id: String(b.id),
    kind: (b.kind as ThreadKind) || "pomysł",
    title: b.title || "Bez tytułu",
    author: b.author_name || "Mieszkaniec (demo)",
    authorRole: (b.author_role as Role) || "mieszkaniec",
    powiat: b.powiat || undefined,
    body: b.body || "",
    status: (b.status as ThreadStatus) || "nowe",
    createdAt: parseTime(b.created_at),
    messages: (b.messages || []).map((m) => ({
      id: String(m.id || uid()),
      from: (m.role as Role) || "mieszkaniec",
      author: m.author_name || "Uczestnik",
      text: m.text || "",
      at: parseTime(m.created_at),
    })),
    concepts: b.concepts || [],
    unknownTerms: b.unknown_terms || [],
    topScore: typeof b.top_score === "number" ? b.top_score : undefined,
    fiszka: b.fiszka
      ? {
          istota: b.fiszka.istota || "",
          adresat: b.fiszka.adresat || "",
          etap: b.fiszka.etap || "pomysł",
          obszar: b.fiszka.obszar || "",
        }
      : undefined,
    innovationId: b.innovation ? String(b.innovation) : undefined,
    rating: typeof b.rating === "number" ? b.rating : undefined,
    read: Boolean(b.read),
  };
}

/** Dane startowe, żeby panel admina i mapa nie były puste przy pierwszym wejściu. */
function seed(): Thread[] {
  const now = Date.now();
  const h = 3_600_000;
  return [
    {
      id: "seed-1",
      kind: "luka",
      title: "Brak wsparcia dla opiekunów rodzinnych osób z demencją",
      author: "Mieszkanka (demo)",
      authorRole: "mieszkaniec",
      powiat: "limanowski",
      body:
        "Opiekuję się mamą z demencją. Nie ma nikogo, kto by mnie zastąpił " +
        "na kilka godzin. Nie wiem, gdzie szukać pomocy.",
      status: "nowe",
      createdAt: now - 2 * h,
      messages: [],
      concepts: ["demencja i pamięć", "opieka długoterminowa"],
      unknownTerms: ["zastąpił", "wytchnienie"],
      topScore: 28,
    },
    {
      id: "seed-2",
      kind: "luka",
      title: "Młodzież po szkole nie ma gdzie się podziać, sięga po alkohol",
      author: "Pracownik CUS (demo)",
      authorRole: "mieszkaniec",
      powiat: "dąbrowski",
      body:
        "W gminie nie ma świetlicy ani klubu. Młodzież spotyka się na " +
        "przystanku, zdarza się alkohol. Szukamy sprawdzonego modelu.",
      status: "nowe",
      createdAt: now - 5 * h,
      messages: [],
      concepts: ["dzieci i młodzież", "obszary wiejskie"],
      unknownTerms: ["alkohol", "świetlica", "przystanek"],
      topScore: 31,
    },
    {
      id: "seed-3",
      kind: "pomysł",
      title: "Sąsiedzka skrzynka leków",
      author: "Grupa nieformalna (demo)",
      authorRole: "mieszkaniec",
      powiat: "nowosądecki",
      body:
        "Punkt w sołectwie, gdzie sąsiedzi zostawiają niewykorzystane, " +
        "nieotwarte leki OTC, a pielęgniarka środowiskowa je wydaje.",
      status: "odpowiedziane",
      createdAt: now - 30 * h,
      messages: [
        {
          id: uid(),
          from: "ROPS",
          author: "Koordynator innowacji (demo)",
          text:
            "Dziękujemy za zgłoszenie. Pomysł jest ciekawy, ale wymaga " +
            "sprawdzenia pod kątem prawa farmaceutycznego. Proponujemy " +
            "konsultację specjalistyczną - czy pasuje Państwu termin w " +
            "przyszłym tygodniu?",
          at: now - 26 * h,
        },
      ],
      fiszka: {
        istota: "Obieg niewykorzystanych leków OTC w małej społeczności.",
        adresat: "Mieszkańcy sołectw, pielęgniarki środowiskowe.",
        etap: "pomysł",
        obszar: "zdrowie i medycyna",
      },
    },
    {
      id: "seed-4",
      kind: "pytanie",
      title: "Czy na grant może aplikować grupa nieformalna?",
      author: "Mieszkaniec (demo)",
      authorRole: "mieszkaniec",
      body: "Jesteśmy w trójkę, bez stowarzyszenia. Możemy składać wniosek?",
      status: "odpowiedziane",
      createdAt: now - 50 * h,
      messages: [
        {
          id: uid(),
          from: "ROPS",
          author: "Mentor (demo)",
          text:
            "Tak. Zgodnie z zasadami naboru aplikować mogą również grupy " +
            "nieformalne złożone z kilku osób fizycznych. Wkład własny nie " +
            "jest wymagany.",
          at: now - 48 * h,
        },
      ],
    },
  ];
}

function load(): AppState {
  if (typeof localStorage === "undefined") {
    return { threads: seed(), role: "mieszkaniec", seenByAuthor: [], backendConnected: false };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        threads: parsed.threads || seed(),
        role: parsed.role || "mieszkaniec",
        seenByAuthor: parsed.seenByAuthor || [],
        backendConnected: false,
      };
    }
  } catch {
    // uszkodzony wpis - startujemy od danych demo
  }
  return { threads: seed(), role: "mieszkaniec", seenByAuthor: [], backendConnected: false };
}

let state: AppState = load();
const listeners = new Set<() => void>();

function commit(next: AppState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // brak miejsca / tryb prywatny - stan zostaje w pamięci
  }
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getState(): AppState {
  return state;
}

export function isBackendConnected(): boolean {
  return state.backendConnected;
}

export function setRole(role: Role) {
  commit({ ...state, role });
}

export interface NewThread {
  kind: ThreadKind;
  title: string;
  body: string;
  author?: string;
  powiat?: string;
  concepts?: string[];
  unknownTerms?: string[];
  topScore?: number;
  fiszka?: Fiszka;
  innovationId?: string;
  rating?: number;
}

/**
 * Wkłada do stanu wątek, który backend już utworzył - bez ponownego POST-a.
 *
 * Używa tego moduł I: lukę zakłada `POST /api/match/gaps/`, bo tylko ta ścieżka
 * wiąże wątek z zapytaniem (`SearchQuery`) i zasila trendy. Gdybyśmy wywołali
 * tu `addThread`, powstałby drugi, osierocony wątek o tej samej treści.
 */
export function addLocalThread(t: NewThread & { id: string }): Thread {
  const { id, ...rest } = t;
  const thread: Thread = {
    id,
    status: "nowe",
    createdAt: Date.now(),
    messages: [],
    author: t.author?.trim() || "Mieszkaniec (demo)",
    authorRole: "mieszkaniec",
    read: false,
    ...rest,
  };
  commit({ ...state, threads: [thread, ...state.threads], backendConnected: true });
  return thread;
}

/** Tworzy zgłoszenie natychmiast w UI, a przy dostępnym backendzie wysyła do Django. */
export function addThread(t: NewThread): Thread {
  const localId = uid();
  const thread: Thread = {
    id: localId,
    status: "nowe",
    createdAt: Date.now(),
    messages: [],
    author: t.author?.trim() || "Mieszkaniec (demo)",
    authorRole: "mieszkaniec",
    read: false,
    ...t,
  };

  commit({ ...state, threads: [thread, ...state.threads] });

  // Asynchroniczna synchronizacja z backendem
  (async () => {
    try {
      const res = await api.threads.create({
        kind: t.kind,
        title: t.title,
        body: t.body,
        author_name: thread.author,
        powiat: t.powiat,
        innovation_id: t.innovationId,
        rating: t.rating,
        concepts: t.concepts,
        unknown_terms: t.unknownTerms,
        top_score: t.topScore,
        fiszka: t.fiszka,
      });

      if (res.ok && res.data?.id) {
        const backendId = String(res.data.id);
        // Podmień ID lokalne na oficjalne UUID z backendu
        const updated = state.threads.map((th) => (th.id === localId ? { ...th, id: backendId } : th));
        commit({ ...state, threads: updated, backendConnected: true });
      }
    } catch {
      // Offline fallback: stan lokalny już jest zaktualizowany
    }
  })();

  return thread;
}

/** Odpowiedź ROPS lub eksperta - domyka pętlę komunikacji. */
export function reply(threadId: string, text: string, from: Role = "ROPS", author?: string) {
  const authorName = author || (from === "ROPS" ? "Koordynator ROPS (demo)" : "Ekspert (demo)");
  const newMsg: Message = {
    id: uid(),
    from,
    author: authorName,
    text,
    at: Date.now(),
  };

  const threads = state.threads.map((th) =>
    th.id !== threadId
      ? th
      : {
          ...th,
          status: "odpowiedziane" as ThreadStatus,
          read: true,
          messages: [...th.messages, newMsg],
        },
  );

  commit({
    ...state,
    threads,
    seenByAuthor: state.seenByAuthor.filter((id) => id !== threadId),
  });

  // Asynchroniczna wysyłka do API
  (async () => {
    try {
      await api.threads.addMessage(threadId, text, authorName, from);
    } catch {
      // cichy fallback w demo
    }
  })();
}

export function setStatus(threadId: string, status: ThreadStatus) {
  commit({
    ...state,
    threads: state.threads.map((th) =>
      th.id === threadId ? { ...th, status, read: true } : th,
    ),
  });

  (async () => {
    try {
      await api.threads.moderate(threadId, { status, read: true });
    } catch {
      // offline
    }
  })();
}

export function markRead(threadId: string) {
  commit({
    ...state,
    threads: state.threads.map((th) => (th.id === threadId ? { ...th, read: true } : th)),
  });

  (async () => {
    try {
      await api.threads.moderate(threadId, { read: true });
    } catch {
      // offline
    }
  })();
}

/** Autor przeczytał odpowiedź - kropka „nowa odpowiedź" gaśnie. */
export function markSeenByAuthor(threadId: string) {
  if (state.seenByAuthor.includes(threadId)) return;
  commit({ ...state, seenByAuthor: [...state.seenByAuthor, threadId] });
}

export function resetDemo() {
  commit({ threads: seed(), role: "mieszkaniec", seenByAuthor: [], backendConnected: state.backendConnected });
}

/** Zgłoszenia nieprzeczytane przez administratora. */
export function unreadForAdmin(s: AppState = state): Thread[] {
  return s.threads.filter((t) => !t.read && t.status === "nowe");
}

/** Wątki z odpowiedzią, której autor jeszcze nie widział. */
export function unseenRepliesForAuthor(s: AppState = state): Thread[] {
  return s.threads.filter(
    (t) => t.messages.length > 0 && !s.seenByAuthor.includes(t.id),
  );
}

/**
 * Automatyczna synchronizacja z backendem:
 * Pobiera wątki z Django i łączy z lokalną bazą danych.
 */
export async function syncWithBackend(): Promise<void> {
  try {
    const health = await api.checkHealth();
    if (!health) {
      if (state.backendConnected) {
        commit({ ...state, backendConnected: false });
      }
      return;
    }

    const res = await api.threads.list();
    if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
      const serverThreads = res.data.map(backendToFrontend);
      const serverIds = new Set(serverThreads.map((t) => t.id));

      // Zachowaj wątki lokalne (np. seed), których serwer jeszcze nie ma
      const localOnly = state.threads.filter((t) => !serverIds.has(t.id));
      const merged = [...serverThreads, ...localOnly];

      commit({
        ...state,
        threads: merged,
        backendConnected: true,
      });
    } else {
      commit({ ...state, backendConnected: true });
    }
  } catch {
    if (state.backendConnected) {
      commit({ ...state, backendConnected: false });
    }
  }
}

// Inicjalizacja synchronizacji w tle po załadowaniu aplikacji
if (typeof window !== "undefined") {
  setTimeout(() => {
    syncWithBackend();
  }, 300);
}
