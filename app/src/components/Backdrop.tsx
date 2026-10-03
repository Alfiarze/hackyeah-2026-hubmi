/**
 * Tło strony — warstwa pod całą treścią, na KAŻDYM widoku.
 *
 * Co tu jest (od dołu):
 *  1. materiał filmowy z Pixabay (lib/media.ts) — zapętlony, przyciemniony
 *     policzoną wartością `--scrim`, odbarwiony; to on sprawia, że „na
 *     każdej stronie coś się dzieje w tle", nie tylko na matchmakingu;
 *  2. siatka kropek i dwa rozmyte plamy światła — plamy mają własny,
 *     wolny dryf (animacja ambient), więc warstwa żyje też bez kursora
 *     i na urządzeniu dotykowym;
 *  3. iskry unoszące się z dołu — czysto dekoracyjny ruch ciągły, który
 *     sprawia, że tło żyje także wtedy, gdy nic się nie dzieje;
 *  4. parallax za kursorem — każda warstwa podąża za myszą z innym
 *     opóźnieniem, a plamka światła rozświetla siatkę dokładnie w miejscu
 *     myszy;
 *  5. parallax przy przewijaniu (`--sy`) — warstwy jadą wolniej niż treść,
 *     więc przewijanie „przesuwa" tło zamiast zostawiać je martwe;
 *  6. rozkład plam zależy od podstrony (`data-route`) — po zmianie modułu
 *     tło przechodzi w nową konfigurację zamiast wyglądać tak samo wszędzie.
 *
 * Dostępność — cztery niezależne wyłączniki:
 *  1. `prefers-reduced-motion: reduce` — materiał w ogóle nie jest
 *     renderowany ani pobierany, zostaje płaskie tło (WCAG 2.3.3);
 *  2. tryb wysokiego kontrastu (`data-contrast="high"`) — cała warstwa
 *     znika, bo rozjaśnienia mogłyby obniżyć policzony kontrast tekstu;
 *  3. przełącznik „Ruch w tle" w pasku dostępności — zatrzymuje film
 *     (zostaje klatka plakatowa), dryf i iskry (WCAG 2.2.2: ruch trwający
 *     dłużej niż 5 s musi mieć widoczną pauzę), a także parallax
 *     reagujący na przewijanie;
 *  4. zablokowane autoodtwarzanie — zostaje plakat, strona działa.
 *
 * Sterowanie parallaxem idzie zmiennymi CSS (`--bx`, `--by` w zakresie
 * -1..1, `--px`, `--py` w 0..1 oraz `--sy` — liczba ekranów przewinięcia
 * ograniczona do ±3), więc cała reszta to deklaratywny CSS — JS
 * przelicza jedną współrzędną na klatkę.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useA11y } from "../lib/a11y";
import { HERO_MEDIA } from "../lib/media";
import "./backdrop.css";

/**
 * Iskry unoszące się z dołu. Rozpisane ręcznie, nie generowane losowo:
 * pozycje nie klastrowały się w jednym miejscu ekranu, a żadne dwie iskry
 * nie lecą w tym samym rytmie (różne czasy i ujemne opóźnienia startowe,
 * więc od pierwszej klatki są rozłożone w pionie, nie w jednej linii).
 */
const MOTES = [
  { x: 6, s: 3, d: 34, delay: -3, drift: 34 },
  { x: 17, s: 2, d: 46, delay: -19, drift: -28 },
  { x: 26, s: 4, d: 38, delay: -7, drift: 22 },
  { x: 35, s: 2, d: 52, delay: -31, drift: -40 },
  { x: 44, s: 3, d: 30, delay: -12, drift: 30 },
  { x: 53, s: 2, d: 44, delay: -25, drift: -22 },
  { x: 62, s: 4, d: 40, delay: -5, drift: 38 },
  { x: 71, s: 2, d: 48, delay: -36, drift: -34 },
  { x: 79, s: 3, d: 36, delay: -16, drift: 26 },
  { x: 87, s: 2, d: 50, delay: -28, drift: -30 },
  { x: 93, s: 3, d: 42, delay: -9, drift: 20 },
  { x: 98, s: 2, d: 56, delay: -41, drift: -24 },
];

interface Props {
  /** aktualna podstrona — z niej CSS układa plamy w innej konfiguracji */
  route?: string;
}

