import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Port backendu. `HUBMI_BACKEND_PORT` wygrywa zawsze; bez niego pytamy po kolei
 * kandydatów i bierzemy pierwszego, który odpowiada na `/api/health/`.
 * Zgadywanie na sztywno kosztowało już jedno nagranie demo: front stał na
 * proxy do 8001, backend słuchał na 8000 i każde `/api/` wracało jako 500.
 */
const CANDIDATES = [8000, 8001];

async function alive(port: number): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 800);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health/`, {
      signal: ctrl.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function backendPort(): Promise<number> {
  const forced = process.env.HUBMI_BACKEND_PORT;
  if (forced) return Number(forced);

  for (const port of CANDIDATES) {
    if (await alive(port)) return port;
  }

  console.warn(
    `[hubmi] Nie znalazłem backendu na portach ${CANDIDATES.join(", ")}. ` +
      `Proxy celuje w ${CANDIDATES[0]} — uruchom backend albo ustaw HUBMI_BACKEND_PORT.`,
  );
  return CANDIDATES[0];
}

export default defineConfig(async () => {
  const port = await backendPort();
  const target = `http://127.0.0.1:${port}`;
  console.log(`[hubmi] API proxy → ${target}`);

  /** Zamiast gołego 500 z proxy mówimy wprost, czego brakuje. */
  const proxy = {
    target,
    changeOrigin: true,
    configure: (p: any) => {
      p.on("error", (err: Error, _req: any, res: any) => {
        console.error(`[hubmi] backend ${target} nie odpowiada: ${err.message}`);
        if (res?.writeHead && !res.headersSent) {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              detail: `Brak backendu pod ${target}. Uruchom go albo ustaw HUBMI_BACKEND_PORT.`,
            }),
          );
        }
      });
    },
  };

  return {
    plugins: [react()],
    base: "./",
    build: { outDir: "dist", sourcemap: false },
    server: {
      proxy: {
        "/api": proxy,
        "/health": proxy,
      },
    },
  };
});
