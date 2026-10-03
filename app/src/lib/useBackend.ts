import { useEffect, useState } from "react";
import { api, ApiHealth } from "./api";

export interface BackendStatusState {
  status: "checking" | "connected" | "offline";
  health: ApiHealth | null;
  lastChecked: number | null;
}

let globalStatus: BackendStatusState = {
  status: "checking",
  health: null,
  lastChecked: null,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

async function runCheck() {
  try {
    const health = await api.checkHealth();
    if (health) {
      globalStatus = {
        status: "connected",
        health,
        lastChecked: Date.now(),
      };
    } else {
      globalStatus = {
        status: "offline",
        health: null,
        lastChecked: Date.now(),
      };
    }
  } catch {
    globalStatus = {
      status: "offline",
      health: null,
      lastChecked: Date.now(),
    };
  }
  notify();
}

// Uruchomienie wstępnego sprawdzenia łączności przy starcie modułu
if (typeof window !== "undefined") {
  setTimeout(() => {
    runCheck();
  }, 100);
}

export function useBackend() {
  const [state, setState] = useState<BackendStatusState>(globalStatus);

  useEffect(() => {
    const update = () => setState(globalStatus);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  return {
    ...state,
    checkNow: runCheck,
    isOnline: state.status === "connected",
    isOffline: state.status === "offline",
    isChecking: state.status === "checking",
  };
}
