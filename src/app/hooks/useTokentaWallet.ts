import { useMemo } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

export function shortenAddress(address: string | undefined, chars = 4): string {
  if (!address) return "—";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

export function useTokentaWallet() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();

  const address = useMemo(() => {
    const linked = user?.wallet?.address;
    if (linked) return linked;
    const connected = wallets.find((w) => w.address)?.address;
    return connected ?? null;
  }, [user, wallets]);

  const shortAddress = shortenAddress(address ?? undefined);

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
