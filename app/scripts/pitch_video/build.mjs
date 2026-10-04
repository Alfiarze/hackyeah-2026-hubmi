/**
 * Krok 3/3: montaż.
 *
 * Ścieżka dźwięku powstaje z tych samych plików WAV, z których policzone
 * zostały czasy scen, więc obraz i głos nie mogą się rozjechać: klip sceny
 * jest przycinany dokładnie do długości jej narracji.
 *
 *   PITCH_WORK=… FFMPEG=… node scripts/pitch_video/build.mjs [out.mp4]
 */
import { readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENES, GAP, SCENE_TAIL } from "./script.mjs";
import { WORK, FFMPEG, dir, duration, run, fmt } from "./lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const OUT = process.argv[2] ?? join(ROOT, "docs", "video", "hubmi-pitch.mp4");
mkdirSync(dirname(OUT), { recursive: true });

const timings = JSON.parse(readFileSync(join(WORK, "timings.json"), "utf8"));
const takes = JSON.parse(readFileSync(join(WORK, "scenes.json"), "utf8"));
const take = new Map(takes.map((t) => [t.id, t]));

const mix = dir("mix");
const list = (name, files) => {
  const f = join(mix, name);
  writeFileSync(f, files.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));
  return f;
};

// ------------------------------------------------------------------ dźwięk --

/** Cisza jako plik - sklejanie przez concat jest dokładniejsze niż adelay. */
const silence = (sec, name) => {
  const f = join(mix, name);
  run(FFMPEG, [
    "-y", "-loglevel", "error",
    "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
    "-t", sec.toFixed(3), f,
  ]);
  return f;
};

const gapFile = silence(GAP, "gap.wav");
const tailFile = silence(SCENE_TAIL, "tail.wav");

const audioParts = [];
for (const scene of timings.scenes) {
  scene.lines.forEach((l, i) => {
    audioParts.push(l.wav);
    if (i < scene.lines.length - 1) audioParts.push(gapFile);
  });
  audioParts.push(tailFile);
}

const master = join(mix, "master.wav");
run(FFMPEG, [
  "-y", "-loglevel", "error",
  "-f", "concat", "-safe", "0", "-i", list("audio.txt", audioParts),
  "-c", "copy", master,
]);
const audioLen = duration(master);

// ------------------------------------------------------------------- obraz --

const clips = [];
for (const [i, scene] of SCENES.entries()) {
  const t = take.get(scene.id);
  if (!t) throw new Error(`Brak nagrania sceny ${scene.id} - uruchom record.mjs`);
  const last = i === SCENES.length - 1;
  const out = join(mix, `${scene.id}.mp4`);

  // Uwaga na oś czasu: `-ss` jako opcja wyjścia odrzuca klatki dopiero po
  // filtrach, więc `fade` liczy czas od początku surowego pliku, nie od cięcia.
  // Stąd moment ściemnienia podajemy w czasie źródła (trim + dur - 0.8).
  const vf = [
    "scale=1920:1080:flags=lanczos",
    "fps=30",
    ...(last ? [`fade=t=out:st=${(t.trim + t.dur - 0.8).toFixed(2)}:d=0.8`] : []),
  ].join(",");

  run(FFMPEG, [
    "-y", "-loglevel", "error",
    "-i", t.file,
    "-ss", t.trim.toFixed(3),
    "-t", t.dur.toFixed(3),
    "-vf", vf,
    "-an",
    "-c:v", "libx264", "-preset", "slow", "-crf", "21",
    "-pix_fmt", "yuv420p", "-g", "60",
    out,
  ]);
  clips.push(out);
  console.log(`· ${scene.id.padEnd(16)} ${duration(out).toFixed(2)}s`);
}

const silentVideo = join(mix, "video.mp4");
run(FFMPEG, [
  "-y", "-loglevel", "error",
  "-f", "concat", "-safe", "0", "-i", list("video.txt", clips),
  "-c", "copy", silentVideo,
]);

// -------------------------------------------------------------------- mux --

run(FFMPEG, [
  "-y", "-loglevel", "error",
  "-i", silentVideo,
  "-i", master,
  "-map", "0:v:0", "-map", "1:a:0",
  "-c:v", "copy",
  // -14 LUFS: film ogląda się na laptopie jurora, nie w kinie.
  "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
  "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
  "-movflags", "+faststart",
  "-metadata", "title=HubMI - Małopolski Hub Innowacji Społecznych",
  OUT,
]);

// Napisy: w scenach aplikacji są wypalone w obrazie, na planszach nie - plik
// .srt daje komplet (YouTube, odtwarzacz jurora, transkrypcja do zgłoszenia).
const srt = [];
{
  let t = 0;
  let n = 0;
  const stamp = (sec) => {
    const ms = Math.round(sec * 1000);
    const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
    const m = String(Math.floor(ms / 60000) % 60).padStart(2, "0");
    const s2 = String(Math.floor(ms / 1000) % 60).padStart(2, "0");
    return `${h}:${m}:${s2},${String(ms % 1000).padStart(3, "0")}`;
  };
  for (const scene of timings.scenes) {
    for (const [i, l] of scene.lines.entries()) {
      srt.push(`${++n}
${stamp(t)} --> ${stamp(t + l.dur)}
${l.text}
`);
      t += l.dur + (i < scene.lines.length - 1 ? GAP : SCENE_TAIL);
    }
  }
}
writeFileSync(OUT.replace(/\.mp4$/, ".srt"), srt.join("\n"), "utf8");

const len = duration(OUT);
const mb = (statSync(OUT).size / 1024 / 1024).toFixed(1);
console.log(`\n${OUT}`);
console.log(`${fmt(len)} (${len.toFixed(1)}s) · ${mb} MB · audio ${audioLen.toFixed(1)}s`);
if (len < 150 || len > 180) console.log("UWAGA: poza oknem 2:30–3:00.");
