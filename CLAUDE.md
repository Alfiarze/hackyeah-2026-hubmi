# HubMI — Małopolski Hub Innowacji Społecznych

Prototyp na HackYeah 2026, zadanie Województwa Małopolskiego / ROPS Kraków.
Treść zadania i kryteria oceny: `ZADANIE_UMWM_HubMI.md`. Dane: `data/README.md`.

## Automatyczne wczytywanie skilli — nie czekaj na slash-command

Użytkownik **nie musi** wpisywać `/`. Wczytuj te skille sam, w podanych momentach:

| Moment | Skill |
|---|---|
| Przed napisaniem lub przeprojektowaniem **jakiegokolwiek UI** (nowy widok, komponent, landing) | `frontend-design` |
| Po napisaniu UI, przed zgłoszeniem gotowości — **zawsze**, jako przegląd | `web-interface-guidelines` |
| Przed **każdym** wykresem, dashboardem, kafelkiem statystyk, sparkline (moduł II — trendy dla admina) | `dataviz` |
| Jeśli widok publikujemy jako Artifact | `artifact-design` (oraz `artifact-diagramming` dla diagramów) |

Dodatkowo zainstalowane skille Vercela (`.agents/skills`, podlinkowane do
`.claude/skills`): **`web-design-guidelines`** — większy zestaw reguł UI niż
`web-interface-guidelines`, używaj go przy przeglądzie; **`vercel-react-best-practices`**
przy pracy nad wydajnością komponentów.

Zasada: UI w tym repo nigdy nie powstaje „na wyczucie". Jeśli zabierasz się za widok
i nie wczytałeś `frontend-design` w tej sesji — wczytaj najpierw.

`web-interface-guidelines` to przegląd pod Vercel Web Interface Guidelines, **nie** audyt
WCAG. Pokrywa część wymagań AA (focus, role, kontrast, motion), ale dostępności dochodź
dodatkowo wg `DESIGN.md` → sekcja „Podłoga dostępności".

## Kierunek wizualny

Jest ustalony i zwalidowany kontrastowo — **`DESIGN.md`**. Nie wymyślaj palety ani
typografii od nowa przy kolejnych widokach; wyprowadzaj je z tokenów w `DESIGN.md`.
Jeśli widok wymaga odstępstwa, zmień `DESIGN.md` i powiedz dlaczego.

## Dlaczego to ma znaczenie dla punktów

Z kryteriów oceny (szczegóły w `ZADANIE_UMWM_HubMI.md` §7):
- **20%** — dostępność i intuicyjność (WCAG 2.1 AA, seniorzy, osoby z niepełnosprawnościami)
- **10%** — atrakcyjność, pomysłowość i jakość interfejsu (makiety UX/UI)
- **40%** — stopień spełnienia wyzwania; moduł matchmakingu jest obowiązkowy

Czyli wygląd i dostępność to 30% oceny, ale **nie przesuwaj balansu na sam wygląd** —
ładne, puste UI daje max 10%.

## Język

Produkt, UI, copy, prezentacja i zgłoszenie: **po polsku**. Kod, nazwy zmiennych,
commity: angielski. Polskie znaki diakrytyczne są wymogiem funkcjonalnym — każdy
wybrany font musi mieć pełne ą ć ę ł ń ó ś ź ż Ą Ć Ę Ł Ń Ó Ś Ź Ż.
