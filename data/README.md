# Dataset HubMI — zasoby ROPS Kraków

Dane pobrane ze stron publicznych **Regionalnego Ośrodka Polityki Społecznej w Krakowie**
(`rops.krakow.pl`) na potrzeby prototypu HubMI (HackYeah 2026, zadanie UMWM).

Pobrane: 2026-10-03. Skrypty w `../scripts/` są idempotentne (cache HTML + plików),
więc ponowne uruchomienie tylko dociąga brakujące rzeczy.

```bash
python scripts/scrape_rops.py        # Biblioteka Innowacji Społecznych -> data/innovations.json
python scripts/scrape_resources.py   # raporty, publikacje, nabór grantowy -> data/resources.json
python scripts/download_assets.py    # karty PDF + okładki innowacji -> data/assets_manifest.json
```

## Co jest w repo (wersjonowane)

| Plik | Zawartość |
|---|---|
| `innovations.json` | **115 innowacji społecznych** w 9 kategoriach — pełne karty |
| `resources.json` | metadane + opisy **76 dokumentów** (raporty, diagnozy, publikacje, wzory wniosków) |
| `assets_manifest.json` | mapa załączników innowacji (PDF, okładki, ZIP-y, filmy YouTube) |

`raw/` (≈330 MB pobranych plików) jest w `.gitignore` — odtwarzalne skryptami.

## 1. `innovations.json` — baza do matchmakingu

Serce modułu obowiązkowego. Każda innowacja ma ustrukturyzowane pola wprost
odpowiadające logice matchmakingu problem → rozwiązanie:

| Pole | Pokrycie | Opis |
|---|---|---|
| `name`, `slug`, `category_slug`, `url` | 115/115 | identyfikacja |
| `problem` | 115/115 | **jakich problemów dotyczy innowacja** ← strona „problem" w dopasowaniu |
| `description` | 114/115 | na czym polega rozwiązanie |
| `target_group` | 114/115 | grupa docelowa |
| `beneficiaries` | 115/115 | kto może skorzystać (JST, NGO, placówki…) |
| `evidence` | 111/115 | **czy to działa** — wyniki testu innowacji |
| `authors` | 115/115 | autorzy (dane jawnie publikowane przez ROPS) |
| `badges` | — | np. „innowacja wybrana do upowszechniania w ramach IWS" |
| `sections` | 115/115 | surowe sekcje karty `{no, question, answer}` |
| `raw_text` | 115/115 | pełny tekst karty — gotowy do embeddingów |
| `links` | — | `pdf` (33), `video` (26), `materials_zip` (115), `license` |
| `media.cover` | 115/115 | okładka/zdjęcie innowacji |

### Kategorie

| Kategoria | slug | Liczba |
|---|---|---|
| Dla seniorów | `dla-seniorow` | 20 |
| Dla dzieci, młodzieży i rodziny | `dla-dzieci-mlodziezy-i-rodziny` | 21 |
| Dla osób o ograniczonej mobilności | `dla-osob-o-ograniczonej-mobilnosci` | 18 |
| Dla osób z niepełnosprawnością sensoryczną | `dla-osob-z-niepelnosprawnoscia-sensoryczna` | 20 |
| Dla osób z niepełnosprawnością intelektualną | `dla-osob-z-niepelnosprawnoscia-intelektualna` | 14 |
| Dla zdrowia i medycyny | `dla-zdrowia-i-medycyny` | 9 |
| Dla cudzoziemców | `dla-cudzoziemcow` | 6 |
| Dla rynku pracy | `dla-rynku-pracy` | 5 |
| Dla osób w kryzysie bezdomności | `dla-osob-w-kryzysie-bezdomnosci` | 2 |

## 2. `resources.json` — Zasobnik wiedzy

