import { createRoot } from "react-dom/client";
import { PrivyProvider } from "@privy-io/react-auth";
import App from "./app/App.tsx";
import { privyAppId, privyConfig } from "./app/privy-config.ts";
import "./styles/index.css";

if (!privyAppId) {
  throw new Error("Missing VITE_PRIVY_APP_ID. Add it to .env (see .env.example).");
}

createRoot(document.getElementById("root")!).render(
  <PrivyProvider appId={privyAppId} config={privyConfig}>
    <App />
  </PrivyProvider>,
);
