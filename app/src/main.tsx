import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Kroje z systemu wizualnego HubMI, self-hostowane (demo nie może zależeć
// od wifi na sali): Bricolage Grotesque na nagłówki, Atkinson Hyperlegible
// Next na tekst - krój projektowany dla osób słabowidzących. Oś wght
// wystarcza; subsety latin + latin-ext pokrywają ą ć ę ł ń ś ź ż i ó.
import "./styles/fonts.css";

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
