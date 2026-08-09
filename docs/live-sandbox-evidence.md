## DEPLOYMENT VERIFICATION  
- receipt status: success  
- contract address: 0x85ed51dc9db2f98bca5aa913c9857a3bd017e6b0  
- bytecode: non-empty  
- decoded owner: 0x175F23fc76159628c340663DB1896D614501F971 

## ON-CHAIN getRulesV2 DECODED EVIDENCE (RuleV2[])
- allowedGroup: 0x0000
- allowedSubGroup: 0x0000
- minTier: 0
- minSubTier: 50
- isBlackList: false
- countryBitmap: 0 

## PRE-TRANSACTION POLICY EVALUATION EVIDENCE
- eligible A-Pass (subTier 60) → PASS
- ineligible A-Pass (subTier 9) → DENY

An ineligible counterparty is rejected before broadcast, preventing prohibited value movement and unnecessary gas expenditure.
