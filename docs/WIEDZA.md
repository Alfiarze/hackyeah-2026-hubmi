# WIEDZA — HubMI · wnioski zespołu

> Źródło: transkrypcja spotkania zespołu (2026-10-03). Zapis decyzji i kierunków —
> pomijamy/chair-content. Uzupełniajcie ten plik po kolejnych spotkaniach.

## Decyzje i kierunki

1. **Prezentacja jest najważniejsza.** Plan demo: pokazać **fizyczny mini-komputer
   (~2 tys. zł) na żywo** — platforma na nim działa, **niskie i stałe koszty
   utrzymania**, skalowanie = dokładasz kolejną maszynę, bez dużej rozbudowy.
   To gra pod kryterium „przewidywany koszt obsługi/utrzymania" (20% za
   wdrożeniowość).
2. **Platforma musi mieć realną przydatność** — samo „komunikujemy się" nie
   wystarczy. Musimy umieć odpowiedzieć na pytanie „co tym biznesowo robimy".
3. **Matchmaking — jak ma działać (główny mechanizm):**
   - użytkownik opisuje pomysł/problem (np. „chcę zrobić firmę odbierającą
     śmieci w mieście"),
   - system rozbija opis na słowa kluczowe / embedding i szuka **podobnych
     pomysłów już istniejących** — z **prawdopodobieństwem podobieństwa**
     (np. „30%" vs „90%"),
   - pokazuje dopasowania + **sieć powiązanych pomysłów jako inspirację**
     (jeśli strict-match nic nie da),
   - przykład: „ratowanie jedzenia" ↔ „dostarczanie jedzenia seniorom" =
     podobne, można połączyć ludzi,
   - użytkownik może **skontaktować się** z autorem podobnego pomysłu
     (współpraca) albo — jeśli nic nie znajdzie — budować od zera
     i skonsultować, **dlaczego podobne pomysły nie wypaliły**.
4. **Analityka trendów dla administracji (ROPS/JST):** zbieramy kategorie
   zgłaszanych pomysłów → trendy → wskazujemy, gdzie warto skierować budżet
   albo zorganizować przetarg. (To jest moduł „agregacja potrzeb → trendy
   tylko dla admina" z opisu zadania.)
5. **Przykładowy formularz na landing — zatwierdzony.** Do dorobienia
   w `landing/` (zgłoszenie problemu/pomysłu).

## Dane — źródła do zapełnienia bazy (PRIORYTET)

Matchmaking ma sens tylko wtedy, gdy baza pomysłów jest duża i realna.
Musimy **zlokalizować przestrzeń, skąd zbieramy dane**, i zrobić to
„turbo kreatywnie" — wyjść ponad to, co daje ROPS:

1. **Dane ROPS** (już mamy dostęp): Mapa Wyzwań Społecznych, Biblioteka
   Innowacji Społecznych, przykładowe dane — to baza startowa.
2. **Posty z krakowskich grup miejskich na Facebooku** — wciągnąć kilka/kilkanaście
   postów (ludzie dzielą się inicjatywami i pomysłami) jako wstępne dane.
   Dużo większa baza, **nikt inny tego na hackathonie nie zrobi** — realna
   przewaga nad zespołami, które użyją tylko danych od ROPS.
3. **Projekty ze zeszłorocznych hackathonów** — spróbować pozyskać listę
   zgłoszonych projektów (ze strony zgłoszeń, jeśli mamy podgląd).
   Do actions: poszukać kontaktu („traczyk"), który da dostęp do zgłoszeń.
4. **Open source z GitHuba** — projekty społeczne/obywatelskie jako
   dodatkowe źródło pomysłów i rozwiązań.

**Task:** wymyślić + wdrożyć pipeline pozyskania danych (scraping/zbieranie)
— to warunek, żeby matchmaking „mrugał i działał" na demo. Bez danych
mechanizm jest pusty.

## Moduły (liczą się punkty)

- **Matchmaking społeczny — obowiązkowy** (10% oceny); **każdy kolejny moduł +5%**:
  - Zasobnik wiedzy — biblioteka wszystkiego (raporty, mapa wyzwań, innowacje),
  - Kreator pomysłów — **fiszka**: krótki opis / istota / adresat / etap realizacji,
  - Tester innowacji, komunikacja, panel admina + trendy, Middleman.

## Kryteria (szczegóły: `ZADANIE_UMWM_HubMI.md` §7)

- 40% — spełnienie wyzwania (matchmaking + moduły),
- 20% — wdrożeniowość: **skalowalność, elastyczność, niskie koszty utrzymania**
  (→ demo na mini-PC),
- 20% — dostępność: WCAG 2.1 AA, **interfejs dla każdego wieku**,
- 10% — wygląd/pomysłowość UX-UI,
- 10% — jakość materiałów (prezentacja).

## Terminy

- **Do piątku (9.10): coś działającego** — „gra ma działać" — kończymy rzeczy,
  nie zaczynamy 10. (do ustalenia: co dokładnie prezentujemy w piątek).

## Workflow — lekcja z zeszłego hackathona

- **Najpierw spec w markdown (co robimy i po co), potem kod.** Nie rozkazujemy
  AI „zrób mi to z jednego zdania" — 2 godziny przemyślenia przed kodowaniem
  oszczędza błądzenie.
- Rok temu: **problem z oddawaniem zadań**, finalnie 3. miejsce. Tym razem
  **submitujemy z zapasem**.
