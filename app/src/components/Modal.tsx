/**
 * Dostępne okno modalne.
 *
 * Nie używamy <dialog> bo w starszym Safari brakuje showModal(), a grupa
 * docelowa to m.in. seniorzy na starszych urządzeniach. Zamiast tego pełna
 * obsługa ręczna: role="dialog", focus trap, Escape, zwrot focusu na element
 * wywołujący i blokada przewijania tła (WCAG 2.1.2, 2.4.3).
 */
import { useEffect, useRef, type ReactNode } from "react";
import "./modal.css";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** szerokie treści (tabele, wniosek) */
  wide?: boolean;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), ' +
  'select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, children, wide }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // focus na pierwszy element, nie na całe okno - czytnik od razu czyta treść
    const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      );
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal__backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`modal${wide ? " modal--wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={panel}
        tabIndex={-1}
      >
        <div className="modal__head">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="btn btn--icon btn--ghost" onClick={onClose}>
            <span aria-hidden="true">✕</span>
            <span className="sr-only">Zamknij okno</span>
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
