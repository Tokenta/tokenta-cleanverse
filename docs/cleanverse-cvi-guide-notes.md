# Cleanverse CVI Compliance Validator Guide Notes

## Architecture
- CVI Compliance Validator (IAPassComplianceValidator) provides on-chain identity verification.
- Enforces RuleV2 compliance policies via `complianceVerify(poolAddress, userAddress)`.

## Integration Modes
1. **Factory Mode**: Multi-pool business (DEX). Factory holds `REGISTER_ROLE` and calls `registerV2` or `registerApass` when creating pools.
2. **Single-Contract Mode**: Local deployment without factory authorization. Business contract directly calls the API to register, then manages rules via `setRuleV2FromContract`.

## Validator Contract
- Address: `0xaC7e5179C2C7f03f209136886c172eb34F161792` (Confirmed deployed on Monad Testnet).

## Rule Management
- Can manage via API: `POST /validator/set_rule`
- Can manage via contract: `setRuleV2FromContract`, `addRuleV2FromContract`, `removeRuleV2FromContract`.
- Struct: `RuleV2` contains `allowedGroup`, `allowedSubGroup`, `minTier`, `minSubTier`, `poolCountryBitmap`.
- Fields in a single RuleV2 are evaluated with **AND** logic. Multiple RuleV2s are evaluated with **OR** logic.

## Escrow Impact (Tokenta)
Tokenta's Escrow needs to manage pools and rules. Since Tokenta has a single escrow contract, we can use **Single-Contract Mode**. The escrow contract must store the immutable validator address, implement `Ownable`, and call `complianceVerify` during `fund` and `release` business steps.
