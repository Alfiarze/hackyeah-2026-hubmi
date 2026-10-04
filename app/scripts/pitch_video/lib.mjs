/** Wspólne drobiazgi pipeline'u wideo: ścieżki, binarki, uruchamianie. */
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Katalog roboczy na półprodukty (audio, surowe webm, klipy). Poza repo. */
export const WORK = process.env.PITCH_WORK ?? join(tmpdir(), "hubmi-pitch");

/** Binarki. Statyczne buildy podstawia się przez env (npm i ffmpeg-static). */
export const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
export const FFPROBE = process.env.FFPROBE ?? "ffprobe";
export const PYTHON = process.env.PITCH_PYTHON ?? "python";

export function dir(...parts) {
  const p = join(WORK, ...parts);
  mkdirSync(p, { recursive: true });
  return p;
}

/** Uruchamia proces i wywraca się z czytelnym błędem - cichy błąd ffmpeg
 *  w środku 10-scenowego montażu kosztuje więcej niż głośny stos. */
export function run(bin, args, { quiet = true } = {}) {
  const r = spawnSync(bin, args, {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.error) throw new Error(`${bin}: ${r.error.message}`);
  if (r.status !== 0) {
    const tail = (r.stderr || r.stdout || "").split("\n").slice(-20).join("\n");
    throw new Error(`${bin} ${args.slice(0, 4).join(" ")}… → ${r.status}\n${tail}`);
  }
  if (!quiet && r.stderr) process.stderr.write(r.stderr);
  return r.stdout ?? "";
}

/** Długość pliku audio/wideo w sekundach. */
export function duration(file) {
  const out = run(FFPROBE, [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=nw=1:nk=1",
    file,
  ]);
  const v = Number.parseFloat(out.trim());
  if (!Number.isFinite(v)) throw new Error(`Nie umiem zmierzyć ${file}`);
  return v;
}

export const fmt = (s) =>
  `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
