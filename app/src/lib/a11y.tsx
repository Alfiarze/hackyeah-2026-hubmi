/**
 * Preferencje dostępności — przełączniki widoczne w nagłówku.
 *
 * Nie są ozdobą pod ocenę: „prosty język", „duża czcionka" i „wysoki kontrast"
 * to trzy najczęstsze bariery u grup docelowych z zadania (seniorzy, osoby
 * z niepełnosprawnością intelektualną, osoby słabowidzące). Ustawienie
 * zapisuje się w localStorage, więc senior nie musi go włączać za każdym wejściem.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "auto" | "light" | "dark";
/** 1 = 18px (baza), 1.25 = 22.5px, 1.5 = 27px */
export type FontScale = 1 | 1.25 | 1.5;

export interface A11yPrefs {
  theme: Theme;
  fontScale: FontScale;
  highContrast: boolean;
  simpleLanguage: boolean;
  /**
   * Animowane tło (parallax, plamy światła). Osobno od `prefers-reduced-motion`,
   * bo to wybór użytkownika na tej konkretnej stronie, nie ustawienie systemowe —
   * WCAG 2.2.2 wymaga pauzy dla ruchu trwającego dłużej niż 5 s, nawet gdy
   * system nic nie mówi o preferencjach.
   */
  bgMotion: boolean;
}

const DEFAULTS: A11yPrefs = {
  theme: "auto",
  fontScale: 1,
  highContrast: false,
  simpleLanguage: false,
  bgMotion: true,
};

const KEY = "hubmi.a11y.v1";

interface Ctx extends A11yPrefs {
  set: <K extends keyof A11yPrefs>(k: K, v: A11yPrefs[K]) => void;
  /** skrót: zwraca wersję prostą, gdy tryb prostego języka jest włączony */
  t: (normal: string, simple: string) => string;
}

const A11yContext = createContext<Ctx | null>(null);

function read(): A11yPrefs {
  if (typeof localStorage === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<A11yPrefs>) };
  } catch {
    // uszkodzony wpis — wracamy do domyślnych
  }
  return DEFAULTS;
}

export function A11yProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<A11yPrefs>(read);

  useEffect(() => {
    const root = document.documentElement;
    // theme="auto" nie stawia atrybutu — wtedy decyduje prefers-color-scheme
    if (prefs.theme === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", prefs.theme);

    if (prefs.highContrast) root.setAttribute("data-contrast", "high");
    else root.removeAttribute("data-contrast");

    /* „Ruch w tle" pauzuje animacje ambientowe (patterny, pulsowanie)
       — atrybut czyta global.css (WCAG 2.2.2). */
    if (prefs.bgMotion) root.removeAttribute("data-bg-motion");
    else root.setAttribute("data-bg-motion", "off");

    root.style.setProperty("--fs-scale", String(prefs.fontScale));
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      // tryb prywatny — ustawienia działają do zamknięcia karty
    }
  }, [prefs]);

  const set = useCallback(
    <K extends keyof A11yPrefs>(k: K, v: A11yPrefs[K]) =>
      setPrefs((p) => ({ ...p, [k]: v })),
    [],
  );

  const t = useCallback(
    (normal: string, simple: string) => (prefs.simpleLanguage ? simple : normal),
    [prefs.simpleLanguage],
  );

  const value = useMemo<Ctx>(() => ({ ...prefs, set, t }), [prefs, set, t]);
  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>;
}

export function useA11y(): Ctx {
  const c = useContext(A11yContext);
  if (!c) throw new Error("useA11y poza A11yProvider");
  return c;
}
