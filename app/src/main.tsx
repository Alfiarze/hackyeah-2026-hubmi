import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Dwa kroje, self-hostowane: Sora na nagłówki (geometryczna, techniczna —
// wersaliki i duży tracking robią całą robotę), Manrope na treść (miękka,
// humanistyczna, czytelna w długim tekście) — demo na hackathonie nie może
// zależeć od wifi na sali. Oś wagi (wght) wystarcza; pliki zawierają subset
// latin-ext z zakresem U+0100-02BA, czyli ą ć ę ł ń ś ź ż, a ó siedzi
// w subsecie podstawowym. Przeglądarka pobiera tylko potrzebne zakresy.
import "@fontsource-variable/sora/wght.css";
import "@fontsource-variable/manrope/wght.css";

import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/reveal.css";

import App from "./App";
import { A11yProvider } from "./lib/a11y";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <A11yProvider>
      <App />
    </A11yProvider>
  </StrictMode>,
);
