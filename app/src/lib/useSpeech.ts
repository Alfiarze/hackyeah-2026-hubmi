/**
 * Dyktowanie przez Web Speech API (pl-PL).
 *
 * Dla seniora i osoby z niepełnosprawnością ruchową mówienie jest szybsze
 * i mniej barierowe niż pisanie. Z drugiej strony API jest dostępne tylko
 * w części przeglądarek, więc mikrofon nie może być jedyną drogą - jest
 * dodatkiem do pola tekstowego, nigdy jego zamiennikiem (WCAG 2.1.1).
 *
 * Trzy rzeczy, które wcześniej psuły dyktowanie:
 *  1. każde kliknięcie tworzyło nową instancję rozpoznawania, a stara nadal
 *     miała podpięte handlery - jej `onend` gasił stan `listening` zaraz po
 *     starcie nowej sesji, więc mikrofon wyglądał na wyłączony, choć słuchał;
 *  2. Chrome przy `continuous = false` często kończy sesję bez wyniku
 *     finalnego - tekst pokazany jako „interim” po prostu przepadał;
 *  3. API wymaga bezpiecznego kontekstu (https albo localhost). Strona otwarta
 *     z pliku albo z adresu LAN po http kończyła się niemym błędem.
 */
import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  /** Chrome 139+: rozpoznawanie na urządzeniu, bez serwera Google. */
  processLocally?: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

/** Statyczne metody modelu lokalnego - nazwy różnią się między wersjami Chrome. */
interface SpeechRecognitionCtor {
  new (): SpeechRecognitionLike;
  available?: (opts: { langs: string[]; processLocally?: boolean }) => Promise<string>;
  availableOnDevice?: (lang: string) => Promise<string>;
  install?: (opts: { langs: string[]; processLocally?: boolean }) => Promise<boolean>;
  installOnDevice?: (lang: string) => Promise<boolean>;
}

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const LANG = "pl-PL";

/**
 * Czy Chrome ma lokalny model polskiego.
 *
 * Ma znaczenie, bo domyślna ścieżka Web Speech API w Chrome to usługa Google -
 * gdy jest nieosiągalna (Brave, Chromium bez kluczy, firewall, blokada DNS),
 * `start()` kończy się błędem `network` niezależnie od jakości internetu.
 * Model lokalny obchodzi to w całości.
 */
let localModel: "unknown" | "yes" | "no" = "unknown";

async function probeLocalModel(): Promise<boolean> {
  if (localModel !== "unknown") return localModel === "yes";
  const Ctor = getCtor();
  if (!Ctor) return false;
  try {
    let state: string | undefined;
    if (typeof Ctor.available === "function") {
      state = await Ctor.available({ langs: [LANG], processLocally: true });
    } else if (typeof Ctor.availableOnDevice === "function") {
      state = await Ctor.availableOnDevice(LANG);
    }
    if (state === "available") {
      localModel = "yes";
      return true;
    }
    // „downloadable” - prosimy o pobranie w tle; przyda się przy kolejnej próbie.
    if (state === "downloadable" || state === "downloading") {
      const install = Ctor.install
        ? Ctor.install({ langs: [LANG], processLocally: true })
        : Ctor.installOnDevice?.(LANG);
      void Promise.resolve(install).catch(() => {});
    }
  } catch {
    /* brak API albo odmowa - lecimy ścieżką sieciową */
  }
  localModel = "no";
  return false;
}

/** Dlaczego mikrofon jest niedostępny - komunikat trafia do podpowiedzi pod polem. */
function detectUnsupported(): string | null {
  if (typeof window === "undefined") return "Dyktowanie działa tylko w przeglądarce.";
  // Bezpieczny kontekst sprawdzamy pierwszy: w Chrome konstruktor istnieje także
  // na file:// i http://192.168.x.x, ale start() kończy się cichym błędem.
  if (window.isSecureContext === false) {
    return "Dyktowanie wymaga adresu https albo localhost. Otwórz stronę przez https lub wpisz tekst w pole poniżej.";
  }
  if (!getCtor()) {
    return "Ta przeglądarka nie obsługuje dyktowania (działa m.in. w Chrome i Edge). Wpisz tekst w pole poniżej.";
  }
  return null;
}

