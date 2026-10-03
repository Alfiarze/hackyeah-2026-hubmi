/**
 * Generator wniosku grantowego (moduł III).
 *
 * Struktura odwzorowuje realny formularz aplikacyjny ROPS z naboru
 * „Inkubator Włączenia Społecznego 2.0" oraz karty oceny formalnej
 * i merytorycznej — pliki pobrane do data/raw/pdf, metadane w
 * data/resources.json → nabor_grantowy_iws20. Parametry naboru: grant do
 * 120 000 zł, bez wkładu własnego, mogą aplikować też grupy nieformalne.
 *
 * Nieoczywisty, ale najważniejszy element: sekcja o innowacyjności korzysta
 * z wyniku matchmakingu. ROPS wymaga, by rozwiązanie było NOWE w skali Polski,
 * więc lista najbliższych istniejących innowacji nie jest tu ciekawostką —
 * to materiał dowodowy, że wnioskodawca nie powtarza cudzej pracy. Ten sam
 * silnik, który szuka gotowych rozwiązań, pilnuje tu nowości.
 */
import type { Fiszka } from "./store";
import type { MatchResult } from "./match";
import { snippet } from "./text";

export interface GrantInput {
  title: string;
  fiszka: Fiszka;
  problem: string;
  powiat?: string | null;
  /** najbliższe istniejące innowacje — do sekcji o nowości */
  nearest: MatchResult[];
  /** wnioskowana kwota w zł */
  amount: number;
}

export interface GrantSection {
  no: number;
  heading: string;
  /** podpowiedź z karty oceny: na co patrzy komisja */
  criterion?: string;
  body: string;
}

export interface GrantDraft {
  title: string;
  sections: GrantSection[];
  /** braki, które komisja wyłapie na ocenie formalnej */
  warnings: string[];
  budget: { item: string; amount: number }[];
}

export const MAX_GRANT = 120_000;

const MONTHS = ["1–2", "3–4", "5–7", "8–9", "10–12"];

function budgetFor(amount: number): { item: string; amount: number }[] {
  // Proporcje zbliżone do typowego budżetu testu innowacji społecznej:
  // największą pozycją jest praca ludzi, nie zakupy.
  const split: [string, number][] = [
    ["Opracowanie i wykonanie prototypu", 0.3],
    ["Koordynacja i prowadzenie testu", 0.26],
    ["Wsparcie specjalistyczne (ekspert, superwizja)", 0.14],
    ["Praca z grupą testową (dojazdy, materiały, catering)", 0.14],
    ["Ewaluacja i opis wyników", 0.1],
    ["Upowszechnianie (opis, zdjęcia, film)", 0.06],
  ];
  const rows = split.map(([item, p]) => ({
    item,
    amount: Math.round((amount * p) / 100) * 100,
  }));
  // korekta zaokrągleń, żeby suma zgadzała się co do złotówki
  const diff = amount - rows.reduce((s, r) => s + r.amount, 0);
  rows[0].amount += diff;
  return rows;
}

