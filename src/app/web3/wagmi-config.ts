/**
 * wagmi configuration — bridges Privy embedded / external wallets to wagmi/viem so
 * we can run real on-chain reads and writes (e.g. ERC-20 transfer with wallet popup).
 *
 * We use `@privy-io/wagmi` (not `wagmi/connectors/injected`) because Privy already
 * owns the connect / login UI; adding RainbowKit on top would create a second,
 * competing wallet UI.
 *
 * Chain support is intentionally narrow: Base Sepolia only. Mainnet will be added
 * once the escrow smart contract is audited.
 */
import { createConfig } from "@privy-io/wagmi";
import { http } from "viem";
import { baseSepolia } from "viem/chains";

import { TOKENTA_RPC_URL } from "../chain-config";

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(TOKENTA_RPC_URL),
  },
});
