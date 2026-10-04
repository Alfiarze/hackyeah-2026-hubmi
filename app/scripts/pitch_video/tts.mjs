/**
 * Krok 1/3: lektor.
 *
 * Każde zdanie scenariusza → osobny plik WAV (edge-tts, polski głos neuronowy)
 * → zmierzona długość → `timings.json`. Z tego pliku żyje reszta pipeline'u:
 * nagranie wie, kiedy wykonać akcję, montaż wie, jak długo trzymać kadr.
 *
 *   PITCH_WORK=… FFMPEG=… FFPROBE=… node scripts/pitch_video/tts.mjs
 */
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { SCENES, VOICE, RATE, GAP, SCENE_TAIL } from "./script.mjs";
import { WORK, FFMPEG, PYTHON, dir, duration, run, fmt } from "./lib.mjs";

const out = dir("audio");

/** edge-tts bywa kapryśne po sieci - jedno zdanie, trzy podejścia. */
function speak(text, mp3) {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      run(PYTHON, [
        "-m", "edge_tts",
        "--voice", VOICE,
        "--rate", RATE,
        "--text", text,
        "--write-media", mp3,
      ]);
      return;
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

const scenes = [];
let total = 0;

for (const scene of SCENES) {
  const lines = [];
  for (const [i, text] of scene.lines.entries()) {
    const stem = `${scene.id}-${String(i + 1).padStart(2, "0")}`;
    const mp3 = join(out, `${stem}.mp3`);
    const wav = join(out, `${stem}.wav`);
    if (!existsSync(wav)) {
      speak(text, mp3);
      // Do montażu wszystko jedzie jako 48 kHz stereo - sklejanie mp3
      // o różnych paddingach potrafi zgubić kilkadziesiąt ms na zdanie.
      run(FFMPEG, ["-y", "-loglevel", "error", "-i", mp3, "-ar", "48000", "-ac", "2", wav]);
    }
    const d = duration(wav);
    lines.push({ text, wav, dur: d });
  }

  // Offsety liczone od początku sceny: zdanie i startuje po poprzednich + przerwy.
  let t = 0;
  const offsets = lines.map((l) => {
    const at = t;
    t += l.dur + GAP;
    return at;
  });
  const dur = t - GAP + SCENE_TAIL;

  scenes.push({ id: scene.id, kind: scene.kind, dur, offsets, lines });
  total += dur;
  console.log(`${scene.id.padEnd(16)} ${dur.toFixed(2)}s  (${lines.length} zd.)`);
}

writeFileSync(
  join(WORK, "timings.json"),
  JSON.stringify({ voice: VOICE, rate: RATE, total, scenes }, null, 2),
);

console.log(`\nRazem narracja: ${total.toFixed(1)}s = ${fmt(total)}`);
if (total < 150 || total > 180) {
  console.log(`UWAGA: cel to 2:30–3:00 (150–180 s). Dopasuj zdania w script.mjs.`);
}
