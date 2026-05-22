import type { PrivyClientConfig } from "@privy-io/react-auth";
import { TOKENTA_CHAIN } from "./chain-config";

export const privyAppId = import.meta.env.VITE_PRIVY_APP_ID as string;

/** Privy + embedded wallets default to Base Sepolia testnet (chain 84532). */
export const privyConfig: PrivyClientConfig = {
  loginMethods: ["wallet", "email"],
  defaultChain: TOKENTA_CHAIN,
  supportedChains: [TOKENTA_CHAIN],
  appearance: {
    theme: "dark",
    accentColor: "#FFFFFF",
    showWalletLoginFirst: true,
  },
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets",
    },
  },
};
