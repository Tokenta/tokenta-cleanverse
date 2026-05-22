import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTokentaWallet } from "../hooks/useTokentaWallet";
import { markWalletSessionFromPrivy } from "../session";

type AuthContextValue = {
  ready: boolean;
  isAuthenticated: boolean;
  address: string | null;
  shortAddress: string;
  login: () => void;
  logout: () => Promise<void>;
  requireAuth: (actionLabel?: string) => boolean;
  authPrompt: string | null;
  dismissAuthPrompt: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const wallet = useTokentaWallet();
  const [authPrompt, setAuthPrompt] = useState<string | null>(null);

  useEffect(() => {
    if (wallet.authenticated && wallet.address) {
      markWalletSessionFromPrivy(wallet.address);
    }
  }, [wallet.authenticated, wallet.address]);

  const login = useCallback(() => {
    wallet.login();
  }, [wallet]);

  const requireAuth = useCallback(
    (actionLabel?: string) => {
      if (!wallet.ready) return false;
      if (wallet.authenticated) return true;
      const message = actionLabel
        ? `${actionLabel} requires wallet or email sign-in.`
        : "Sign in with wallet or email to use this feature.";
      setAuthPrompt(message);
      wallet.login();
      return false;
    },
    [wallet],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ready: wallet.ready,
      isAuthenticated: wallet.authenticated,
      address: wallet.address,
      shortAddress: wallet.shortAddress,
      login,
      logout: wallet.logout,
      requireAuth,
      authPrompt,
      dismissAuthPrompt: () => setAuthPrompt(null),
    }),
    [wallet, login, requireAuth, authPrompt],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
