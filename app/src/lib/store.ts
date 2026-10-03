/**
 * Stan aplikacji — mock backendu.
 *
 * Wszystko leży w localStorage, więc zamknięta pętla (mieszkanka zgłasza →
 * admin widzi powiadomienie → odpowiada → autorka widzi odpowiedź) działa
 * na żywo w demo, bez serwera. Przy wdrożeniu `save()` i `load()` podmienia
 * się na wywołania API; reszta aplikacji nie wie o różnicy.
 *
 * Jeden model `Thread` obsługuje wszystkie kanały zgłoszeń: pomysł (moduł III),
 * lukę z matchmakingu (I → VI), pytanie do ROPS (V) i zgłoszenie na testera (IV).
 * Dzięki temu panel administratora ma jedną skrzynkę, a nie cztery.
 */

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
  /** autor — w demo zawsze pseudonim, nigdy prawdziwe dane osobowe */
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
  /** kto jest „zalogowany" — przełącznik roli na potrzeby demo */
  role: Role;
  seenByAuthor: string[];
}

const KEY = "hubmi.state.v1";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
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
            "konsultację specjalistyczną — czy pasuje Państwu termin w " +
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
    return { threads: seed(), role: "mieszkaniec", seenByAuthor: [] };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {
    // uszkodzony wpis — startujemy od danych demo
  }
  return { threads: seed(), role: "mieszkaniec", seenByAuthor: [] };
}

let state: AppState = load();
const listeners = new Set<() => void>();

function commit(next: AppState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // brak miejsca / tryb prywatny — stan zostaje w pamięci
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

/** Tworzy zgłoszenie i od razu zapala powiadomienie w panelu administratora. */
export function addThread(t: NewThread): Thread {
  const thread: Thread = {
    id: uid(),
    status: "nowe",
    createdAt: Date.now(),
    messages: [],
    author: t.author?.trim() || "Mieszkaniec (demo)",
    authorRole: "mieszkaniec",
    read: false,
    ...t,
  };
  commit({ ...state, threads: [thread, ...state.threads] });
  return thread;
}

/** Odpowiedź ROPS lub eksperta — domyka pętlę komunikacji. */
export function reply(threadId: string, text: string, from: Role = "ROPS", author?: string) {
  const threads = state.threads.map((th) =>
    th.id !== threadId
      ? th
      : {
          ...th,
          status: "odpowiedziane" as ThreadStatus,
          read: true,
          messages: [
            ...th.messages,
            {
              id: uid(),
              from,
              author: author || (from === "ROPS" ? "Koordynator ROPS (demo)" : "Ekspert (demo)"),
              text,
              at: Date.now(),
            },
          ],
        },
  );
  // odpowiedź jest nowa dla autora, więc znika z listy „już widziane"
  commit({ ...state, threads, seenByAuthor: state.seenByAuthor.filter((id) => id !== threadId) });
}

export function setStatus(threadId: string, status: ThreadStatus) {
  commit({
    ...state,
    threads: state.threads.map((th) =>
      th.id === threadId ? { ...th, status, read: true } : th,
    ),
  });
}

export function markRead(threadId: string) {
  commit({
    ...state,
    threads: state.threads.map((th) => (th.id === threadId ? { ...th, read: true } : th)),
  });
}

/** Autor przeczytał odpowiedź — kropka „nowa odpowiedź" gaśnie. */
export function markSeenByAuthor(threadId: string) {
  if (state.seenByAuthor.includes(threadId)) return;
  commit({ ...state, seenByAuthor: [...state.seenByAuthor, threadId] });
}

export function resetDemo() {
  commit({ threads: seed(), role: "mieszkaniec", seenByAuthor: [] });
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
