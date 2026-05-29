import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { TerminalToastBanner } from "../components/TerminalToastBanner";

export type TerminalToastKind = "error" | "success" | "warn" | "info";

export type TerminalToastPayload = {
  message: string;
  kind?: TerminalToastKind;
  title?: string;
  /** Auto-dismiss after ms (default 5200). Set 0 to stay until dismissed. */
  durationMs?: number;
};

type TerminalToastState = TerminalToastPayload & { id: string };

type TerminalToastContextValue = {
  showToast: (payload: TerminalToastPayload | string) => void;
  dismissToast: () => void;
};

const TerminalToastContext = createContext<TerminalToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 5200;

export function TerminalToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<TerminalToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (payload: TerminalToastPayload | string) => {
      const normalized: TerminalToastPayload =
        typeof payload === "string" ? { message: payload, kind: "error" } : payload;

      if (timerRef.current) clearTimeout(timerRef.current);

      const id = `toast_${Date.now()}`;
      setToast({
        id,
        message: normalized.message,
        kind: normalized.kind ?? "error",
        title: normalized.title,
        durationMs: normalized.durationMs,
      });

      const duration = normalized.durationMs ?? DEFAULT_DURATION_MS;
      if (duration > 0) {
        timerRef.current = setTimeout(() => {
          setToast(null);
          timerRef.current = null;
        }, duration);
      }
    },
    [],
  );

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <TerminalToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <TerminalToastBanner toast={toast} onDismiss={dismissToast} />
    </TerminalToastContext.Provider>
  );
}

export function useTerminalToast(): TerminalToastContextValue {
  const ctx = useContext(TerminalToastContext);
  if (!ctx) {
    throw new Error("useTerminalToast must be used within TerminalToastProvider");
  }
  return ctx;
}

/** Safe variant for leaf components that may render outside the provider in tests. */
export function useTerminalToastOptional(): TerminalToastContextValue | null {
  return useContext(TerminalToastContext);
}
