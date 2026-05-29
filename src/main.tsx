import { createRoot } from "react-dom/client";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./app/App.tsx";
import { privyAppId, privyConfig } from "./app/privy-config.ts";
import { wagmiConfig } from "./app/web3/wagmi-config.ts";
import "./styles/index.css";

if (!privyAppId) {
  throw new Error("Missing VITE_PRIVY_APP_ID. Add it to .env (see .env.example).");
}

// Single QueryClient shared by wagmi (mandatory) and any future react-query usage.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById("root")!).render(
  <PrivyProvider appId={privyAppId} config={privyConfig}>
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <App />
      </WagmiProvider>
    </QueryClientProvider>
  </PrivyProvider>,
);