export function Backdrop({ route }: Props) {
  const { bgMotion } = useA11y();
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  // Bez ruchu, dopóki nie poznamy preferencji — nigdy odwrotnie, bo inaczej
  // materiał mignie przed decyzją.
  const [motionOk, setMotionOk] = useState(false);

  // Wyłączniki niezależne od przełącznika w pasku.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () =>
      setMotionOk(
        !mq.matches &&
          document.documentElement.getAttribute("data-contrast") !== "high",
      );
    decide();
    mq.addEventListener("change", decide);
    const obs = new MutationObserver(decide);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-contrast"],
    });
    return () => {
      mq.removeEventListener("change", decide);
      obs.disconnect();
    };
  }, []);

  // Pauza filmu: systemowa albo przełącznik w pasku dostępności.
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (motionOk && bgMotion) {
      el.play().catch(() => {
        // autoodtwarzanie zablokowane — zostaje plakat, nic nie alarmujemy
      });
    } else {
      el.pause();
    }
  }, [motionOk, bgMotion]);

  // Parallax + plamka pod kursorem.
  useEffect(() => {
    const el = root.current;
    if (!el || !bgMotion || !motionOk) return;

    let tx = 0, ty = 0, x = 0, y = 0;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const tick = () => {
      // Lerp co klatkę daje opóźnienie warstw — to ono robi wrażenie głębi.
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      el.style.setProperty("--bx", x.toFixed(4));
      el.style.setProperty("--by", y.toFixed(4));
      el.style.setProperty("--px", ((x + 1) / 2).toFixed(4));
      el.style.setProperty("--py", ((y + 1) / 2).toFixed(4));
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [bgMotion, motionOk]);

  /**
   * Parallax przy przewijaniu. `--sy` to liczba ekranów przewinięcia,
   * ograniczona do ±3 — bez limitu przy długiej stronie tło zjechałoby
   * poza kadr. Wartość czytana dopiero po `requestAnimationFrame`, więc
   * jeden scroll to maksymalnie jedna aktualizacja stylu.
   */
  useEffect(() => {
    const el = root.current;
    if (!el) return;

    // Bez ruchu zostaje spoczynek: zmiana nie może zależeć od tego,
    // czy użytkownik przewinął stronę po wyłączeniu animacji.
    if (!bgMotion || !motionOk) {
      el.style.setProperty("--sy", "0");
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      const sy = Math.max(-3, Math.min(3, window.scrollY / vh));
      el.style.setProperty("--sy", sy.toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      el.style.setProperty("--sy", "0");
    };
  }, [bgMotion, motionOk, route]);

  const live = bgMotion && motionOk;
  const showFilm = motionOk && Boolean(HERO_MEDIA.src);

  return (
    <>
      <div
        className={`backdrop no-print${live ? " backdrop--live" : ""}`}
        ref={root}
        data-route={route}
        aria-hidden="true"
      >
        {showFilm && (
          <div className="backdrop__film">
            <video
              ref={video}
              className="backdrop__video"
              poster={HERO_MEDIA.poster}
              muted
              loop
              playsInline
              // bez preload: na słabym łączu materiał nie może blokować
              // pierwszego renderu
              preload="none"
              tabIndex={-1}
            >
              <source src={HERO_MEDIA.src} type="video/mp4" />
            </video>
            {/* Przyciemnienie policzone, nie estetyczne — zob. --scrim
                w tokens.css (6.04:1 nawet przy całkiem białym kadrze). */}
            <div className="backdrop__scrim" />
          </div>
        )}

        <div className="backdrop__grid" />
        <div className="backdrop__glow backdrop__glow--a">
          <span className="backdrop__drift" />
        </div>
        <div className="backdrop__glow backdrop__glow--b">
          <span className="backdrop__drift" />
        </div>
        <div className="backdrop__spot" />
        <div className="backdrop__motes">
          {MOTES.map((m, i) => (
            <span
              key={i}
              className="backdrop__mote"
              style={
                {
                  "--mx": m.x,
                  "--ms": m.s,
                  "--mdur": `${m.d}s`,
                  "--mdel": `${m.delay}s`,
                  "--mdrift": m.drift,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>

      {/* Opis sceny dla czytników — materiał jest dekoracyjny, więc nie
          ogłaszamy go, ale w kodzie zostaje, gdyby kiedyś był treścią. */}
      {HERO_MEDIA.caption && (
        <p className="sr-only">Tło strony: {HERO_MEDIA.caption}.</p>
      )}
    </>
  );
}
