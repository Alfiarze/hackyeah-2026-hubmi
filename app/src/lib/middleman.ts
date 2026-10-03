/**
 * Middleman Innowacji (moduł VII).
 *
 * Problem, który rozwiązuje: karta innowacji opisuje rozwiązanie w ogóle,
 * a wójt gminy wiejskiej do 5 tys. mieszkańców potrzebuje wiedzieć, co to
 * konkretnie znaczy u niego — ile sztuk, za ile, kto to obsłuży i co trzeba
 * zmienić, żeby się dało. Middleman przerabia innowację na opis usługi
 * dopasowany do profilu instytucji.
 *
 * Reguły są jawne i deterministyczne (mnożniki skali, typ kadry, tryb
 * wdrożenia). W wersji produkcyjnej to samo miejsce przyjmie model językowy,
 * ale wtedy nadal warto zachować te reguły jako ramę — wójt musi dostać
 * liczby, które da się obronić przed radą gminy, nie prozę.
 */
import type { Innovation } from "./data";
import { snippet } from "./text";

export type OrgType =
  | "gmina wiejska"
  | "gmina miejska"
  | "CUS / OPS"
  | "powiat (PCPR)"
  | "NGO / fundacja"
  | "DPS / placówka";

export type SizeBand = "do 5 tys." | "5–20 tys." | "20–100 tys." | "powyżej 100 tys.";

export interface OrgProfile {
  type: OrgType;
  size: SizeBand;
  /** budżet roczny na to działanie, w zł */
  budget: number;
  /** liczba osób, które mogą to prowadzić */
  staff: number;
}

export interface AdaptedService {
  title: string;
  /** 1–2 zdania: czym to jest jako usługa w tej instytucji */
  summary: string;
  scale: string;
  /** kto to prowadzi */
  staffing: string;
  costLow: number;
  costHigh: number;
  /** czy budżet profilu pokrywa dolną granicę */
  affordable: boolean;
  steps: { no: number; text: string }[];
  risks: string[];
  /** co trzeba zmienić w innowacji dla tego profilu */
  adaptations: string[];
  legal: string[];
}

/** Przybliżony koszt jednostkowy wdrożenia, po typie rozwiązania. */
function unitCost(inn: Innovation): { low: number; high: number; kind: string } {
  const t = `${inn.name} ${inn.desc}`.toLowerCase();
  if (/aplikacj|platform|portal|system|online|wirtualn|vr|ar\b|cyfrow/.test(t)) {
    return { low: 18_000, high: 60_000, kind: "cyfrowe" };
  }
  if (/szkoleni|warsztat|metod|model|procedur|standard|kurs|terapi/.test(t)) {
    return { low: 6_000, high: 24_000, kind: "metoda / usługa" };
  }
  if (/tablic|drewnian|mata|ścieżk|zestaw|pudeł|urządzeni|prototyp|mebl/.test(t)) {
    return { low: 3_000, high: 15_000, kind: "przedmiot" };
  }
  return { low: 8_000, high: 30_000, kind: "mieszane" };
}

const SIZE_MULT: Record<SizeBand, number> = {
  "do 5 tys.": 1,
  "5–20 tys.": 1.8,
  "20–100 tys.": 3.2,
  "powyżej 100 tys.": 6,
};

const SIZE_REACH: Record<SizeBand, string> = {
  "do 5 tys.": "1 punkt, 10–20 odbiorców miesięcznie",
  "5–20 tys.": "1–2 punkty, 25–50 odbiorców miesięcznie",
  "20–100 tys.": "3–4 punkty, 80–150 odbiorców miesięcznie",
  "powyżej 100 tys.": "sieć 5+ punktów, 200+ odbiorców miesięcznie",
};

const STAFFING: Record<OrgType, string> = {
  "gmina wiejska":
    "pracownik socjalny OPS w ramach obowiązków (0,25 etatu) + animator na umowę zlecenie",
  "gmina miejska": "koordynator w CUS (0,5 etatu) + 1 osoba do obsługi bieżącej",
  "CUS / OPS": "organizator usług społecznych + pracownik socjalny jako prowadzący",
  "powiat (PCPR)": "koordynator powiatowy + współpraca z gminami na porozumienie",
  "NGO / fundacja": "koordynator projektu (0,5 etatu) + wolontariusze",
  "DPS / placówka": "terapeuta zajęciowy lub opiekun, w ramach planu wsparcia",
};

/** Co trzeba zmienić w innowacji dla konkretnego profilu. */
function adaptationsFor(inn: Innovation, p: OrgProfile): string[] {
  const out: string[] = [];
  const t = `${inn.name} ${inn.desc} ${inn.problem}`.toLowerCase();

  if (p.type === "gmina wiejska") {
    out.push(
      "Rozproszona zabudowa — zamiast jednego stałego punktu zaplanuj formę " +
        "mobilną albo dyżury rotacyjne po sołectwach.",
    );
    if (/aplikacj|online|internet|smartfon|platform/.test(t)) {
      out.push(
        "Rozwiązanie zakłada sprawny internet i obsługę urządzenia. Dołóż " +
          "wariant offline oraz asystę pierwszego uruchomienia — inaczej " +
          "wykluczysz tę część odbiorców, dla której to powstało.",
      );
    }
    out.push("Dowóz uczestników bywa większym kosztem niż samo rozwiązanie — policz go osobno.");
  }
  if (p.type === "DPS / placówka") {
    out.push("Wpisz działanie w indywidualne plany wsparcia mieszkańców, nie jako osobny projekt.");
    out.push("Uzgodnij z pielęgniarką/fizjoterapeutą przeciwwskazania dla konkretnych osób.");
  }
  if (p.type === "NGO / fundacja") {
    out.push(
      "Bez zaplecza lokalowego — uzgodnij użyczenie pomieszczenia od gminy " +
        "lub biblioteki, zanim policzysz budżet.",
    );
  }
  if (p.type === "powiat (PCPR)") {
    out.push(
      "Poziom powiatu działa przez gminy — potrzebne porozumienie i wskazanie " +
        "koordynatora w każdej uczestniczącej gminie.",
    );
  }
  if (p.staff <= 1) {
    out.push(
      "Przy jednej osobie do obsługi zacznij od wersji minimalnej (jeden punkt, " +
        "jedna grupa) i zaplanuj zastępstwo na czas urlopu — inaczej usługa " +
        "zatrzyma się na pierwszym zwolnieniu.",
    );
  }
  if (p.size === "powyżej 100 tys." || p.size === "20–100 tys.") {
    out.push("Przy tej skali od razu zaplanuj listę zapisów i kryteria kwalifikacji odbiorców.");
  }
  return out;
}

