# Cleanverse API Capability Map

## Authentication & Encryption
- **Authentication Scheme**: API ID and Key, uses AES/CBC/PKCS5Padding encryption for payloads.
- **Current Status**: Encryption details (key derivation, IV) remain UNKNOWN (Blocked by missing documentation SPA access).
- **Required Headers**: `api-id`, `X-Request-ID`.

## CVI / A-Pass
- **Validation**: Validator contract `0xaC7e5179C2C7f03f209136886c172eb34F161792` [SOURCE = OFFICIAL CLEANVERSE TELEGRAM, verified on Monad Testnet].
- **Generate A-Pass**: `generate_apass` (No external KYC `kycSource`/`kycId` required for hackathon).
- **Registration**: 
  - `POST /validator/grant` [SOURCE = OFFICIAL CLEANVERSE TELEGRAM] (Uses `owner_signature` = `keccak256(chain + contract_address)`).
- **Rule Configuration**: `POST /validator/set_rule` (Replaces current rules), `POST /validator/rules` (Queries current rules).

## CVA / A-Token
- **Issuance API**: `POST /api/cooperate/atoken/launch`.
- **Discovery**: `query_deposit_atoken_list` [SOURCE = OFFICIAL CLEANVERSE TELEGRAM] (Requires user registration BEFORE depositing USDC to get wrapped aUSDC).

## CCP
- Evaluated on-chain via the Validator contract using `RuleV2` objects.
- Rules contain: `allowedGroup`, `allowedSubGroup`, `minTier`, `minSubTier`, `poolCountryBitmap`.
- For Tokenta, we can use Single-Contract Mode to integrate CCP.

## Travel Rule
- **Current Status**: UNKNOWN.
