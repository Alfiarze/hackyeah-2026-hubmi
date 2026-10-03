/**
 * Matchmaking jako rozmowa, nie formularz.
 *
 * Dlaczego: w formularzu trzeba wiedzieć, w którą rubrykę wpisać swój problem.
 * Senior albo pracownik gminy tego nie wie - i to jest pierwsza bariera, na
 * której portale się wysypują. Tu wystarczy powiedzieć, co się dzieje.
 *
 * Asystent dopytuje najwyżej dwa razy i tylko o to, czego naprawdę brakuje
 * do dopasowania: kogo dotyczy problem i gdzie. Każde pytanie ma gotowe
 * odpowiedzi do kliknięcia - senior nie musi pisać ani mówić drugi raz.
 *
 * To deterministyczna maszyna stanów, nie model językowy: w demo nie ma
 * ryzyka halucynacji ani zależności od sieci, a ścieżkę da się powtórzyć
 * przed jury dokładnie tak samo.
 */
import { analyzeQuery, type QueryAnalysis } from "./match";
import { POWIATY } from "./data";
import { foldDiacritics } from "./text";

/** Wątki, które mówią KOGO dotyczy problem. */
const AUDIENCE_CONCEPTS = new Set([
  "senior", "dzieci", "rodzina", "intelekt", "autyzm", "wzrok", "sluch",
  "ruch", "cudzoziemcy", "bezdomnosc", "opieka",
]);

export type Turn =
  | { role: "assistant"; text: string; chips?: Chip[]; id: string }
  | { role: "user"; text: string; id: string };

export interface Chip {
  label: string;
  /** co dopisać do opisu problemu po kliknięciu */
  value: string;
}

export type Slot = "who" | "where";

export interface ConvState {
  turns: Turn[];
  /** pełny opis problemu, narastający z kolejnych wypowiedzi */
  problem: string;
  powiat: string | null;
  /** o co już pytaliśmy - nie pytamy dwa razy o to samo */
  asked: Slot[];
  done: boolean;
}

const WHO_CHIPS: Chip[] = [
  { label: "Osoba starsza", value: "osoba starsza, senior" },
  { label: "Dziecko lub młodzież", value: "dziecko, młodzież" },
  { label: "Osoba z niepełnosprawnością", value: "osoba z niepełnosprawnością" },
  { label: "Opiekun rodzinny", value: "opiekun rodzinny, opieka w domu" },
  { label: "Cała społeczność", value: "mieszkańcy gminy, społeczność lokalna" },
];

let seq = 0;
const nid = () => `t${++seq}`;

export const OPENING =
  "Opisz problem lub wyzwanie w swojej okolicy. " +
  "Wystarczą 1-2 zdania zwykłym, codziennym językiem.";

export function initConversation(): ConvState {
  return {
    turns: [{ role: "assistant", text: OPENING, id: nid() }],
    problem: "",
    powiat: null,
    asked: [],
    done: false,
  };
}

/** Szuka w wypowiedzi nazwy powiatu (odmiany też - porównujemy rdzenie). */
export function detectPowiat(text: string): string | null {
  const t = foldDiacritics(text.toLowerCase());
  for (const p of POWIATY) {
    const f = foldDiacritics(p.toLowerCase());
    // „nowosadecki" → rdzeń „nowosadeck"; łapie też „w nowosądeckim"
    const root = f.replace(/(ski|cki|dzki)$/, "");
    if (t.includes(f) || (root.length >= 5 && t.includes(root))) return p;
  }
  return null;
}

function hasAudience(a: QueryAnalysis): boolean {
  return a.concepts.some((c) => AUDIENCE_CONCEPTS.has(c.id));
}

/** Którego slotu brakuje, żeby dopasowanie miało sens. */
function missingSlot(st: ConvState): Slot | null {
  const a = analyzeQuery(st.problem);
  if (!hasAudience(a) && !st.asked.includes("who")) return "who";
  // O miejsce pytamy tylko wtedy, gdy mamy już o co zaczepić temat -
  // inaczej pierwsze pytanie brzmiałoby jak formularz meldunkowy.
  if (!st.powiat && !st.asked.includes("where") && a.concepts.length > 0) {
    return "where";
  }
  return null;
}

function ask(slot: Slot): Turn {
  if (slot === "who") {
    return {
      role: "assistant",
      id: nid(),
      text: "Kogo ten problem dotyczy w pierwszej kolejności?",
      chips: WHO_CHIPS,
    };
  }
  return {
    role: "assistant",
    id: nid(),
    text:
      "W jakiej gminie lub powiecie występuje ten problem? " +
      "Pozwoli to sprawdzić lokalne wdrożenia i kontakt do realizatorów.",
    chips: [
      { label: "Pomiń lokalizację", value: "" },
      ...POWIATY.slice(0, 6).map((p) => ({ label: p, value: p })),
    ],
  };
}

/**
 * Przyjmuje wypowiedź użytkownika i zwraca nowy stan rozmowy.
 * Gdy `done === true`, można odpytać silnik dopasowania polem `problem`.
 */
export function advance(st: ConvState, input: string): ConvState {
  const text = input.trim();
  const turns: Turn[] = [...st.turns];
  if (text) turns.push({ role: "user", text, id: nid() });

  const powiat = detectPowiat(text) ?? st.powiat;
  // Nazwa powiatu nie jest opisem problemu - nie zaśmiecamy nią zapytania.
  const isOnlyPlace = !!detectPowiat(text) && text.split(/\s+/).length <= 3;
  const problem = isOnlyPlace || !text ? st.problem : `${st.problem} ${text}`.trim();

  const asked = st.asked.includes("where") || detectPowiat(text) ? st.asked : st.asked;
  const next: ConvState = { ...st, turns, problem, powiat, asked };

  // Nic sensownego nie wpisano - prosimy o jedno zdanie więcej.
  if (!problem) {
    turns.push({
      role: "assistant",
      id: nid(),
      text: "Dopisz jeszcze jedno zdanie: co konkretnie stanowi barierę lub problem?",
    });
    return next;
  }

  const slot = missingSlot(next);
  if (slot) {
    turns.push(ask(slot));
    return { ...next, asked: [...next.asked, slot], done: false };
  }

  const a = analyzeQuery(problem);
  turns.push({
    role: "assistant",
    id: nid(),
    text: a.concepts.length
      ? `Rozpoznane obszary: ${a.concepts
          .map((c) => c.label)
          .join(", ")}. Porównuję zgłoszenie z bazą przetestowanych innowacji.`
      : "Przeszukuję bazę innowacji pod kątem tego opisu.",
  });
  return { ...next, done: true };
}

/** Kliknięcie w gotową odpowiedź - tak samo jak wpisanie jej z klawiatury. */
export function applyChip(st: ConvState, chip: Chip): ConvState {
  if (!chip.value) {
    // „Nie chcę podawać" - zamykamy slot bez wartości
    return advance({ ...st, asked: [...st.asked, "where"] }, "");
  }
  return advance(st, chip.value);
}
