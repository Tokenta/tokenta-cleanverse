# Tokenta Terminal — Settlement Flow (Phase 1)

## Target architecture

```
Buyer Wallet
    |
    |  LOCK {amount} USDC  (wallet popup, wagmi ERC-20 transfer)
    v
Base Sepolia TX  -->  Escrow Wallet (ESCROW_WALLET)
    |
    |  POST /orders/:id/escrow/fund  { txHash }
    v
Backend reconcile  (optional on-chain verify, order ESCROW_FUNDED)
    |
    |  Buyer confirms  -->  POST /orders/:id/escrow/release
    v
On-chain release (if ESCROW_OPERATOR_PRIVATE_KEY set)
    |-- USDC transfer --> Seller (97%)
    '-- USDC transfer --> Treasury (3%)
    |
    v
Ledger + order SETTLED
```

## Addresses (your deployment)

| Role | Env (frontend) | Env (server) |
|------|----------------|--------------|
| Escrow | `VITE_ESCROW_WALLET=0x4463c9f60c27ebF9A966f8cD55d54e08114afb9E` | `ESCROW_WALLET=0x4463c9f60c27ebF9A966f8cD55d54e08114afb9E` |
| Treasury | `VITE_TREASURY_WALLET=0x419fe9C2e707a4Ce3613c9945f9Dca03aeDD485d` | `TREASURY_WALLET=0x419fe9C2e707a4Ce3613c9945f9Dca03aeDD485d` |

USDC on Base Sepolia: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

## Enable on-chain release

1. Fund the escrow wallet with a small amount of ETH (gas) on Base Sepolia.
2. Buyer payments arrive as USDC on `ESCROW_WALLET`.
3. Set on the server (never commit the private key):

   ```
   ESCROW_OPERATOR_PRIVATE_KEY=0x...   # must control USDC on ESCROW_WALLET
   SETTLEMENT_RPC_URL=https://sepolia.base.org
   ```

   For an EOA escrow wallet, the operator key is the escrow wallet's own key.
   For a Gnosis Safe, use Safe Transaction Service in a later phase (not in this MVP).

4. Optional strict fund verification:

   ```
   REQUIRE_ONCHAIN_FUND_VERIFY=true
   ```

## API surfaces

- `GET /api/v1/terminal/network` — exposes `escrowWallet`, `treasuryWallet`, `escrowReleaseSignerConfigured`
- `POST .../escrow/fund` — body may include `txHash` from the buyer's lock transfer
- `POST .../escrow/release` — returns `settlement.sellerTxHash` and `settlement.treasuryTxHash` when on-chain release runs

## Without ESCROW_OPERATOR_PRIVATE_KEY

- **Fund**: still works on-chain from the buyer; backend records the real `fundTxHash`.
- **Release**: ledger-only payout (internal balances); no USDC leaves the escrow wallet automatically.
