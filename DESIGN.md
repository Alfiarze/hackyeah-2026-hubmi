# HubMI — system wizualny v1

Ustalony raz, wyprowadzany we wszystkich widokach. Tokeny są **policzone pod
WCAG 2.1 AA** (liczby w komentarzach `app/src/styles/tokens.css`), nie dobrane
na oko. Kolory zmieniaj tam, nigdy w komponentach.

**Źródło prawdy:** „HubMI — system wizualny.html" (6 planszy: fundamenty,
ikony, patterny, mikroanimacje, karty i formularz, strona główna). Ten plik
to jego streszczenie operacyjne.

## Idea

System, który **łączy** ludzi, potrzeby i rozwiązania. Lekki, jasny i czytelny
— dla mieszkańców, NGO, samorządów, ROPS i ekspertów. **Turkus prowadzi,
krakowskie kolory pojawiają się rzadko i z intencją.** Każdy element opowiada
jedną drogę: od zgłoszonej potrzeby do wspólnie wdrożonego rozwiązania
(Potrzeba → Wiedza → Dopasowanie → Współpraca → Rozwiązanie).

Język form — cztery znaki, z których zbudowane są ikony, patterny i ilustracje:

1. **Koło** — człowiek, społeczność, potrzeba. Zawsze punkt wyjścia.
2. **Miękki kwadrat** — rozwiązanie, zasób, narzędzie. Stabilny i konkretny.
3. **Łuk** — droga, dopasowanie, przepływ wiedzy. Zawsze w turkusie.
4. **Węzeł HubMI** — pełna kropka w miejscu spotkania. Znak rozpoznawczy marki.

## Paleta

Turkus HubMI `#2BB3A5` ma kontrast tylko 2,6:1 z bielą — więc pod tekstem
i liniami ikon pracuje jego głęboka wersja, a sam turkus wypełnia przyciski
z ciemnym tekstem, węzły i tła.

| Token | Hex | Rola | Kontrast |
|---|---|---|---|
| `--turquoise` | `#2BB3A5` | CTA (tekst `#10343A`), węzły, łuki, patterny | 5,1:1 (z tekstem atramentu) |
| `--turquoise-deep` | `#16756C` | linie ikon, linki, aktywne stany | 5,5:1 ✓AA |
| `--ink` | `#10343A` | tekst, nagłówki, ramka focusu | 13,3:1 ✓AAA |
| `--ink-2` | `#4A6266` | leady, podpisy, opisy pomocnicze | 6,5:1 ✓AA |
| `--mist` | `#EAF6F4` | tła sekcji, kafle ikon, stany zaznaczenia | — |
| `--krakow-yellow` | `#FFCC00` | podkreślenie słowa, znacznik „nowe" | nigdy jako kolor tekstu |
| `--krakow-red` | `#E40521` | błędy i pola wymagane — zawsze z ikoną i tekstem | — |
| `--beige` | `#CDB794` | ciepłe akcenty ilustracji, etykiety lokalne | — |
| `--beige-light` | `#F7F2EA` | tło sekcji „lokalnych" i stopki | — |
| `--bg` | `#FFFFFF` | główne tło | — |
| `--line` | `#D5E3E0` | obramowania kart (bez cieni) | — |
| `--line-ui` | `#9AB5B0` | granica kontrolki | 3,05:1 ✓ (1.4.11) |

**Proporcja akcentów na stronie (bez bieli):** turkus ok. 80% · atrament 10% ·
beż, żółty, czerwony — razem poniżej 10%.

## Typografia

Twardy wymóg: **pełne polskie diakrytyki**. Oba kroje mają subset `latin-ext`
(ą ć ę ł ń ś ź ż); ó siedzi w subsecie podstawowym. Oba self-hosted
(`app/src/assets/fonts/`) — demo nie może zależeć od wifi na sali.

| Rola | Krój | Zastosowanie |
|---|---|---|
| Display | **Bricolage Grotesque 700–800** | nagłówki. Ludzki, lekko „ręczny" grotesk z charakterem — ciepły, ale poważny |
| Treść | **Atkinson Hyperlegible Next 400/700** | wszystko pozostałe. Krój projektowany z myślą o osobach słabowidzących: wyraźnie odróżnia I/l/1 oraz O/0 |

Skala (interlinia zawsze ≥ 1,05 dla nagłówków, 1,6 dla tekstu):

| Stopień | Wartość | Zastosowanie |
|---|---|---|
| H1 | 64 / 1.05 | nagłówek strony (hero) |
| H2 | 40 / 1.1 | sekcja |
| H3 | 24 / 1.2 | tytuł karty |
| Lead | 20 / 1.6 | wprowadzenie do sekcji |
| Body | 18 / 1.6 | tekst podstawowy — **nigdy poniżej 16 px** |
| Small | 16 / 1.5 | podpisy, opisy pól, etykiety |

