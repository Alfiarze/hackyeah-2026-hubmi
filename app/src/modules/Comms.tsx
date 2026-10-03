/**
 * Moduł V — Platforma aktywnej komunikacji.
 *
 * Strona użytkownika tej samej skrzynki, którą koordynator widzi w module VI.
 * Jury pyta wprost: „jak system powiadamia administratora o nowym pomyśle
 * i jak wygląda ścieżka odpowiedzi do autora" — to jest ta druga połowa
 * odpowiedzi. Kropka „nowa odpowiedź" gaśnie dopiero po otwarciu wątku.
 */
import { useEffect, useState } from "react";
import {
  markSeenByAuthor,
  reply,
  addThread,
  setRole,
  type AppState,
  type Role,
  type Thread,
} from "../lib/store";
import { api } from "../lib/api";
import "./comms.css";

const KIND_LABEL: Record<Thread["kind"], string> = {
  pomysł: "Pomysł",
  luka: "Niezaspokojona potrzeba",
  pytanie: "Pytanie",
  test: "Testowanie",
};

/** Role do przełączania przy odpowiedzi — spójne z lib/store.ts. */
const DEMO_ROLES: { v: Role; label: string; aria: string }[] = [
  { v: "mieszkaniec", label: "Mieszkaniec", aria: "Odpowiedz jako mieszkaniec lub NGO" },
  { v: "ROPS", label: "ROPS", aria: "Odpowiedz jako pracownik ROPS" },
  { v: "ekspert", label: "Ekspert", aria: "Odpowiedz jako ekspert branżowy" },
];

