import { useMemo } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useDemoSession } from "../context/DemoSessionContext";

export function shortenAddress(address: string | undefined, chars = 4): string {
  if (!address) return "—";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

export function useTokentaWallet() {
  const { isDemoMode, walletAddress: demoAddress } = useDemoSession();
  
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();

  const address = useMemo(() => {
    if (isDemoMode) return demoAddress;
    const linked = user?.wallet?.address;
    if (linked) return linked;
    const connected = wallets.find((w) => w.address)?.address;
    return connected ?? null;
  }, [user, wallets, isDemoMode, demoAddress]);

  const shortAddress = shortenAddress(address ?? undefined);

  if (isDemoMode) {
    return {
      ready: true,
      authenticated: true,
      login: () => {},
      logout: () => {},
      user: { wallet: { address: demoAddress } } as any,
      address,
      shortAddress,
      wallets: [{ address: demoAddress, connectorType: "injected" } as any],
    };
  }

  return {
    ready,
    authenticated,
    login,
    logout,
    user,
    address,
    shortAddress,
    wallets,
  };
}

