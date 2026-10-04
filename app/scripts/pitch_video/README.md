# Film pitchowy (2:30–3:00)

Generator filmu z **działającej aplikacji** — nie slajdy z nagranym ekranem.
Sceny są nagrywane Playwrightem na żywym froncie i backendzie, a narracja
(polski głos neuronowy) wyznacza rytm: każde zdanie ma własny plik audio,
zmierzoną długość i własny napis, a akcje w interfejsie są przypięte do
początków zdań. Dzięki temu obraz nie rozjedzie się z lektorem, nawet gdy
backend odpowie raz szybciej, raz wolniej.

Wynik: `docs/video/hubmi-pitch.mp4` (1920×1080, 30 fps) + `hubmi-pitch.srt`.

## Czego potrzeba

- front na `http://localhost:5173` (`npm run dev`) **i** działający backend —
  moduł I nie ma trybu offline, bez API nagrałby się ekran błędu;
- `python -m pip install edge-tts` (lektor, wymaga internetu);
- `ffmpeg` i `ffprobe` w `PATH` albo wskazane zmiennymi `FFMPEG` / `FFPROBE`
  (np. z paczek `ffmpeg-static` i `ffprobe-static`).

## Uruchomienie

```bash
cd app
export PITCH_WORK=/tmp/hubmi-pitch        # półprodukty poza repo
node scripts/pitch_video/tts.mjs          # 1. lektor + czasy scen
node scripts/pitch_video/record.mjs       # 2. nagranie scen (webm)
node scripts/pitch_video/build.mjs        # 3. montaż → docs/video/hubmi-pitch.mp4
```

Dokrywka jednej sceny (np. po poprawce w UI) bez przepisywania całości:

```bash
node scripts/pitch_video/record.mjs 07-admin && node scripts/pitch_video/build.mjs
```

`tts.mjs` nie generuje ponownie zdań, które już ma — po zmianie tekstu skasuj
odpowiednie pliki z `$PITCH_WORK/audio/`.

## Pliki

| plik | rola |
|---|---|
| `script.mjs` | scenariusz: zdania narracji i treść plansz — jedyne miejsce do edycji treści |
| `tts.mjs` | 1/3 — syntezuje zdania, mierzy je, zapisuje `timings.json` |
| `record.mjs` | 2/3 — kręci sceny (kurtyna na czas przygotowań, napisy, wskaźnik myszy) |
| `build.mjs` | 3/3 — przycina klipy do długości narracji, skleja, miksuje, pisze `.srt` |
| `lib.mjs` | ścieżki, binarki, pomiar długości |

## Zmienne środowiskowe

`PITCH_WORK` (katalog roboczy), `PITCH_URL` (domyślnie `http://localhost:5173`),
`PITCH_VOICE` / `PITCH_RATE` (głos i tempo lektora), `FFMPEG`, `FFPROBE`,
`PITCH_PYTHON`.
