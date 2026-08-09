import React, { createContext, useContext, ReactNode } from "react";

interface DemoSession {
  isDemoMode: boolean;
  walletAddress: string;
}

const DemoSessionContext = createContext<DemoSession>({
  isDemoMode: false,
  walletAddress: "",
});

export function DemoSessionProvider({
  children,
  isDemoMode,
}: {
  children: ReactNode;
  isDemoMode: boolean;
}) {
  return (
    <DemoSessionContext.Provider
      value={{
        isDemoMode,
        // The eligible participant's wallet address from verified Cleanverse evidence
        walletAddress: "0xb9f7551E19a1F8226ec38f15fB91cF4c68Bd6873",
      }}
    >
      {children}
    </DemoSessionContext.Provider>
  );
}

export function useDemoSession() {
  return useContext(DemoSessionContext);
}
