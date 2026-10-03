# HubMI — kierunek wizualny

Ustalony raz, wyprowadzany we wszystkich widokach. Tokeny są **policzone pod
WCAG 2.1 AA**, nie dobrane na oko — ratio w tabelach i w komentarzach
`app/src/styles/tokens.css`.

**Referencja:** [motionsites.ai](https://motionsites.ai). Ważne ustalenie z oglądu
źródła, bo zmienia wszystko: **tam hero nie ma wideo w tle**. Tło to płaska
czerń `#121212`, głębię robi rozmyta poświata, a materiały filmowe siedzą
dopiero w kartach niżej. Wrażenie „drogiej strony" biorą z czego innego:

1. ogromny nagłówek wersalikami, waga 800–900, tracking ok. −0.035em;
2. jedno słowo z gradientem i poświatą;
3. pigułki — nadlinia, przyciski, filtry, wszystko zaokrąglone do 100px;
4. siatka kart o dużym promieniu (16px) na płaskim ciemnym tle;
5. bardzo dużo pustej przestrzeni wokół kompozycji wyśrodkowanej.

Dzięki temu, że tekst stoi na stałym kolorze, a nie na zmiennym kadrze,
ten kierunek **nie walczy z dostępnością** — co przy wideo pod tekstem byłoby
nieuniknione.

## Przedmiot i zadanie strony

115 innowacji społecznych przetestowanych w Małopolsce. Z danych
(`data/innovations.json`) wynika, że to mniej więcej równe trzy części: przedmioty
fizyczne (~30), rozwiązania cyfrowe (~36), metody i modele usług (~38).

Tym, co je łączy — i co odróżnia Bibliotekę ROPS od każdego innego portalu
z pomysłami — jest pole **„Czy to działa?"**: 111 ze 115 kart ma opisane wyniki
realnego testu. To jedyny prawdziwy atut tych danych i na nim stoi cały projekt.

Zadanie strony: samorząd albo mieszkanka opisuje problem własnymi słowami
i w kilka sekund dostaje rozwiązania, **które ktoś już przetestował** — z dowodem.

## Teza i element sygnaturowy

Nagłówek niesie tezę, a wyróżnione słowa to jej druga połowa:

> OPISZ PROBLEM. **POKAŻEMY, CO JUŻ ZADZIAŁAŁO.**

Gradient dostaje dokładnie ta część, która jest obietnicą produktu — nie losowy
rzeczownik dobrany pod efekt.

**Sygnatura: kino przechodzi w narzędzie.** Dopóki nikt nie opisał problemu, hero
zajmuje ekran i świeci. W chwili pojawienia się wyników kurczy się, poświata
gaśnie do 35%, nagłówek spada do rozmiaru sekcji — pierwszeństwo przejmuje
powierzchnia robocza. To jedyny zaaranżowany ruch w całej aplikacji; reszta stoi.

## Kolor

### Ciemny (domyślny)

| Token | Hex | Rola | Kontrast |
|---|---|---|---|
| `--bg` | `#0A0A0B` | tło strony | — |
| `--surface` | `#16161A` | karty, panele | — |
| `--surface-2` | `#1F1F24` | zagłębienia, chipy | — |
| `--ink` | `#FAFAF9` | tekst główny | 18.95 ✓AA |
| `--ink-2` | `#A1A1AA` | tekst drugorzędny | 7.72 ✓AA |
| `--ink-3` | `#8A8A93` | najlżejszy dopuszczalny | 5.78 ✓AA |
| `--accent` | `#E3B341` | akcent, focus, wyróżnienie | 10.17 ✓AA |
| `--ok` | `#4ADE80` | „przetestowane" | 11.36 ✓AA |
| `--err` | `#F87171` | błędy | 7.15 ✓AA |
| `--line` | `#26262C` | linia dekoracyjna | — |
| `--line-ui` | `#666670` | granica kontrolki | 3.49 ✓AA (1.4.11) |

### Jasny (wybierany ręcznie)

Nie jest odwróceniem ciemnego — to osobno dobrane kroki. Złoto musi pociemnieć
do `#8A6100` (5.31), żeby czytało się na bieli.

### Zasady

- **Obramowanie zostaje tylko na kontrolkach** (pola, przyciski), bo tam jest
  jedynym nośnikiem informacji i dlatego musi mieć 3:1. Karty, chipy i sekcje
  nie mają obramowań — hierarchię niosą powierzchnia, cień i odstęp.
- **Kolor nigdy nie jest jedynym nośnikiem** (1.4.1): status ma słowo albo znak,
  druga seria na wykresach ma kreskowanie, aktywna pozycja menu ma wypełnienie
  i wagę, nie sam kolor.
- Gdyby kiedyś doszło **wideo pod tekstem**: `--scrim` = 0.68 jest wartością
  policzoną, nie estetyczną — przy 0.65 biały tekst ma 6.04:1 nawet gdyby kadr
  był całkowicie biały. Złoty tekst wymagałby 0.75, dlatego na materiale
  kładziemy wyłącznie biel.

## Typografia

Twardy wymóg: **pełne polskie diakrytyki**. Oba kroje mają subset `latin-ext`
z zakresem `U+0100-02BA` (ą ć ę ł ń ś ź ż); ó siedzi w subsecie podstawowym.

| Rola | Krój | Zastosowanie |
|---|---|---|
| Display | **Geist Variable** | nagłówki, nazwa produktu. Techniczny, ciasny, dobrze znosi wersaliki w dużym stopniu |
| Treść | **Inter Variable** | wszystko pozostałe; projektowany pod długie czytanie w interfejsie |

Liczby zawsze `font-variant-numeric: tabular-nums` — wyniki dopasowania, kwoty
i daty stoją w kolumnach i nie mogą skakać.

**Bez osobnego kroju monospace.** Klasa `.mono` to ten sam krój z cyframi o równej
szerokości: strona nie ma drugiego alfabetu do czytania.

### Skala

Baza **18px**, nie 16px — grupa docelowa to m.in. seniorzy. Przełącznik podnosi
do 22,5 i 27px. Nagłówek hero: `clamp(2.5rem, 7.5vw, 5.5rem)`, waga 800,
tracking −0.035em, interlinia 0.95, wersaliki.

**Wersaliki wyłącznie w nagłówku hero.** Wcześniejsza wersja miała rozstrzelone
wersaliki w nadliniach, nagłówkach tabel i etykietach — to był główny powód,
dla którego czytała się jak zin, a nie jak produkt.

## Podłoga dostępności — WCAG 2.1 AA

Stan: **0 naruszeń axe-core** na 8 widokach (`npm run audit`), brak przewijania
w poziomie przy 390 / 768 / 1440 px.

- Baza 18px, zoom 200% bez utraty treści (1.4.4, 1.4.10)
- Focus 2px w kolorze akcentu z 2px odstępem; nigdzie `outline: none` bez zamiennika (2.4.7)
- Dotyk min. 44×44px (2.5.5)
- Pełna obsługa klawiaturą, w tym powiaty na mapie; skip-link (2.1.1, 2.4.3)
- `prefers-reduced-motion` wyłącza wszystkie przejścia; wideo nie jest wtedy
  nawet pobierane (2.3.3)
- Ruchome tło, gdyby doszło, ma widoczną pauzę (2.2.2)
- Gradient na słowie znika w trybie wysokiego kontrastu — litera musi być jednolita
- Mapa i wykresy mają odpowiedniki tabelaryczne (1.1.1)
- `lang="pl"` na `<html>` (3.1.1)

## Czego nie robimy

- Cream `#F4F1EA` + wysokokontrastowy serif + terakota — domyślny look AI
  (pierwsza wersja tego projektu w to wpadła; zob. historia)
- Broadsheet z hairline'ami i zerowym border-radius
- Rozstrzelone wersaliki poza nagłówkiem hero
- Obramowanie wokół każdej powierzchni
- Wideo pod tekstem bez policzonego przyciemnienia i bez pauzy
- Materiał filmowy typu „kosmos / render 3D / neon" — to świat startupu
  kryptowalutowego, nie narzędzia samorządu. Jeśli wideo kiedyś dojdzie, ma być
  z własnego świata tematu (zob. `app/src/lib/media.ts`)