export function Comms({ state }: { state: AppState }) {
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [askOpen, setAskOpen] = useState(false);
  const [digest, setDigest] = useState<string | null>(null);
  const [loadingDigest, setLoadingDigest] = useState(false);

  useEffect(() => {
    setDigest(null);
  }, [open]);

  const loadDigest = async () => {
    if (!current) return;
    setLoadingDigest(true);
    try {
      const res = await api.threads.digest(current.id);
      if (res.ok && res.data?.summary) {
        setDigest(res.data.summary);
      }
    } finally {
      setLoadingDigest(false);
    }
  };

  const threads = state.threads;
  const current = threads.find((t) => t.id === open) ?? null;
  const isStaff = state.role !== "mieszkaniec";

  const openThread = (id: string) => {
    setOpen(id);
    setDraft("");
    markSeenByAuthor(id);
  };

  return (
    <div className="page wrap">
      <div className="page__head" data-reveal>
        <p className="page__mod">Moduł V · Platforma aktywnej komunikacji</p>
        <h1>Rozmowy z Hubem</h1>
        <p>
          Każde zgłoszenie — pomysł, pytanie, zgłoszona luka — zostaje wątkiem.
          Nic nie ginie w mailu i każdy widzi, na czym stoi sprawa.
        </p>
      </div>

      <div className="row cm__top" data-reveal>
        <button type="button" className="btn btn--primary" onClick={() => setAskOpen((v) => !v)}>
          {askOpen ? "Schowaj formularz" : "Zadaj pytanie ROPS"}
        </button>
        <p className="hint" style={{ margin: 0 }}>
          Mentorzy ROPS odpowiadają na pytania o innowacje, nabory i wdrożenia.
        </p>
      </div>

      {askOpen && <AskForm onSent={(id) => { setAskOpen(false); openThread(id); }} />}

      <div className="cm__grid">
        <section className="cm__list" data-reveal aria-label="Lista wątków">
          <h2 className="eyebrow">
            {threads.length} {threads.length === 1 ? "wątek" : "wątków"}
          </h2>
          <ul>
            {threads.map((t) => {
              const unseen = t.messages.length > 0 && !state.seenByAuthor.includes(t.id);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    className={`cm__item${open === t.id ? " cm__item--sel" : ""}`}
                    aria-current={open === t.id ? "true" : undefined}
                    onClick={() => openThread(t.id)}
                  >
                    <span className="cm__item-top">
                      <span className="chip">{KIND_LABEL[t.kind]}</span>
                      {unseen && (
                        <>
                          <span className="cm__dot" aria-hidden="true" />
                          <span className="sr-only">nowa odpowiedź</span>
                        </>
                      )}
                    </span>
                    <span className="cm__item-title">{t.title}</span>
                    <span className="cm__item-meta mono">
                      {new Date(t.createdAt).toLocaleDateString("pl-PL")} ·{" "}
                      {t.status}
                      {t.powiat ? ` · ${t.powiat}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="cm__thread" data-reveal aria-label="Treść wątku">
          {!current ? (
            <div className="cm__empty">
              <h3>Wybierz wątek z listy</h3>
              <p>
                Albo zadaj nowe pytanie. Jeśli chcesz zobaczyć, jak wygląda pełna
                pętla, zgłoś pomysł w module III, przełącz rolę na „pracownik ROPS",
                odpowiedz w panelu, a potem wróć tutaj.
              </p>
            </div>
          ) : (
            <>
              <header className="cm__thread-head">
                <span className="chip">{KIND_LABEL[current.kind]}</span>
                <h2>{current.title}</h2>
                <p className="mono muted">
                  {current.author} ·{" "}
                  {new Date(current.createdAt).toLocaleString("pl-PL")}
                  {current.powiat ? ` · powiat ${current.powiat}` : ""}
                </p>
              </header>

              {current.fiszka && (
                <dl className="fiszka__fields cm__fiszka">
                  <div>
                    <dt>Istota</dt>
                    <dd>{current.fiszka.istota}</dd>
                  </div>
                  <div>
                    <dt>Adresat</dt>
                    <dd>{current.fiszka.adresat}</dd>
                  </div>
                  <div>
                    <dt>Etap</dt>
                    <dd>{current.fiszka.etap}</dd>
                  </div>
                  <div>
                    <dt>Obszar</dt>
                    <dd>{current.fiszka.obszar || "—"}</dd>
                  </div>
                </dl>
              )}

              <div className="row" style={{ justifyContent: "space-between", alignItems: "center", margin: "var(--sp-3) 0" }}>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={loadDigest}
                  disabled={loadingDigest}
                >
                  {loadingDigest ? "Analizuję wątek (Jev)..." : "⚡ Diagnoza AI wątku (Jev)"}
                </button>
              </div>

              {digest && (
                <div className="card" style={{ borderColor: "var(--brand)", marginBottom: "var(--sp-4)", padding: "var(--sp-3)" }}>
                  <p className="eyebrow" style={{ color: "var(--brand)", margin: 0 }}>Model Decyzyjny Jev (Live API):</p>
                  <p style={{ margin: "var(--sp-1) 0", fontSize: "var(--fs-sm)" }}>{digest}</p>
                </div>
              )}

              <ol className="cm__msgs">
                <li className="cm__msg cm__msg--author">
                  <span className="cm__from">{current.author}</span>
                  <p>{current.body}</p>
                </li>
                {current.messages.map((m) => (
                  <li
                    key={m.id}
                    className={`cm__msg cm__msg--${m.from === "mieszkaniec" ? "author" : "staff"}`}
                  >
                    <span className="cm__from">
                      {m.author} <span className="muted">· {m.from}</span>
                    </span>
                    <p>{m.text}</p>
                    <span className="mono muted">
                      {new Date(m.at).toLocaleString("pl-PL")}
                    </span>
                  </li>
                ))}
              </ol>

              <form
                className="cm__reply"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (draft.trim().length < 3) return;
                  reply(
                    current.id,
                    draft.trim(),
                    isStaff ? (state.role as "ROPS" | "ekspert") : "mieszkaniec",
                    isStaff ? undefined : current.author,
                  );
                  setDraft("");
                }}
              >
                <span className="cm__who-label" id="cm-who">
                  Odpowiedz jako
                </span>
                <div className="row cm__who" role="group" aria-labelledby="cm-who">
                  {DEMO_ROLES.map((r) => (
                    <button
                      key={r.v}
                      type="button"
                      className="btn btn--ghost"
                      aria-pressed={state.role === r.v}
                      onClick={() => setRole(r.v)}
                    >
                      <span aria-hidden="true">{r.label}</span>
                      <span className="sr-only">{r.aria}</span>
                    </button>
                  ))}
                </div>
                <textarea
                  id="cm-reply"
                  rows={3}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    isStaff
                      ? "Odpowiedź koordynatora albo eksperta"
                      : "Dopytaj albo uzupełnij zgłoszenie"
                  }
                  aria-label={
                    isStaff
                      ? "Odpowiedź koordynatora albo eksperta"
                      : "Dopytaj albo uzupełnij zgłoszenie"
                  }
                />
                <button type="submit" className="btn btn--primary" disabled={draft.trim().length < 3}>
                  Wyślij odpowiedź
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function AskForm({ onSent }: { onSent: (id: string) => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      className="card cm__ask"
      data-reveal
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || body.trim().length < 10) {
          setErr("Podaj temat i napisz przynajmniej jedno zdanie.");
          return;
        }
        setErr(null);
        const t = addThread({ kind: "pytanie", title: title.trim(), body: body.trim() });
        onSent(t.id);
      }}
      noValidate
    >
      <div className="field">
        <label htmlFor="ask-title">Temat</label>
        <input
          id="ask-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="np. Czy grupa nieformalna może aplikować o grant?"
        />
      </div>
      <div className="field">
        <label htmlFor="ask-body">Treść pytania</label>
        <textarea id="ask-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      {err && (
        <p className="error" role="alert">
          {err}
        </p>
      )}
      <button type="submit" className="btn btn--primary" style={{ marginTop: "var(--sp-4)" }}>
        Wyślij pytanie
      </button>
    </form>
  );
}
