# Tokenta × Cleanverse Hackathon Summary

## PROBLEM
Institutional marketplaces cannot safely settle AI/digital assets when asset provenance and participant/settlement compliance are separate systems. Traditional execution venues often separate KYC/AML from the settlement layer, leading to friction, compliance risk, and fragmented liquidity.

## SOLUTION
Tokenta combines asset verification with Cleanverse identity, programmable eligibility, and compliant value transfer. By moving the compliance check into the same flow as the trade execution, Tokenta creates a secure, fail-closed institutional marketplace where policy is strictly enforced.

## CLEANVERSE INTEGRATION
- **CVI (Buyer/seller A-Pass verification):** Resolves counterparties to ensure both the buyer and seller possess verified institutional credentials.
- **CCP / RuleV2 (Tokenta pool requires defined participant eligibility):** A strict RuleV2 matrix ensures only compliant counterparties can trade. We configured the pool to require Minimum SubTier 50 (Authorized Institutional Entities).
- **CVA (Compliant settlement asset enforces transfer eligibility):** The settlement asset itself refuses transfers to unauthorized addresses, enforcing policy on-chain at the exact moment of value movement.

## ENFORCEMENT
Server-side escrow fails closed. A frontend bypass cannot skip compliance because the backend orchestrator and the `CVASettlementAdapter` strictly validate all transactions against the Cleanverse protocol before interacting with the Monad blockchain.

## POSITIVE CASE
**Eligible participants → settlement succeeds**
When both counterparties are verified and satisfy the RuleV2 policy, the CVA settlement is APPROVED, the transaction is signed, and value moves instantly on Monad Testnet.

## NEGATIVE CASE
**Ineligible participant → settlement blocked → zero value moved**
If either participant is missing a valid CVI A-Pass or fails the strict RuleV2 check, the Cleanverse backend integration returns `POLICY_DENIED`. The Tokenta compliance orchestrator prevents the transaction from broadcasting, and the UI visually reports the denial reason to the user.

## DEPLOYED CHAIN
**Monad Testnet**
Chain ID: 10143

## EVIDENCE
- **Live URL:** [https://cleanverse.tokenta.space](https://cleanverse.tokenta.space)
- **GitHub URL:** (To be provided)
- **Important Contracts:**
  - **Tokenta Pool:** `0x85ed51dc9db2f98bca5aa913c9857a3bd017e6b0`
  - **Tokenta CVA:** `0x2ecd60dc0fe611c60bd241f46943b2813abb243f`
  - **Cleanverse Validator:** `0xaC7e5179C2C7f03f209136886c172eb34F161792`
  - **A-Token Policy:** `0x36489be45fa84f70a0c2bdb11d824be608cb12dd`
- **Important Transaction Hashes:**
  - (To be updated after smoke test)

## SCALABILITY
Rules and settlement adapter are isolated from Tokenta's matching/marketplace layer, allowing additional assets, policy profiles, and supported Cleanverse chains. By encapsulating Cleanverse logic within the `CVASettlementAdapter` and `ComplianceOrchestrator`, Tokenta can seamlessly integrate new chains and assets without redesigning the core order book.
