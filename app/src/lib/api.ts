/**
 * Klient API HubMI — połączenie frontendu React z backendem Django REST Framework.
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

export interface MatchSearchResult {
  query: string;
  analysis: {
    concepts: { id: string; label: string; score: number }[];
    unknown_terms: string[];
    top_score: number;
    has_concepts: boolean;
  };
  results: {
    innovation_id: string;
    score: number;
    tier: string;
    reasons: {
      matched_concepts: string[];
      unmatched_concepts: string[];
      top_terms: { term: string; field: string; weight: number }[];
      field_scores: Record<string, number>;
    };
  }[];
  verdicts?: {
    source: string;
    verdicts: Record<string, { related: boolean; confidence: number; reason: string }>;
  };
  is_gap: boolean;
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
    search: async (q: string, limit = 5, cat?: string, powiat?: string) => {
      return this.request<MatchSearchResult>("/match/search/", {
        method: "POST",
        body: JSON.stringify({ q, limit, cat, powiat }),
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
    list: async (params?: { category?: string; q?: string; has_evidence?: boolean; powiat?: string }) => {
      const query = new URLSearchParams();
      if (params?.category) query.set("category", params.category);
      if (params?.q) query.set("q", params.q);
      if (params?.has_evidence) query.set("has_evidence", "1");
      if (params?.powiat) query.set("powiat", params.powiat);
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

    login: async (username: string, password = "demo-password") => {
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
