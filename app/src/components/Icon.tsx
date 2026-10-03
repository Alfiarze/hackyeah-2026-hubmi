/**
 * Ikony systemu HubMI - dwanaście znaków, jedna rodzina.
 *
 * Siatka 32×32, linia 2 px, zaokrąglone końce i narożniki. Struktura
 * w turkusie głębokim (--icon-stroke), a łuk lub węzeł HubMI w turkusie
 * marki (--icon-node) - to on mówi „tu coś się łączy".
 *
 * Zasady (strona 02 systemu wizualnego):
 *  - ikona zawsze idzie w parze z podpisem; dekoracyjna dostaje aria-hidden;
 *  - jedna ikona = jedno znaczenie w całym serwisie;
 *  - min. 24 px; w kartach 40 px na kafelku 72 px z tłem mgiełki;
 *  - węzeł HubMI tylko raz na ikonę.
 *  - warianty tła: na kolorowym kafelku ikona staje się jednokolorowa.
 */
import type { SVGProps } from "react";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  size?: number | string;
}

function Svg({ size = 24, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="var(--icon-stroke, #16756c)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    />
  );
}

const node = { stroke: "var(--icon-node, #2bb3a5)" } as const;
const nodeDot = { fill: "var(--icon-node, #2bb3a5)", stroke: "none" } as const;

/** Moduł I - matchmaking społeczny. */
export const IconMatchmaking = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8.5" cy="21" r="4.5" />
    <rect x="19" y="16.5" width="9" height="9" rx="2.5" />
    <path d="M8.5 16.5C8.5 9 23.5 9 23.5 16.5" {...node} />
    <circle cx="16" cy="10.9" r="2.6" {...nodeDot} />
  </Svg>
);

/** Zgłoś potrzebę - dymek z plusem, główna akcja platformy. */
export const IconNeed = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 6.5h18a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H14l-5 4.5v-4.5H7a3 3 0 0 1-3-3v-10a3 3 0 0 1 3-3Z" />
    <path d="M16 10.5v8M12 14.5h8" {...node} />
  </Svg>
);

/** Społeczność - trzy osoby z turkusowymi niciami relacji. */
export const IconCommunity = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="16" cy="9" r="3.5" />
    <circle cx="6.5" cy="14" r="2.75" />
    <circle cx="25.5" cy="14" r="2.75" />
    <path d="M10 25.5a6 6 0 0 1 12 0" />
    <path d="M2.5 25a4.5 4.5 0 0 1 6.2-4.1" />
    <path d="M29.5 25a4.5 4.5 0 0 0-6.2-4.1" />
    <path d="M9 12.6l3.8-1.9M23 12.6l-3.8-1.9" {...node} />
  </Svg>
);

/** Organizacja / NGO - wspólny dach nad połączonymi węzłami. */
export const IconNgo = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 14 16 5l12 9" />
    <path d="M7.5 12v14.5h17V12" />
    <path d="M11.5 20.5h9" {...node} />
    <circle cx="11.5" cy="20.5" r="2" {...nodeDot} />
    <circle cx="16" cy="20.5" r="2" {...nodeDot} />
    <circle cx="20.5" cy="20.5" r="2" {...nodeDot} />
  </Svg>
);

/** Moduł II - zasobnik wiedzy: otwarta książka z turkusowym grzbietem. */
export const IconKnowledge = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16 9.5C13 7.5 8.5 7 4 7.5v16c4.5-.5 9 0 12 2 3-2 7.5-2.5 12-2v-16c-4.5-.5-9 0-12 2Z" />
    <path d="M16 9.5v16" {...node} />
    <circle cx="16" cy="4.2" r="2" {...nodeDot} />
  </Svg>
);

/** Moduł III - kreator pomysłów: ołówek rysujący drogę do węzła. */
export const IconIdea = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 4.5l6.5 6.5L13.5 23H7v-6.5Z" />
    <path d="M16 7.5l6.5 6.5" />
    <path d="M6 28c4 0 5.5-2.5 9.5-2.5S20.5 28 23.5 28" {...node} />
    <circle cx="26.5" cy="27.8" r="2.2" {...nodeDot} />
  </Svg>
);

/** Moduł IV - tester innowacji: rozwiązanie z potwierdzeniem i testem. */
export const IconTest = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="7" width="20" height="20" rx="5" />
    <path d="M10.5 17l3.5 3.5 6.5-7" {...node} />
    <circle cx="25.5" cy="6.5" r="2.6" {...nodeDot} />
  </Svg>
);

/** Moduł V - komunikacja: osoba i dymek rozmowy. */
export const IconExpert = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10" cy="13.5" r="4" />
    <path d="M3 27a7 7 0 0 1 14 0" />
    <path d="M17 4.5h9a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-2.5 2.5h-4.5L18.5 17v-2.5H17a2.5 2.5 0 0 1-2.5-2.5V7A2.5 2.5 0 0 1 17 4.5Z" />
    <path d="M18.5 9.5h.01M21.5 9.5h.01M24.5 9.5h.01" {...node} strokeWidth={2.6} />
  </Svg>
);

/** Panel ROPS / partnerstwo - dwa kręgi z węzłami spotkania. */
export const IconPartnership = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="16" r="7.5" />
    <circle cx="20" cy="16" r="7.5" {...node} />
    <circle cx="16" cy="9.7" r="2" {...nodeDot} />
    <circle cx="16" cy="22.3" r="2" {...nodeDot} />
  </Svg>
);

/** Wdrożenie - kropkowana ścieżka od startu do flagi celu. */
export const IconImplement = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 27V5" />
    <path d="M21 5.5h7l-2 3.5 2 3.5h-7" />
    <path d="M5.5 26.5c0-5 4-6.5 7.5-6.5s8-1.5 8-5" {...node} strokeDasharray="0 4" />
    <circle cx="5.5" cy="26.5" r="2.6" {...nodeDot} />
  </Svg>
);

/** Dostępność - uniwersalna postać, głowa to węzeł HubMI. */
export const IconAccess = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="16" cy="16" r="12.5" />
    <circle cx="16" cy="9.5" r="2.2" {...nodeDot} />
    <path d="M10 13.5l6 1.2 6-1.2M16 14.7V19l-3 5M16 19l3 5" />
  </Svg>
);

/** Gmina / lokalnie - pinezka z domem. */
export const IconLocal = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16 28.5s-9-8.2-9-15a9 9 0 0 1 18 0c0 6.8-9 15-9 15Z" />
    <path d="M12 15.5 16 12l4 3.5V19h-8Z" {...node} />
  </Svg>
);

/** Znak HubMI - węzeł: koło + łuk + pełna kropka. Używany w logo i markerach. */
export function HubmiMark({ size = 26, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <rect width="64" height="64" rx="14" fill="var(--accent)" />
      <path
        d="M18 44C18 20 46 20 46 44"
        stroke="#ffffff"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="26" r="6.5" fill="var(--ink)" />
    </svg>
  );
}
