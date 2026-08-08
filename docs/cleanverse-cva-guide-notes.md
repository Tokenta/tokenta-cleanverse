# Cleanverse CVA Integration Guide Notes

## Architecture
- CVA is the native compliant asset standard of CCP.
- Built-in CVI compliance verification and RuleV2 policy engine.
- Every transfer is gated through CVI verification.

## Integration Modes
1. **Method A (API Launch)**: Cleanverse deploys the template. CVA contract automatically performs compliance checks. Business contract does not need to call the validator explicitly.
2. **Method B (Contract Template)**: You deploy the ERC20 contract yourself. The contract must call `policy.canTransfer(...)` before transfers.

## Escrow Impact (Tokenta)
- "Every address that SENDS or RECEIVES CVA requires an A-Pass."
- "A fee address of `address(0)` skips the Fee CVI registration."
- For Tokenta, if the Escrow contract receives or holds CVA, it **MUST** be registered.
- Using Method A: We call `registerApass(pool, token, fee)` to register the Escrow contract (pool) as a CVA vault.
- Once registered, the CVA contract will automatically verify CVI on transfers to/from the Escrow.
