/**
 * Dyktowanie przez Web Speech API (pl-PL).
 *
 * Dla seniora i osoby z niepełnosprawnością ruchową mówienie jest szybsze
 * i mniej barierowe niż pisanie. Z drugiej strony API jest dostępne tylko
 * w części przeglądarek, więc mikrofon nie może być jedyną drogą — jest
 * dodatkiem do pola tekstowego, nigdy jego zamiennikiem (WCAG 2.1.1).
 */
import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
}

function getCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechState {
  /** czy przeglądarka w ogóle to obsługuje */
  supported: boolean;
  listening: boolean;
  /** tekst rozpoznany na bieżąco, jeszcze niezatwierdzony */
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
}

export function useSpeech(onResult: (text: string) => void): SpeechState {
  const [supported] = useState(() => getCtor() !== null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const stop = useCallback(() => {
    ref.current?.stop();
    setListening(false);
    setInterim("");
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("Ta przeglądarka nie obsługuje dyktowania. Wpisz tekst w pole poniżej.");
      return;
    }
    setError(null);
    const rec = new Ctor();
    ref.current = rec;
    rec.lang = "pl-PL";
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e: any) => {
      let finalText = "";
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else partial += r[0].transcript;
      }
      setInterim(partial);
      if (finalText.trim()) {
        onResultRef.current(finalText.trim());
        setInterim("");
      }
    };
    rec.onerror = (e: any) => {
      const map: Record<string, string> = {
        "not-allowed":
          "Brak zgody na dostęp do mikrofonu. Możesz wpisać tekst w pole poniżej.",
        "no-speech": "Nic nie usłyszałem. Spróbuj jeszcze raz albo wpisz tekst.",
        network: "Dyktowanie wymaga połączenia z siecią. Wpisz tekst w pole poniżej.",
      };
      setError(map[e.error] ?? "Dyktowanie nie zadziałało. Wpisz tekst w pole poniżej.");
      setListening(false);
      setInterim("");
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };

    try {
      rec.start();
      setListening(true);
    } catch {
      setError("Nie udało się włączyć mikrofonu. Wpisz tekst w pole poniżej.");
    }
  }, []);

  useEffect(() => () => ref.current?.abort(), []);

  return { supported, listening, interim, error, start, stop };
}
