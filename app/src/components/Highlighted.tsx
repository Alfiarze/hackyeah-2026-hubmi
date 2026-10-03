/**
 * Tekst karty z podświetlonymi słowami wspólnymi z zapytaniem.
 *
 * To druga połowa odpowiedzi na „dlaczego to pasuje": użytkownik nie musi
 * wierzyć wynikowi liczbowemu, bo widzi w zdaniu, które słowa się zgadzają.
 * Podświetlenie ma kolor i podkreślenie — nie polega na samym kolorze (1.4.1),
 * a <mark> daje czytnikom ekranu semantykę wyróżnienia.
 */
import type { Highlight } from "../lib/match";

interface Props {
  text: string;
  spans?: Highlight[];
  /** przycięcie długich pól — podświetlenia poza zakresem są pomijane */
  max?: number;
}

export function Highlighted({ text, spans, max }: Props) {
  const body = max && text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
  if (!spans || spans.length === 0) return <>{body}</>;

  // scalamy nachodzące/stykające się zakresy, inaczej <mark> się zagnieżdżą
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const merged: Highlight[] = [];
  for (const s of sorted) {
    if (s.start >= body.length) break;
    const end = Math.min(s.end, body.length);
    const last = merged[merged.length - 1];
    if (last && s.start <= last.end) last.end = Math.max(last.end, end);
    else merged.push({ start: s.start, end });
  }

  const out: React.ReactNode[] = [];
  let cursor = 0;
  merged.forEach((s, i) => {
    if (s.start > cursor) out.push(body.slice(cursor, s.start));
    out.push(<mark key={i}>{body.slice(s.start, s.end)}</mark>);
    cursor = s.end;
  });
  if (cursor < body.length) out.push(body.slice(cursor));
  return <>{out}</>;
}