function legalFor(inn: Innovation, p: OrgProfile): string[] {
  const out: string[] = [];
  const t = `${inn.name} ${inn.desc} ${inn.benef}`.toLowerCase();

  if (/dane|aplikacj|platform|rejestr|ankiet|zgłoszeni/.test(t)) {
    out.push("RODO: podstawa przetwarzania, klauzula informacyjna, retencja danych odbiorców.");
  }
  if (/lek|medyczn|pacjent|rehabilitacj|terapi|zdrowi/.test(t)) {
    out.push("Sprawdź granicę świadczenia zdrowotnego — może wymagać podmiotu leczniczego.");
  }
  if (/dzieci|młodzież|uczni|szkoł/.test(t)) {
    out.push("Standardy ochrony małoletnich (ustawa z 2023 r.) — wymagane przed startem.");
  }
  if (p.type !== "NGO / fundacja") {
    out.push("Zamówienia publiczne: przy progu poniżej 130 tys. zł wystarczy regulamin wewnętrzny.");
  }
  if (inn.license) {
    out.push(
      "Licencja innowacji to CC BY 4.0 — można wdrażać i modyfikować, " +
        "wymagane podanie autorstwa.",
    );
  }
  return out;
}

export function adapt(inn: Innovation, p: OrgProfile): AdaptedService {
  const u = unitCost(inn);
  const m = SIZE_MULT[p.size];
  const costLow = Math.round((u.low * m) / 500) * 500;
  const costHigh = Math.round((u.high * m) / 500) * 500;

  const steps = [
    { no: 1, text: `Pobierz materiały innowacji z Biblioteki ROPS i przejrzyj je z zespołem.` },
    {
      no: 2,
      text:
        p.type === "gmina wiejska" || p.type === "CUS / OPS"
          ? "Zdiagnozuj skalę potrzeby u siebie: ilu odbiorców, w których sołectwach/dzielnicach."
          : "Zdiagnozuj skalę potrzeby wśród swoich odbiorców i wskaż grupę pilotażową.",
    },
    { no: 3, text: `Wskaż osobę prowadzącą: ${STAFFING[p.type]}.` },
    {
      no: 4,
      text:
        `Uruchom pilotaż na jednej grupie (3 miesiące), budżet ok. ` +
        `${Math.round(costLow / 3 / 500) * 500} zł.`,
    },
    {
      no: 5,
      text:
        "Zmierz efekt tym samym wskaźnikiem, którego użył autor innowacji " +
        "(pole „Czy to działa?” na karcie).",
    },
    { no: 6, text: "Po pilotażu zdecyduj o skali docelowej albo o rezygnacji — i zgłoś wynik do Hubu." },
  ];

  const risks: string[] = [];
  if (p.budget > 0 && p.budget < costLow) {
    risks.push(
      `Budżet ${p.budget.toLocaleString("pl-PL")} zł nie pokrywa dolnej granicy ` +
        `(${costLow.toLocaleString("pl-PL")} zł). Realne opcje: pilotaż na jednej grupie, ` +
        `grant ROPS do 120 tys. zł, albo partnerstwo z sąsiednią gminą i podział kosztu.`,
    );
  }
  if (p.staff === 0) {
    risks.push("Brak wskazanej osoby prowadzącej — bez tego usługa nie wystartuje.");
  }
  if (!inn.evidence) {
    risks.push(
      "Ta karta nie ma opisanych wyników testu — traktuj jako pomysł do sprawdzenia, " +
        "nie jako rozwiązanie gotowe do wdrożenia.",
    );
  }
  risks.push("Po zakończeniu finansowania projektowego usługa musi mieć źródło w budżecie bieżącym.");

  return {
    title: `${inn.name} — wersja dla: ${p.type}, ${p.size} mieszkańców`,
    summary:
      `${snippet(inn.desc, 220)} W tym profilu działa jako usługa własna ` +
      `instytucji (typ: ${u.kind}), prowadzona przez ${STAFFING[p.type].split(" + ")[0]}.`,
    scale: SIZE_REACH[p.size],
    staffing: STAFFING[p.type],
    costLow,
    costHigh,
    affordable: p.budget === 0 || p.budget >= costLow,
    steps,
    risks,
    adaptations: adaptationsFor(inn, p),
    legal: legalFor(inn, p),
  };
}

export const ORG_TYPES: OrgType[] = [
  "gmina wiejska", "gmina miejska", "CUS / OPS", "powiat (PCPR)",
  "NGO / fundacja", "DPS / placówka",
];

export const SIZE_BANDS: SizeBand[] = [
  "do 5 tys.", "5–20 tys.", "20–100 tys.", "powyżej 100 tys.",
];
