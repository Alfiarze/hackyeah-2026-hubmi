/**
 * Router i stan współdzielony.
 *
 * Routing na hashu, bez biblioteki: aplikacja ma osiem widoków i musi działać
 * z pliku (`base: "./"`), również po wrzuceniu dist/ na dowolny statyczny
 * hosting bez konfiguracji przekierowań.
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Shell, type Route } from "./components/Shell";
import { Backdrop } from "./components/Backdrop";
import { Matchmaking } from "./modules/Matchmaking";
import { Library } from "./modules/Library";
import { Creator } from "./modules/Creator";
import { Tester } from "./modules/Tester";
import { Comms } from "./modules/Comms";
import { Admin } from "./modules/Admin";
import { Middleman } from "./modules/Middleman";
import { Accessibility } from "./modules/Accessibility";
import {
  getState,
  subscribe,
  syncWithBackend,
  unreadForAdmin,
  unseenRepliesForAuthor,
} from "./lib/store";
import { loadCatalogFromBackend, type Innovation } from "./lib/data";
import { useReveal } from "./lib/useReveal";

const ROUTES: Route[] = [
  "matchmaking", "biblioteka", "kreator", "tester",
  "komunikacja", "admin", "middleman", "dostepnosc",
];

function readHash(): Route {
  const h = window.location.hash.replace(/^#/, "");
  return (ROUTES as string[]).includes(h) ? (h as Route) : "matchmaking";
}

export default function App() {
  const [route, setRoute] = useState<Route>(readHash);
  const state = useSyncExternalStore(subscribe, getState, getState);

  /** Innowacja przekazana między modułami przyciskami na fiszce. */
  const [handoff, setHandoff] = useState<Innovation | null>(null);

  /** Tyknięcie przy każdym `go()` - także przy kliknięciu bieżącej zakładki,
   *  kiedy `route` się nie zmienia, a widok i tak ma wrócić na górę. */
  const [navTick, setNavTick] = useState(0);

  useEffect(() => {
    const onHash = () => setRoute(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Przeglądarka nie może wracać do zapamiętanej pozycji przewinięcia przy
  // nawigacji po hashach (wstecz/dalej też jest zmianą zakładki).
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  }, []);

  useEffect(() => {
    loadCatalogFromBackend();
    syncWithBackend();
  }, [route]);

  // Treść pojawia się przy przewijaniu; nowy widok = nowa pętla obserwatora.
  useReveal(route);

  const go = useCallback((r: Route) => {
    window.location.hash = r;
    setRoute(r);
    setNavTick((n) => n + 1);
  }, []);

  // Nowy widok zaczyna się od góry - dopiero PO renderze, bo scrollTo
  // w samym handlerze potrafi zostać nadpisane przez przywracanie pozycji
  // przy nawigacji hashowej, a focus(<main>) bez preventScroll dociągał
  // stronę do nagłówka zamiast do samej góry. Focus wraca na <main>, żeby
  // czytnik nie czytał od nowa całej nawigacji.
  useEffect(() => {
    if (navTick === 0) return; // pierwsze wejście - nic nie przewijamy
    window.scrollTo({ top: 0 });
    document.getElementById("main")?.focus({ preventScroll: true });
  }, [route, navTick]);

  const toMiddleman = useCallback(
    (inn: Innovation) => {
      setHandoff(inn);
      go("middleman");
    },
    [go],
  );

  const toTester = useCallback(
    (inn: Innovation) => {
      setHandoff(inn);
      go("tester");
    },
    [go],
  );

  return (
    <>
      <Backdrop route={route} />
      <Shell
        route={route}
        onRoute={go}
        adminUnread={unreadForAdmin(state).length}
        authorUnseen={unseenRepliesForAuthor(state).length}
      >
        {route === "matchmaking" && <Matchmaking onAdapt={toMiddleman} onTest={toTester} />}
        {route === "biblioteka" && <Library onAdapt={toMiddleman} onTest={toTester} />}
        {route === "kreator" && <Creator />}
        {route === "tester" && (
          <Tester
            preselected={handoff}
            onClearPreselect={() => setHandoff(null)}
            threads={state.threads}
          />
        )}
        {route === "komunikacja" && <Comms state={state} />}
        {route === "admin" && <Admin state={state} />}
        {route === "middleman" && (
          <Middleman preselected={handoff} onClearPreselect={() => setHandoff(null)} />
        )}
        {route === "dostepnosc" && <Accessibility />}
      </Shell>
    </>
  );
}
