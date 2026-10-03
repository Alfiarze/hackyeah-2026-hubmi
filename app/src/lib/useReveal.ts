/**
 * Pojawianie się treści przy przewijaniu (scroll reveal).
 *
 * Jak działa: elementy z `data-reveal` dostają klasę `reveal--in`, gdy
 * IntersectionObserver uzna, że są blisko ekranu. Jedna obserwatorka na całą
 * aplikację — moduły nie muszą nic wiedzieć, wystarczy atrybut na sekcji.
 *
 * Decyzje projektowe pod dostępność:
 *
 *  - Treść jest w DOM od razu i widoczna dla czytników ekranu — kryjemy ją
 *    wyłącznie wizualnie (`opacity` + `transform`), nigdy `display: none`
 *    ani `visibility`. Czytnik, Ctrl+F i `:target` działają niezależnie.
 *  - Klasa `reveal` dopiero po `documentElement.classList.add("js-reveal")`.
 *    Gdyby JS nie wystartował, treść jest po prostu widoczna — brak
 *    animacji nigdy nie może oznaczać braku treści.
 *  - `prefers-reduced-motion` i wysoki kontrast wyłączają ukrywanie
 *    completely: te grupy nie dostają animacji w żadnej formie.
 *  - Element, który dostał focus, musi być widoczny — inaczej klawiatura
 *    skacze do niewidocznego miejsca (WCAG 2.4.7). Stąd reguła
 *    `:focus-visible` odkrywająca treść natychmiast.
 */
import { useEffect } from "react";

/** Selektor wszystkiego, co ma się pojawiać przy przewijaniu. */
const TARGET = "[data-reveal]";

export function useReveal(route: string): void {
  // `route` w zależnościach: nowy widok = nowe elementy do obserwowania.
  useEffect(() => {
    const root = document.documentElement;

    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      root.getAttribute("data-contrast") === "high";

    if (reduced || !("IntersectionObserver" in window)) {
      // Bez animacji: wszystko widoczne od razu, klasy `js-reveal` nie ma,
      // więc reguły ukrywające w CSS w ogóle nie obowiązują.
      root.classList.remove("js-reveal");
      return;
    }

    root.classList.add("js-reveal");

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("reveal--in");
          // Odklejamy: element nie musi wracać do stanu ukrytego przy
          // przewijaniu w górę — to tylko migotanie.
          io.unobserve(e.target);
        }
      },
      {
        // Spuśćka: animacja zaczyna się, gdy element jest już widoczny,
        // a użytkownik dopiero do niego dojeżdża — treść nie pojawia się
        // „za późno" pod palcem.
        rootMargin: "0px 0px -8% 0px",
        // Dwa progi, nie jeden. Sam próg 0.15 nie wystarcza: siatka 115
        // fiszek jest wyższa od ekranu i nigdy nie osiągnie 15% własnego
        // obszaru — taki element czekałby na odsłonięcie w nieskończoność.
        // Próg 0 odpala obserwację w chwili, gdy krawędź w ogóle wejdzie
        // w kadr (po uwzględnieniu spuśćki), a 0.15 dogląda reszty.
        threshold: [0, 0.15],
      },
    );

    const scan = () => {
      document.querySelectorAll(TARGET).forEach((el) => {
        if (!el.classList.contains("reveal--in")) io.observe(el);
      });
    };
    scan();

    // Nowe węzły (wyniki dopasowania, karty) — doglądamy przez MutationObserver,
    // bez przepisywania modułów na efekty.
    const mo = new MutationObserver(scan);
    mo.observe(document.getElementById("main") ?? document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      mo.disconnect();
      io.disconnect();
      root.classList.remove("js-reveal");
    };
  }, [route]);
}