const ERRORS: Record<string, string> = {
  "not-allowed":
    "Brak zgody na dostęp do mikrofonu. Zezwól na mikrofon w pasku adresu albo wpisz tekst w pole poniżej.",
  "service-not-allowed":
    "Przeglądarka zablokowała usługę rozpoznawania mowy. Wpisz tekst w pole poniżej.",
  "audio-capture":
    "Nie znaleziono mikrofonu. Podłącz mikrofon albo wpisz tekst w pole poniżej.",
  "no-speech": "Nic nie usłyszałem. Spróbuj jeszcze raz albo wpisz tekst.",
  // Uwaga: `network` nie mówi nic o internecie użytkownika - to nieosiągalna
  // usługa rozpoznawania mowy przeglądarki. Zdarza się w Brave, Chromium bez
  // kluczy Google, za firmowym proxy albo przy blokadzie DNS.
  network:
    "Twoja przeglądarka nie może połączyć się z usługą rozpoznawania mowy (to osobna usługa, nie Twój internet). Spróbuj w Chrome lub wpisz tekst w pole poniżej.",
  "language-not-supported":
    "Ta przeglądarka nie rozpoznaje polskiego. Wpisz tekst w pole poniżej.",
};

export interface SpeechState {
  /** czy przeglądarka w ogóle to obsługuje */
  supported: boolean;
  /** komunikat dla użytkownika, gdy nie obsługuje - inaczej null */
  unsupportedReason: string | null;
  listening: boolean;
  /** tekst rozpoznany na bieżąco, jeszcze niezatwierdzony */
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
}

