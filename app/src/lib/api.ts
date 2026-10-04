/**
 * Klient API HubMI - połączenie frontendu React z backendem Django REST Framework.
 *
 * Wspiera:
 *  - automatyczny fallback offline/demo gdy serwer nie odpowiada,
 *  - proxy lokalne `/api` (Vite) oraz bezpośredni adres produkcyjny (Coolify / Docker),
 *  - obsługę tokenów i ról (mieszkaniec, ROPS, ekspert, admin),
 *  - endpointy wszystkich 7 modułów zadania HubMI.
 */

const env = typeof import.meta !== "undefined" ? (import.meta as any).env : undefined;
const API_BASE = (env?.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "/api";
const TOKEN_KEY = "hubmi.auth.token";

export interface ApiHealth {
  status: "ok" | "degraded" | "error";
  postgres: boolean;
  vectors: boolean;
  ai?: {
    provider: string;
    model: string;
    has_key: boolean;
  };
  stats?: {
    innovations: number;
    documents: number;
    threads: number;
  };
  latency_ms?: number;
}

export interface BackendMessage {
  id: string;
  author_name: string;
  role: string;
  text: string;
  created_at: string;
}

export interface BackendFiszka {
  istota: string;
  adresat: string;
  etap: "pomysł" | "prototyp" | "testowanie" | "gotowe do skalowania";
  obszar: string;
}

export interface BackendThread {
  id: string;
  kind: "pomysł" | "luka" | "pytanie" | "test" | "partner" | "ekspert";
  kind_label?: string;
  title: string;
  body: string;
  author_name: string;
  author_role: "mieszkaniec" | "ROPS" | "ekspert" | "admin";
  organization?: string;
  powiat?: string;
  status: "nowe" | "w trakcie" | "odpowiedziane" | "zamknięte";
  status_label?: string;
  read: boolean;
  unread_for_admin?: boolean;
  stage?: string;
  stage_label?: string;
  concepts?: string[];
  unknown_terms?: string[];
  top_score?: number;
  query_text?: string;
  innovation?: string;
  innovation_name?: string;
  rating?: number;
  fiszka?: BackendFiszka;
  votes?: Record<string, number>;
  messages: BackendMessage[];
  created_at: string;
  updated_at?: string;
}

/** Jedna karta z `/api/match/search/` - pełna fiszka + rozliczenie dopasowania. */
export interface BackendMatchResult {
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
  /** karta z bazy spoza Małopolski - zob. `origin` */
  ext?: boolean;
  origin?: {
    source: string | null;
    sourceUrl: string | null;
    scope?: string | null;
    region?: string | null;
    malopolska: boolean;
  };
  deployments: {
    powiat: string;
    org: string;
    year: number;
    email: string;
    phone: string;
    demo: boolean;
  }[];
  match: {
    score: number;
    tier: "wysokie" | "średnie" | "niskie";
    coverage: number;
    matched: {
      id: string;
      label: string;
      fields: string[];
      terms: string[];
      strength: number;
    }[];
    missed: { id: string; label: string }[];
    reasons: string[];
    /** offsety [start, end] w znakach, per pole karty */
    highlights: Record<string, [number, number][]>;
  };
  ai: {
    related: boolean | null;
    confidence: number | null;
    reason: string;
    source: string;
  };
}

/** Pełna odpowiedź `/api/match/search/`. Kształt 1:1 z `matchmaking/views.py`. */
export interface MatchSearchResult {
  /** id zapisanego SearchQuery - wymagane przy zgłoszeniu luki */
  query_id: number;
  query: string;
  analysis: {
    concepts: { id: string; label: string }[];
    stems: string[];
    unknown: string[];
  };
  results: BackendMatchResult[];
  gap: {
    is_gap: boolean;
    reason: "brak-watkow" | "brak-trafien" | "slabe-pokrycie" | null;
    text: string;
  };
  ai: {
    source: string;
    werdykty: {
      id: string;
      powiazane: boolean;
      pewnosc: number;
      noul: number;
      powod: string;
    }[];
  };
  role: string;
}

/** Odpowiedź `POST /api/match/gaps/` - luka zarejestrowana jako wątek dla ROPS. */
export interface GapReport {
  id: number;
  query: number;
  query_text: string;
  thread: string;
  thread_title: string;
  status: string;
  created_at: string;
}

export interface GrantGenerateResult {
  source: string;
  grant: {
    id: string;
    name: string;
    max_amount: number;
  };
  application: {
    tytul: string;
    wnioskodawca: string;
    partnerzy: string;
    problem: string;
    rozwiazanie: string;
    grupa_docelowa: string;
    nowosc: string;
    budzet: {
      lacznie: number;
      dotacja: number;
      wklad_wlasny: number;
      pozycje: { nazwa: string; koszt: number }[];
    };
    etapy: { nazwa: string; opis: string; miesiace: string }[];
    wskazniki: { nazwa: string; wartosc: string }[];
  };
}

export interface AdminTrendsResult {
  period_days: number;
  queries: {
    total: number;
    gaps: number;
    series: { date: string; count: number }[];
    top_concepts: { label: string; count: number }[];
    unknown_terms: { term: string; count: number }[];
    avg_top_score: number | null;
  };
  threads: {
    total: number;
    unread: number;
    by_kind: Record<string, number>;
    by_status: Record<string, number>;
    ideas_by_stage: Record<string, number>;
    by_powiat: Record<string, number>;
    votes_total: number;
  };
  gaps_open: number;
  cards: {
    total: number;
    with_evidence: number;
    with_embedding: number;
    rated: number;
  };
}

/** Jeden temat zapytań z `/api/admin/demand/` - potrzeba, nie pojedyncze zdanie. */
export interface DemandTopicRow {
  id: number;
  label: string;
  kind: "wątki" | "nowe pojęcia" | "opis";
  concepts: string[];
  terms: string[];
  /** ile razy w ogóle pytano o ten temat */
  searches: number;
  /** ile z tych zapytań skończyło się brakiem pokrycia w Bibliotece */
  unmet_searches: number;
  unmet_share: number;
  /** ile różnych przeglądarek pytało (0 = zapytania sprzed wdrożenia licznika) */
  askers: number;
  best_score: number | null;
  status: "brak pokrycia" | "słabe pokrycie" | "pokryte";
  first_seen: string;
  last_seen: string;
  days_since_last: number;
  window: { searches: number; unmet: number };
  monthly: { month: string; count: number; unmet: number }[];
  trend: {
    recent_30d: number;
    previous_30d: number;
    change_pct: number | null;
    direction: "rośnie" | "maleje" | "stabilne" | "nowe" | "cisza";
  };
  powiats: { powiat: string; count: number }[];
  samples: string[];
}

export interface AdminDemandResult {
  period_days: number;
  scope: "unmet" | "all";
  generated_at: string;
  totals: {
    /** wszystkie tematy okresu - podsumowanie nie zależy od wybranego zakresu */
    topics: number;
    /** ile tematów faktycznie trafiło do tabeli */
    listed: number;
    unmet_topics: number;
    repeated_topics: number;
    searches: number;
    unmet_searches: number;
    unmet_share: number;
    askers: number;
    window_searches: number;
    window_unmet: number;
    /** średnia liczba zapytań na temat - „to nie przypadek, to potrzeba” */
    repeat_rate: number;
  };
  series_monthly: { month: string; count: number; unmet: number }[];
  topics: DemandTopicRow[];
}

class ApiClient {
  private token: string | null = null;
  private backendAlive: boolean | null = null;
  private lastHealthCheck = 0;

  constructor() {
    if (typeof localStorage !== "undefined") {
      this.token = localStorage.getItem(TOKEN_KEY);
    }
  }

  public getLastHealthCheck(): number {
    return this.lastHealthCheck;
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof localStorage !== "undefined") {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private getClientId(): string {
    if (typeof localStorage === "undefined") return "browser-client";
    let cid = localStorage.getItem("hubmi.client_id");
    if (!cid) {
      cid = "c-" + Math.random().toString(36).slice(2, 12);
      localStorage.setItem("hubmi.client_id", cid);
    }
    return cid;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs = 6000,
  ): Promise<{ ok: boolean; data?: T; status: number; error?: string }> {
    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      "X-Hubmi-Client": this.getClientId(),
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers["Authorization"] = `Token ${this.token}`;
    }

    if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // Sygnał przerwania z zewnątrz (np. porzucone podpowiedzi emotek, gdy
    // użytkownik pisze dalej) musi dołożyć się do limitu czasu, a nie go
    // zastąpić — dlatego podpinamy go do tego samego kontrolera.
    const external = options.signal;
    if (external) {
      if (external.aborted) controller.abort();
      else external.addEventListener("abort", () => controller.abort(), { once: true });
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timer);

      let data: any = undefined;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : undefined;
      } catch {
        data = text;
      }

      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          error: (typeof data === "object" && data?.detail) || `Błąd serwera (${res.status})`,
          data,
        };
      }

      this.backendAlive = true;
      return { ok: true, status: res.status, data };
    } catch (err: any) {
      clearTimeout(timer);
      const isAbort = err.name === "AbortError";
      this.backendAlive = false;
      return {
        ok: false,
        status: isAbort ? 408 : 0,
        error: isAbort ? "Przekroczono limit czasu połączenia z API" : "Brak połączenia z backendem",
      };
    }
  }

  // --- Diagnostyka & Healthcheck --------------------------------------------

  public async checkHealth(): Promise<ApiHealth | null> {
    const now = Date.now();
    const t0 = performance.now();
    const res = await this.request<any>("/health/", { method: "GET" }, 3000);
    const ms = Math.round(performance.now() - t0);
    this.lastHealthCheck = now;

    if (res.ok && res.data) {
      this.backendAlive = true;
      return {
        status: res.data.status || "ok",
        postgres: res.data.postgres ?? true,
        vectors: res.data.vectors ?? true,
        ai: res.data.ai,
        stats: res.data.stats,
        latency_ms: ms,
      };
    }
    this.backendAlive = false;
    return null;
  }

  public isAlive(): boolean {
    return this.backendAlive === true;
  }

  // --- Wątki, zgłoszenia i komunikacja (Moduły I, III, IV, V, VI) ------------

  public threads = {
    list: async (params: { kind?: string; status?: string; stage?: string; powiat?: string } = {}) => {
      const query = new URLSearchParams();
      if (params.kind) query.set("kind", params.kind);
      if (params.status) query.set("status", params.status);
      if (params.stage) query.set("stage", params.stage);
      if (params.powiat) query.set("powiat", params.powiat);
      const qs = query.toString();
      return this.request<BackendThread[]>(`/threads/${qs ? `?${qs}` : ""}`);
    },

    get: async (id: string) => {
      return this.request<BackendThread>(`/threads/${id}/`);
    },

    create: async (payload: {
      kind: string;
      title: string;
      body: string;
      author_name?: string;
      powiat?: string;
      organization?: string;
      innovation_id?: string;
      rating?: number;
      concepts?: string[];
      unknown_terms?: string[];
      top_score?: number;
      fiszka?: BackendFiszka;
    }) => {
      return this.request<BackendThread>("/threads/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    addMessage: async (threadId: string, text: string, authorName?: string, role = "mieszkaniec") => {
      return this.request<BackendMessage>(`/threads/${threadId}/messages/`, {
        method: "POST",
        body: JSON.stringify({ text, author_name: authorName, role }),
      });
    },

    reply: async (threadId: string, text: string, authorName?: string) => {
      // Endpoint /reply/ oznacza odpowiedź pracownika ROPS / eksperta
      return this.request<BackendMessage>(`/threads/${threadId}/reply/`, {
        method: "POST",
        body: JSON.stringify({ text, author_name: authorName }),
      });
    },

    moderate: async (threadId: string, patch: { status?: string; stage?: string; read?: boolean }) => {
      return this.request<BackendThread>(`/threads/${threadId}/moderate/`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
    },

    digest: async (threadId: string) => {
      return this.request<{ source: string; summary: string; jev_decisions?: any }>(
        `/threads/${threadId}/digest/`,
      );
    },

    vote: async (threadId: string, value: "mam_to" | "chce_testowac" | "moge_pomoc") => {
      return this.request<{ vote: number; value: string; counts: Record<string, number> }>(
        `/threads/${threadId}/vote/`,
        {
          method: "POST",
          body: JSON.stringify({ value, client_id: this.getClientId() }),
        },
      );
    },

    board: async (stage?: string) => {
      const q = stage ? `?stage=${encodeURIComponent(stage)}` : "";
      return this.request<BackendThread[]>(`/threads/board/${q}`);
    },

    inbox: async () => {
      return this.request<{ results: BackendThread[]; unread: number }>("/threads/inbox/");
    },
  };

  // --- Moduł I: Matchmaking Społeczny ---------------------------------------

  public match = {
    /**
     * Jedyne źródło wyników modułu I. Backend liczy ranking (BM25 + wątki),
     * dokłada werdykty Jev i zapisuje zapytanie jako sygnał potrzeby - dlatego
     * front nie liczy niczego równolegle.
     *
     * Timeout 20 s, bo w ścieżce stoi wywołanie Jev Decisions; typowo ~1,5 s,
     * ale pierwsze zapytanie po starcie kontenera potrafi być wolniejsze.
     */
    search: async (
      q: string,
      limit = 5,
      cat?: string,
      powiat?: string,
      external = false,
    ) => {
      return this.request<MatchSearchResult>(
        "/match/search/",
        {
          method: "POST",
          body: JSON.stringify({ q, limit, cat, powiat, external }),
        },
        20000,
      );
    },

    /**
     * Dobór emotek do opisu problemu. Decyduje wyłącznie Jev — front wysyła
     * stertę (`EMOJI_CANDIDATES`) i dostaje z niej podzbiór z pewnością.
     *
     * Timeout 12 s: to podgląd przy pisaniu, więc dłuższe czekanie nie ma
     * sensu — lepiej zostawić poprzedni wybór niż trzymać pole w zawieszeniu.
     */
    emojis: async (
      q: string,
      candidates: {
        emoji: string;
        label: string;
        conceptId?: string;
        sampleQuery?: string;
      }[],
      limit = 6,
      signal?: AbortSignal,
    ) => {
      return this.request<{
        source: string;
        picks: {
          emoji: string;
          label: string;
          conceptId: string;
          confidence: number;
        }[];
      }>(
        "/match/emojis/",
        {
          method: "POST",
          body: JSON.stringify({ q, candidates, limit }),
          signal,
        },
        12000,
      );
    },

    /**
     * Ostatnia szansa: Jev przegląda **całą** bazę i sam decyduje, co pasuje.
     *
     * Wolno to wywołać tylko wtedy, gdy zwykłe wyszukiwanie zwróciło zero —
     * backend pyta model o każdą pozycję (115 kart + 74 dokumenty ≈ 2,5 s),
     * więc przy niepustym wyniku byłoby to palenie wywołań bez powodu.
     */
    scan: async (
      q: string,
      kind: "innovations" | "library" | "both" = "both",
      limit = 6,
      signal?: AbortSignal,
    ) => {
      return this.request<{
        source: string;
        kind: string;
        query: string;
        results: {
          kind: "innovation" | "library";
          id: string | number;
          confidence: number;
          item: any;
        }[];
      }>(
        "/match/scan/",
        {
          method: "POST",
          body: JSON.stringify({ q, kind, limit }),
          signal,
        },
        30000,
      );
    },

    /**
     * Zgłoszenie luki: problem bez rozwiązania staje się wątkiem `luka`
     * powiązanym z zapytaniem, więc koordynator ROPS widzi źródło zgłoszenia.
     */
    reportGap: async (payload: {
      query_id: number;
      title?: string;
      body?: string;
      powiat?: string;
      author?: string;
    }) => {
      return this.request<GapReport>("/match/gaps/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    gaps: async () => {
      return this.request<any[]>("/match/gaps/");
    },

    askAI: async (question: string, sources: any[] = []) => {
      return this.request<{
        source: string;
        answer: string;
        best_source?: any;
        sources: any[];
        latency_ms?: number;
      }>("/ai/ask/", {
        method: "POST",
        body: JSON.stringify({ question, sources }),
      });
    },
  };

  // --- Moduł III: Kreator i Generator Wniosków ------------------------------

  public grants = {
    list: async () => {
      return this.request<{ id: string; name: string; max_amount: number; deadline: string }[]>(
        "/grants/",
      );
    },

    generate: async (payload: {
      title?: string;
      problem?: string;
      idea?: string;
      grant_id?: string;
      amount?: number;
      powiat?: string | null;
      fiszka?: BackendFiszka;
    }) => {
      return this.request<any>("/grants/generate/", {
        method: "POST",
        body: JSON.stringify({
          title: payload.title || "",
          problem: payload.problem || payload.idea || "",
          amount: payload.amount,
          powiat: payload.powiat,
          grant_id: payload.grant_id || "iws20",
          fiszka: payload.fiszka,
        }),
      });
    },

    developIdea: async (payload: {
      problem?: string;
      idea?: string;
      fiszka?: BackendFiszka;
    }) => {
      return this.request<{
        source: string;
        istota: string;
        adresat: string;
        obszar: string;
        sugestie: string[];
        jev_decisions?: any;
      }>("/ideas/develop/", {
        method: "POST",
        body: JSON.stringify({
          problem: payload.problem || payload.idea || "",
          fiszka: payload.fiszka,
        }),
      });
    },
  };

  // --- Moduł IV: Oceny innowacji --------------------------------------------

  public ratings = {
    list: async (innovationId?: string) => {
      const q = innovationId ? `?innovation=${encodeURIComponent(innovationId)}` : "";
      return this.request<any[]>(`/ratings/${q}`);
    },

    create: async (innovationId: string, score: number, comment: string, authorName = "Tester (demo)") => {
      return this.request<any>("/ratings/", {
        method: "POST",
        body: JSON.stringify({
          innovation: innovationId,
          score,
          comment,
          author_name: authorName,
          client_id: this.getClientId(),
        }),
      });
    },
  };

  // --- Moduł VI: Panel Administratora i Trendy ------------------------------

  public analytics = {
    trends: async (days = 14) => {
      return this.request<AdminTrendsResult>(`/admin/trends/?days=${days}`);
    },

    /**
     * Popyt policzony tematami: ile razy pytano o to samo, ilu różnych ludzi
     * pytało, kiedy i czy rośnie. `scope=unmet` (domyślnie) zostawia tylko
     * tematy, na które Biblioteka nie ma odpowiedzi - to jest ta część, którą
     * da się pokazać inwestorowi jako niezagospodarowany rynek.
     */
    demand: async (days = 180, limit = 20, scope: "unmet" | "all" = "unmet") => {
      return this.request<AdminDemandResult>(
        `/admin/demand/?days=${days}&limit=${limit}&scope=${scope}`,
      );
    },

    summary: async () => {
      return this.request<{
        period: string;
        new_queries: number;
        new_threads: number;
        answered: number;
        open_gaps: number;
        text: string;
      }>("/admin/summary/");
    },

    inboxStats: async () => {
      return this.request<{
        unread: number;
        open: number;
        waiting_for_author: number;
        recent: BackendThread[];
      }>("/admin/inbox/");
    },
  };

  // --- Moduł VII: Middleman Innowacji ---------------------------------------

  public middleman = {
    options: async (payload: {
      innovation_id: string;
      org_type: string;
      size_band: string;
      budget: number;
      staff: number;
      powiat: string;
    }) => {
      return this.request<any>("/middleman/options/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  };

  // --- Moduł II: Baza innowacji i dokumentów (Zasobnik wiedzy) --------------

  public innovations = {
    list: async (params?: {
      category?: string;
      q?: string;
      has_evidence?: boolean;
      powiat?: string;
      /** pominięte = tylko Małopolska · "1" = tylko bazy zewnętrzne · "all" = komplet */
      ext?: "1" | "all";
    }) => {
      const query = new URLSearchParams();
      if (params?.category) query.set("category", params.category);
      if (params?.q) query.set("q", params.q);
      if (params?.has_evidence) query.set("has_evidence", "1");
      if (params?.powiat) query.set("powiat", params.powiat);
      if (params?.ext) query.set("ext", params.ext);
      const qs = query.toString();
      return this.request<any[]>(`/innovations/${qs ? `?${qs}` : ""}`);
    },

    get: async (id: string) => {
      return this.request<any>(`/innovations/${id}/`);
    },

    create: async (payload: {
      id?: string;
      name: string;
      category: string;
      problem: string;
      description: string;
      target: string;
      beneficiaries?: string;
      evidence?: string;
      authors?: string[];
      url?: string;
      pdf?: string;
    }) => {
      const id = payload.id || "inn-" + Math.random().toString(36).slice(2, 8);
      return this.request<any>("/innovations/", {
        method: "POST",
        body: JSON.stringify({ ...payload, id }),
      });
    },

    update: async (id: string, payload: Partial<any>) => {
      return this.request<any>(`/innovations/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },

    delete: async (id: string) => {
      return this.request<any>(`/innovations/${id}/`, { method: "DELETE" });
    },

    similar: async (id: string) => {
      return this.request<any[]>(`/innovations/${id}/similar/`);
    },

    categories: async () => {
      return this.request<{ slug: string; title: string }[]>("/categories/");
    },
  };

  public library = {
    list: async () => {
      return this.request<any[]>("/library/");
    },
  };

  public auth = {
    demoAccounts: async () => {
      return this.request<
        { username: string; role: string; label: string; organization: string; is_expert: boolean }[]
      >("/auth/demo/");
    },

    /** Hasła kont demo to `<login>123` (zob. `backend/accounts/services.py`). */
    login: async (username: string, password = `${username}123`) => {
      const res = await this.request<{ token: string; user: any }>("/auth/login/", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      if (res.ok && res.data?.token) {
        this.setToken(res.data.token);
      }
      return res;
    },

    logout: async () => {
      const res = await this.request<any>("/auth/logout/", { method: "POST" });
      this.setToken(null);
      return res;
    },

    me: async () => {
      return this.request<{ authenticated: boolean; role: string; user: any }>("/auth/me/");
    },
  };
}

export const api = new ApiClient();
