# Terminal Payments Plan — Seller Wallet Income

## Flow

1. **Sell** — Seller lists API (`POST /terminal/listings/run`) with `X-Wallet-Address` stored on listing.
2. **Buy** — Buyer purchases (`POST /terminal/orders/purchase`); order amount computed from ask price × quantity.
3. **Fund** — Buyer funds escrow (`POST /terminal/orders/{id}/escrow/fund`); funds locked.
4. **Release** — Buyer or seller releases escrow; **seller wallet credited** (net of 2.5% platform fee).
5. **Withdraw** — Seller withdraws available USDC to connected wallet (`POST /terminal/wallet/withdraw`).

## APIs

| Route | Role |
|-------|------|
| `POST /terminal/wallet/deposit` | Buyer adds USDC balance (testnet sim) |
| `POST /terminal/wallet/withdraw` | Seller withdraws available USDC |
| `GET /terminal/wallet/income` | Seller earnings summary |
| `GET /terminal/orders?role=seller` | Orders where user is seller |

Settlement uses in-memory ledger (v0); on-chain USDC transfer simulated via `payoutTxHash` until treasury wiring is production-ready.
