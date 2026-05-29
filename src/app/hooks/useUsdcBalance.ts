/**
 * Live USDC balance for an arbitrary wallet (typically the connected user).
 * Re-reads on every new block; falls back to "—" while disconnected or RPC silent.
 */
import { useReadContract } from "wagmi";
import { formatUnits, type Address } from "viem";

import { ACTIVE_CHAIN_ID, ERC20_ABI, USDC_ADDRESS, USDC_DECIMALS } from "../web3/contracts";

export interface UsdcBalance {
  raw: bigint | null;
  formatted: string;
  isLoading: boolean;
  refetch: () => void;
}

export function useUsdcBalance(address: Address | null | undefined): UsdcBalance {
  const enabled = Boolean(address) && /^0x[a-fA-F0-9]{40}$/.test(address ?? "");

  const { data, isLoading, refetch } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: enabled ? [address as Address] : undefined,
    chainId: ACTIVE_CHAIN_ID,
    query: {
      enabled,
      refetchInterval: 12_000,
    },
  });

  const raw = (data as bigint | undefined) ?? null;
  const formatted = raw !== null ? formatUnits(raw, USDC_DECIMALS) : "—";

  return { raw, formatted, isLoading, refetch: () => void refetch() };
}