Liczby zawsze `font-variant-numeric: tabular-nums`. Bez osobnego kroju
monospace — klasa `.mono` to ten sam krój z cyframi o równej szerokości.

## Ikony

Dwanaście ikon, jedna rodzina (`app/src/components/Icon.tsx`): matchmaking,
need, community, ngo, knowledge, idea, test, expert, partnership, implement,
access, local.

- siatka 32×32, pole bezpieczne 2 px, linia 2 px, końce i narożniki zaokrąglone;
- struktura w turkusie głębokim, łuk/węzeł w turkusie marki;
- warianty tła: biel (dwukolorowa) · turkus (atrament) · atrament (biel);
- min. 24 px; w kartach 40 px na kafelku 72 px z tłem mgiełki;
- **nie mieszamy** z Lucide/Material/Font Awesome; bez wypełnień, gradientów,
  cieni, 3D i emoji.

## Patterny tła

Cztery powtarzalne kafle SVG (`Backdrop` + `Pattern.tsx`), zbudowane z tych
samych znaków co ikony. Krycie 6–14%, linia 1,5 px w turkusie.

| Kafel | Gdzie |
|---|---|
| A · Sieć węzłów | hero strony głównej, nagłówki podstron, puste stany |
| B · Ścieżki | secje o matchmakingu i procesie |
| C · Kręgi społeczności | secje lokalne, dobre praktyki, partnerzy (na beżu) |
| D · Fala wiedzy | zasobnik, materiały, stopka |

Tylko pod nagłówkami, w hero i stopce — **nigdy pod długim tekstem**.
Jeden pattern na ekran. Tekst na patternie ≥ 4,5:1 względem najciemniejszego
miejsca tła (przy kryciu ≤ 16% i atramencie wynik nie spada poniżej 10:1).

## Ruch (mikroanimacje)

Ruch tylko podpowiada: co się pojawiło, co jest aktywne, co się połączyło.

| Token / klasa | Czas | Zastosowanie |
|---|---|---|
| `--hm-fast` / 300 ms | hover, focus, przełączniki |
| `--hm-base` / 600 ms | pojawianie się treści (fade-up, +120 ms fala) |
| `--hm-slow` / 1200 ms | rysowanie ikon, połączenia węzłów |
| `--hm-ease` = `cubic-bezier(.2,.7,.2,1)` | krzywa wszystkiego |
| `.hm-float` | 4 s pętla, 6 px — jedna ilustracja na ekran |
| `.hm-pulse` | 1800 ms pętla — aktywny krok procesu, zawsze z tekstem |

Animujemy wyłącznie `transform`, `opacity` i `stroke-dashoffset`.
Stan końcowy jest stanem domyślnym — po wyłączeniu ruchu nic nie znika.
`prefers-reduced-motion` i przełącznik „Ruch w tle" (WCAG 2.2.2) wyłączają
wszystko.

## Karty, formularz, przyciski

- Karty bez cieni — **tylko linia 1 px `#D5E3E0`**, promień 24 px, padding 32 px.
- Przyciski 48–52 px; główna akcja = turkus z tekstem atramentowym;
  **jedna główna akcja na ekran**.
- Fokus to **gruba ramka 3 px w kolorze atramentu** (`#10343A`), widoczna
  na każdym tle.
- Błąd: czerwona `#E40521`/`#B8001A` zawsze z ikoną i tekstem, nigdy sam kolor.
- Siła dopasowania (matchmaking): kropki + słowo, nigdy sam kolor.

## Tryby

- **Jasny (domyślny)** — system wizualny v1.
- **Ciemny** (`data-theme="dark"`) — wariant „nocny" tych samych odcieni:
  atrament zostaje tłem, turkus głęboki rozjaśnia się dla kontrastu.
- **Wysoki kontrast** (`data-contrast="high"`, osobny od motywu) — czysta
  czerń/biel + pogrubione granice na wszystkim; patterny znikają.

## Czego nie robimy

- Cienie, szkło, gradienty i „kinowe" ciemne tła — to świat startupu, nie
  narzędzia samorządu (poprzednia wersja projektu w to wpadła; zob. historia).
- Rozstrzelone wersaliki poza nadliniami znaków systemowych.
- Emoji w miejscu ikon; ikony spoza rodziny HubMI.
- Żółty/czerwony jako kolor tekstu; wideo pod tekstem.
- Obramowanie wokół każdej powierzchni — hierarchię niosą linia, powierzchnia
  i odstęp, nie ramki wszędzie.