export function generateGrant(input: GrantInput): GrantDraft {
  const { fiszka, problem, nearest, amount, powiat } = input;
  const title = input.title.trim() || "(uzupełnij nazwę innowacji)";
  const place = powiat ? `powiat ${powiat}` : "wskazany obszar Małopolski";

  const closest = nearest.slice(0, 3);
  const novelty = closest.length
    ? `Przegląd Biblioteki Innowacji Społecznych ROPS wskazał ${closest.length} ` +
      `najbliższych istniejących rozwiązań:\n` +
      closest
        .map(
          (r) =>
            `  • ${r.innovation.name} (${r.innovation.catName}, dopasowanie ${r.score}/100) — ` +
            `${snippet(r.innovation.desc, 140)}`,
        )
        .join("\n") +
      `\n\nRóżnica wobec nich: [UZUPEŁNIJ — to pole komisja czyta najuważniej. ` +
      `Napisz konkretnie, co Twoje rozwiązanie robi inaczej: inna grupa odbiorców, ` +
      `inny mechanizm, niższy koszt, mniejszy próg wejścia. Samo „nasze będzie lepsze" ` +
      `nie przechodzi oceny merytorycznej.]`
    : `Przegląd Biblioteki Innowacji Społecznych ROPS (115 przetestowanych ` +
      `rozwiązań) nie wykazał innowacji odpowiadającej na ten problem. ` +
      `To mocny argument za nowością rozwiązania w skali regionu — warto go ` +
      `w tej sekcji wprost powołać.`;

  const sections: GrantSection[] = [
    {
      no: 1,
      heading: "Nazwa innowacji",
      body: title,
    },
    {
      no: 2,
      heading: "Problem społeczny i jego skala",
      criterion: "Ocena merytoryczna: trafność diagnozy problemu",
      body:
        `${problem.trim() || fiszka.istota}\n\n` +
        `Obszar oddziaływania: ${place}.\n\n` +
        `[UZUPEŁNIJ danymi liczbowymi — ilu osób dotyczy problem na tym terenie. ` +
        `Źródła dostępne w Zasobniku wiedzy HubMI: „Usługi społeczne w Małopolsce ` +
        `— deficyty, potrzeby, potencjał rozwojowy" (ROPS 2025) oraz Ocena Zasobów ` +
        `Pomocy Społecznej WM. Komisja ocenia, czy skala jest udokumentowana, ` +
        `nie czy brzmi poważnie.]`,
    },
    {
      no: 3,
      heading: "Istota rozwiązania",
      criterion: "Ocena merytoryczna: jasność i wykonalność pomysłu",
      body:
        `${fiszka.istota}\n\n` +
        `Obszar: ${fiszka.obszar}. Etap zaawansowania na dziś: ${fiszka.etap}.`,
    },
    {
      no: 4,
      heading: "Grupa docelowa",
      criterion: "Ocena formalna: zgodność z grupą docelową naboru",
      body:
        `${fiszka.adresat}\n\n` +
        `Nabór kieruje wsparcie do osób wykluczonych społecznie lub zagrożonych ` +
        `wykluczeniem — m.in. osób z niepełnosprawnością, wychowanków placówek ` +
        `opiekuńczo-wychowawczych, osób starszych, w kryzysie bezdomności, ubogich. ` +
        `[SPRAWDŹ, czy Twój adresat mieści się w tym katalogu — to kryterium ` +
        `formalne, odrzucenie następuje bez oceny merytorycznej.]`,
    },
    {
      no: 5,
      heading: "Na czym polega nowość (w skali Polski)",
      criterion: "Ocena merytoryczna: innowacyjność — kryterium rozstrzygające",
      body: novelty,
    },
    {
      no: 6,
      heading: "Plan testu innowacji",
      criterion: "Ocena merytoryczna: realność planu testowania",
      body:
        `Grupa testowa: [UZUPEŁNIJ liczbę i sposób rekrutacji uczestników].\n` +
        `Czas testu: ${MONTHS.length > 0 ? "9–12 miesięcy" : ""}.\n` +
        `Miejsce: ${place}.\n` +
        `Partnerzy lokalni: [UZUPEŁNIJ — CUS/OPS, szkoła, biblioteka, NGO. ` +
        `Potwierdzony partner realnie podnosi ocenę wykonalności.]\n\n` +
        `Przed złożeniem wniosku ROPS udostępnia: konsultacje indywidualne, ` +
        `konsultacje specjalistyczne i spacery poznawcze z grupą docelową.`,
    },
    {
      no: 7,
      heading: "Jak zmierzymy, czy to działa",
      criterion: "Ocena merytoryczna: mierzalność efektu",
      body:
        `Wskaźnik główny: [UZUPEŁNIJ — jedna liczba, którą zmierzysz przed i po].\n` +
        `Sposób pomiaru: [ankieta / obserwacja / test standaryzowany / dane instytucji].\n\n` +
        `Wskazówka: każda ze 115 kart w Bibliotece ma pole „Czy to działa?" ` +
        `z opisem efektu testu. Zajrzyj do kart z Twojego obszaru i użyj ` +
        `wskaźnika porównywalnego z nimi — wtedy wynik da się zestawić z innymi ` +
        `innowacjami, a to jest warunek upowszechnienia.`,
    },
    {
      no: 8,
      heading: "Budżet",
      criterion: "Ocena formalna: kwalifikowalność i limit 120 000 zł",
      body:
        `Wnioskowana kwota: ${amount.toLocaleString("pl-PL")} zł. ` +
        `Wkład własny nie jest wymagany — grant pokrywa 100% kosztów ` +
        `opracowania, przygotowania i testowania innowacji.\n\n` +
        `Rozbicie poniżej jest propozycją startową opartą na typowych ` +
        `proporcjach testu innowacji (największa pozycja to praca ludzi, ` +
        `nie zakupy). Dopasuj do swojego rozwiązania.`,
    },
    {
      no: 9,
      heading: "Harmonogram",
      body: [
        `Miesiące ${MONTHS[0]}: dopracowanie koncepcji, konsultacje, rekrutacja grupy testowej`,
        `Miesiące ${MONTHS[1]}: wykonanie prototypu / opracowanie metody`,
        `Miesiące ${MONTHS[2]}: test z grupą docelową, bieżące poprawki`,
        `Miesiące ${MONTHS[3]}: ewaluacja, opis wyników`,
        `Miesiące ${MONTHS[4]}: upowszechnienie, przekazanie materiałów do Biblioteki ROPS`,
      ].join("\n"),
    },
    {
      no: 10,
      heading: "Trwałość i skalowanie",
      criterion: "Ocena merytoryczna: potencjał upowszechnienia",
      body:
        `Po zakończeniu grantu: [UZUPEŁNIJ — kto przejmie prowadzenie i z jakich ` +
        `środków]. Najmocniejsza odpowiedź to wskazana instytucja, która wpisze ` +
        `działanie w budżet bieżący.\n\n` +
        `Gotowość do upowszechnienia: materiały opisowe na licencji CC BY 4.0, ` +
        `przekazane do Biblioteki Innowacji Społecznych, oraz zgoda na kontakt ` +
        `z instytucjami chcącymi powtórzyć rozwiązanie u siebie.`,
    },
  ];

  const warnings: string[] = [];
  if (amount > MAX_GRANT) {
    warnings.push(
      `Kwota ${amount.toLocaleString("pl-PL")} zł przekracza maksimum naboru ` +
        `(${MAX_GRANT.toLocaleString("pl-PL")} zł) — wniosek zostanie odrzucony formalnie.`,
    );
  }
  if (!input.title.trim()) warnings.push("Brak nazwy innowacji.");
  if (!fiszka.istota.trim()) warnings.push("Brak opisu istoty rozwiązania (sekcja 3).");
  if (!fiszka.adresat.trim()) warnings.push("Brak wskazanego adresata (sekcja 4).");
  if (!problem.trim()) warnings.push("Brak opisu problemu (sekcja 2).");
  if (closest.some((r) => r.score >= 70)) {
    warnings.push(
      `Uwaga: „${closest[0].innovation.name}" dopasowuje się do Twojego opisu na ` +
        `${closest[0].score}/100. Komisja oceni nowość w skali Polski — sekcja 5 ` +
        `musi jasno pokazać różnicę, albo rozważ zgłoszenie się jako tester ` +
        `istniejącej innowacji zamiast nowego grantu.`,
    );
  }

  return { title, sections, warnings, budget: budgetFor(Math.min(amount, MAX_GRANT)) };
}