export function useSpeech(onResult: (text: string) => void): SpeechState {
  const [unsupportedReason] = useState(detectUnsupported);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ref = useRef<SpeechRecognitionLike | null>(null);
  /** numer sesji - zdarzenia ze starej sesji nie mogą ruszać stanu */
  const gen = useRef(0);
  /** ostatni tekst „interim”, żeby móc go zatwierdzić, gdy sesja padnie bez finału */
  const pending = useRef("");
  /** czy w tej sesji przyszedł już wynik finalny */
  const settled = useRef(false);
  /** jedno ciche ponowienie, gdy użytkownik zawahał się przed mówieniem */
  const retried = useRef(false);
  /** jedno ponowienie po błędzie `network`, już modelem lokalnym */
  const netRetried = useRef(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  /** Odpina handlery i ubija poprzednią sesję - bez tego jej `onend` gasi nową. */
  const teardown = useCallback(() => {
    const rec = ref.current;
    ref.current = null;
    if (!rec) return;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    rec.onstart = null;
    try {
      rec.abort();
    } catch {
      /* instancja mogła już zakończyć pracę */
    }
  }, []);

  const stop = useCallback(() => {
    gen.current += 1;
    const rec = ref.current;
    // Najpierw zatwierdzamy to, co już usłyszeliśmy - inaczej stop() to wyrzuci.
    const text = pending.current.trim();
    pending.current = "";
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.onstart = null;
      try {
        rec.stop();
      } catch {
        /* liczy się tylko zgaszenie stanu */
      }
      ref.current = null;
    }
    setListening(false);
    setInterim("");
    if (text && !settled.current) {
      settled.current = true;
      onResultRef.current(text);
    }
  }, []);

  // `begin` woła samo siebie przy cichym ponowieniu, więc trzyma się w refie.
  const beginRef = useRef<() => void>(() => {});

  const begin = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    teardown();
    const mine = (gen.current += 1);
    const rec = new Ctor();
    ref.current = rec;
    rec.lang = LANG;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    // Gdy Chrome ma model lokalny, idziemy nim - zero zależności od serwera.
    if (localModel === "yes") rec.processLocally = true;
    pending.current = "";
    settled.current = false;

    const isStale = () => gen.current !== mine;

    rec.onstart = () => {
      if (isStale()) return;
      setListening(true);
    };

    rec.onresult = (e: any) => {
      if (isStale()) return;
      let finalText = "";
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else partial += r[0].transcript;
      }
      retried.current = true; // coś już słyszeliśmy, więc nie ponawiamy po ciszy
      if (finalText.trim()) {
        pending.current = "";
        settled.current = true;
        setInterim("");
        onResultRef.current(finalText.trim());
      } else {
        pending.current = partial;
        setInterim(partial);
      }
    };

    rec.onerror = (e: any) => {
      if (isStale()) return;
      // Cisza na starcie: jeden cichy restart zamiast komunikatu o błędzie.
      if (e.error === "no-speech" && !retried.current) {
        retried.current = true;
        teardown();
        beginRef.current();
        return;
      }
      // Usługa sieciowa nieosiągalna: jeśli model lokalny zdążył się pobrać,
      // próbujemy raz jeszcze nim - zamiast od razu zrzucać winę na internet.
      if (e.error === "network" && !netRetried.current) {
        netRetried.current = true;
        teardown();
        localModel = "unknown";
        void probeLocalModel().then((local) => {
          if (local) beginRef.current();
          else {
            setError(ERRORS.network);
            setListening(false);
            setInterim("");
          }
        });
        return;
      }
      // `aborted` to skutek naszego stop()/teardown() - nie błąd użytkownika.
      if (e.error !== "aborted") {
        setError(
          ERRORS[e.error] ?? "Dyktowanie nie zadziałało. Wpisz tekst w pole poniżej.",
        );
      }
      teardown();
      setListening(false);
      setInterim("");
      pending.current = "";
    };

    rec.onend = () => {
      if (isStale()) return;
      // Chrome potrafi zakończyć sesję bez wyniku finalnego. Zatwierdzamy wtedy
      // to, co zdążyliśmy usłyszeć - bez tego cała wypowiedź przepadała.
      const text = pending.current.trim();
      pending.current = "";
      ref.current = null;
      setListening(false);
      setInterim("");
      if (text && !settled.current) {
        settled.current = true;
        onResultRef.current(text);
      }
    };

    try {
      rec.start();
      // `onstart` bywa opóźniony o moment zgody na mikrofon - przycisk musi
      // zareagować od razu, więc stan ustawiamy też tutaj.
      setListening(true);
    } catch {
      teardown();
      setListening(false);
      setError("Nie udało się włączyć mikrofonu. Wpisz tekst w pole poniżej.");
    }
  }, [teardown]);

  beginRef.current = begin;

  const start = useCallback(() => {
    if (unsupportedReason) {
      setError(unsupportedReason);
      return;
    }
    setError(null);
    retried.current = false;
    netRetried.current = false;
    // Sprawdzamy model lokalny raz na sesję przeglądarki, w tle - wynik
    // decyduje tylko o fladze `processLocally`, więc nie blokujemy startu.
    void probeLocalModel();

    // Pytamy o mikrofon wprost. Samo SpeechRecognition też pokazuje monit, ale
    // gdy zgoda jest w stanie „zablokowana”, kończy się niemym `not-allowed` -
    // tak dostajemy czytelny komunikat zamiast przycisku, który nic nie robi.
    const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!md?.getUserMedia) {
      begin();
      return;
    }
    md.getUserMedia({ audio: true })
      .then((stream) => {
        // Strumień służył tylko do zgody - Web Speech API otwiera własny.
        stream.getTracks().forEach((t) => t.stop());
        begin();
      })
      .catch((err: any) => {
        const name = err?.name;
        if (name === "NotAllowedError" || name === "SecurityError") {
          setError(ERRORS["not-allowed"]);
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setError(ERRORS["audio-capture"]);
        } else {
          // Mikrofon może być zajęty przez inną aplikację - rozpoznawanie
          // i tak warto spróbować uruchomić.
          begin();
        }
      });
  }, [begin, unsupportedReason]);

  useEffect(() => () => teardown(), [teardown]);

  return {
    supported: unsupportedReason === null,
    unsupportedReason,
    listening,
    interim,
    error,
    start,
    stop,
  };
}
