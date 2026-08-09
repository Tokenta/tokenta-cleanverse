# Tokenta × Cleanverse

## Problem
Institutional marketplaces cannot safely settle AI and digital assets when asset provenance and participant/settlement compliance are separated into fragmented systems. Traditional platforms separate KYC/AML from the settlement layer, leading to friction, compliance risks, and fragmented liquidity.

## Solution
Tokenta combines robust AI asset verification with **Cleanverse identity**, programmable eligibility, and compliant value transfer. By moving the compliance check directly into the transaction execution path, Tokenta creates a secure, fail-closed institutional marketplace where policy is strictly enforced prior to on-chain settlement.

## Architecture
Tokenta is divided into two parts:
1. **Frontend Terminal:** A React-based interface allowing institutional buyers and sellers to discover verified digital assets.
2. **Backend Compliance Orchestrator:** An escrow and settlement service that acts as the broker. Before any value is allowed to move on-chain, the backend orchestrator invokes the `CVASettlementAdapter` to enforce Cleanverse policies.

### Why Cleanverse is Essential
Cleanverse allows us to push identity and policy enforcement into the transaction execution context. Instead of just verifying an asset, we can guarantee that the counterparty trading the asset is legally eligible to hold it, right at the time of execution.

### CVI Integration
Both the buyer and seller identities are resolved against the Cleanverse CVI to ensure they possess a valid institutional A-Pass.

### RuleV2 / CCP Integration
The Tokenta trading pool is registered with a strict RuleV2 matrix. Currently, our pool requires a Minimum SubTier of 50 (Authorized Institutional Entities). Any identity below this threshold is completely rejected by the policy matrix.

### CVA Integration
The settlement asset (`TokentaCVA`) restricts unauthorized transfers. Value cannot move on-chain unless the orchestrator verifies the transaction against the Cleanverse CVA contract constraints.

---

## Transaction Flows

### Positive Transaction Flow
1. Eligible wallet connects.
2. The orchestrator checks the buyer's and seller's CVI status.
3. The orchestrator evaluates the pool's RuleV2 matrix.
4. Cleanverse authorizes the transaction (all checks PASS).
5. The CVA settlement asset allows the transfer.
6. The transaction is signed and broadcast on Monad Testnet, settling instantly.

### Negative Transaction Flow
1. An ineligible wallet (or missing CVI credentials) attempts a trade.
2. Cleanverse evaluates the identity against the strict RuleV2 matrix and returns `POLICY_DENIED`.
3. The Tokenta backend explicitly blocks the escrow execution.
4. **Zero value moves.** An ineligible counterparty is rejected before broadcast, preventing prohibited value movement and unnecessary gas expenditure.

---

## Monad Testnet Deployment

**Important Public Contract Addresses (Monad Testnet - Chain ID 10143):**
- **Tokenta Pool Address:** `0x85ed51dc9db2f98bca5aa913c9857a3bd017e6b0`
- **Tokenta CVA Address:** `0x2ecd60dc0fe611c60bd241f46943b2813abb243f`
- **Cleanverse Validator:** `0xaC7e5179C2C7f03f209136886c172eb34F161792`
- **A-Token Policy:** `0x36489be45fa84f70a0c2bdb11d824be608cb12dd`

**Live Demo URL:** [https://tokenta-terminal.vercel.app](https://tokenta-terminal.vercel.app)
**Backend API URL:** [https://tokenta-terminal-api.onrender.com](https://tokenta-terminal-api.onrender.com)
**Public Transaction Evidence:** [0xc633aa34ee5ab19c77b7de07ce8712e46f0dfba8b67d2c025a521d96f8eb39ca](https://testnet.monadexplorer.com/tx/0xc633aa34ee5ab19c77b7de07ce8712e46f0dfba8b67d2c025a521d96f8eb39ca)

---

## Local Setup & Testing

### Environment Variables
To run this project locally, you must provide the following environment variables (values omitted for security):
```env
CLEANVERSE_API_ID=
CLEANVERSE_API_KEY=
CLEANVERSE_API_BASE_URL=
SETTLEMENT_NETWORK=monad-testnet
SETTLEMENT_CHAIN_ID=10143
SETTLEMENT_RPC_URL=https://testnet-rpc.monad.xyz/
TOKENTA_ADMIN_PK=
```

### Running the App
1. Install dependencies: `npm install`
2. Start backend server: `cd server && npm run dev`
3. Start frontend: `npm run dev`

### Testing
Run the backend unit tests (which safely mock the Cleanverse endpoints) using:
```bash
cd server
npm test
```

To run a full Cleanverse integration smoke test (requires real credentials):
```bash
cd server
npx tsx scripts/test-tokenta-demo.ts
```

---

## Security Architecture
The application employs a **server-side fail-closed** compliance model. Secrets are safely injected via environment variables (`.env`) and never exposed to the frontend. The frontend `ComplianceShield` component only displays diagnostic compliance data retrieved through secure server-side API endpoints, preventing any frontend bypass.

## Scalability Path
The compliance rules and the `CVASettlementAdapter` are entirely isolated from Tokenta's core matching and marketplace layers. This allows Tokenta to effortlessly support additional assets, complex regulatory policy profiles, and integration with future Cleanverse deployments on Monad Mainnet without rewriting the order book logic.