| Sekcja | Pozycje | Co tam jest |
|---|---|---|
| `raporty_z_badan` | 51 | raporty i diagnozy ROPS 2010–2026, każdy z obszernym abstraktem. Kluczowe: *Usługi społeczne w Małopolsce — deficyty, potrzeby, potencjał rozwojowy* (2025 i 2023), *Wyzwania i potrzeby sektora opiekuńczego* (2026), *Domy pomocy społecznej wobec deinstytucjonalizacji* (2025), *Piecza zastępcza w Małopolsce* (2024) |
| `nabor_grantowy_iws20` | 16 | **Mapa Wyzwań Społecznych** (zał. 2 do naboru IWS 2.0, 7,8 MB) + wzór formularza aplikacyjnego, karty oceny formalnej/merytorycznej/prezentacji, procedury, oświadczenia |
| `publikacje_innowacje` | 6 | **SOCIAL CANVAS** (Canwa Innowacji Społecznych, 7,7 MB), *Połącz kropki*, *Innowacje społeczne dla dostępności*, *Przewodnik po innowacjach społecznych* (PL + EN) |
| `ocena_zasobow` | 3 | Ocena Zasobów Pomocy Społecznej WM 2025 + alternatywy tekstowe (wersje dostępne) |
| `innowacje_w_modelach` | 0 | strona bez plików — 9 innowacji wdrożonych w Małopolskich Modelach Usług Społecznych (lista w `page_text`) |

Każda pozycja: `title`, `year`, `url`, `type`, `description`, `local_path`, `bytes`.

### Mapowanie na moduły zadania

- **Matchmaking (obowiązkowy)** → `innovations.json`: `problem` + `raw_text` do embeddingów, `beneficiaries` jako filtr dla JST
- **Zasobnik wiedzy** → `resources.json`: raporty, Mapa Wyzwań, Biblioteka (filmy: 26 linków YouTube)
- **Kreator pomysłów / generator wniosków** → `nabor_grantowy_iws20`: wzór formularza + karty oceny = kryteria, pod które AI ma pisać wniosek; `SOCIAL CANVAS` jako materiał prototypingowy

## 3. `assets_manifest.json` — załączniki

Pobrane: **52 MB** (33 karty PDF innowacji + 115 okładek) → `raw/assets/`.

**Nie pobrane: paczki ZIP z materiałami — 82,3 GB łącznie** (mediana 27 MB, ale
pojedyncze pozycje do 28 GB: filmy, assety VR/AR). URL-e i dokładne rozmiary są
w manifeście; można dociągnąć wybrane:

```bash
python scripts/download_assets.py --zips bawita sciezka-treningu-umyslu
```

Filmy z YouTube (26 szt.) zostają jako linki — do embedowania w UI.

## Licencje i ograniczenia

- Karty innowacji: w większości **CC BY 4.0** (pole `links.license`) — wymagane podanie źródła
- Raporty ROPS: część oznaczona CC BY 4.0, reszta — materiały publiczne instytucji publicznej
- Zadanie zabrania używania **prawdziwych danych osobowych i danych wrażliwych** z materiałów
  ROPS. Pola `authors` zawierają wyłącznie nazwiska autorów innowacji **jawnie publikowane**
  przez ROPS w Bibliotece; demo/seed MVP nie powinno zawierać żadnych innych danych osób.
- Strona Biblioteki ma banner: *„STRONA JEST W PRZEBUDOWIE. NIEKTÓRE LINKI POZOSTAJĄ
  NIEAKTYWNE"* — część linków może przestać działać; dlatego trzymamy lokalne kopie.

## Źródła

- https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych/kategorie
- https://rops.krakow.pl/badania-analizy-raporty/raporty-z-badan
- https://rops.krakow.pl/innowacje-spoleczne/publikacje-ze-swiata-innowacji
- https://rops.krakow.pl/innowacje-spoleczne/innowacje-w-malopolskich-modelach
- https://rops.krakow.pl/mpliki/IS/IWS_20/za._nr_2._Mapa_Wyzwa_Spoecznych.pdf
- https://obserwator.rops.krakow.pl — Internetowy Obserwator Statystyk Społecznych (wskaźniki, nie pobrane)
