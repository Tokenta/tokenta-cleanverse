# Cleanverse Telegram Findings

**DATE**: 21:45

**AUTHOR**: Isaac

**AUTHOR TYPE**: OFFICIAL

**CLAIM**: 🛡️ It's official — Cleanverse Build: Trusted Assets Hackathon is announced! Supported by Monad Foundation ⚡ 48-hour online sprint — Aug 8–9 (UTC) 🏆 16,000 aUSDC total — top 3 in each track (5K / 2K / 1K) 🛠 Track 1 · RWA — tokenization with compliance embedded from issuance 🛠 Track 2 · DeFi — identity-verified DeFi primitives 🔑 Sandbox API access to CVI + CVA, docs fully public 📅 Register by Aug 7, 23:59 UTC 👉 cleanverse.com/hackathon Monad Devs just announced it here — give it a repost if you're in 🔁 https://x.com/monad_dev/status/2080638638560530686 https://x.com/TheCleanverse/status/2080650093292646539 Questions? Ask right here — the team is live throughout the event 🚀

**STATUS**: CONFIRMED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 08:24

**AUTHOR**: Unknown

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Hey! Welcome 👋 Absolutely — you're free to build whatever you like, and integrating Archon with the Cleanverse stack is a perfectly valid direction. There are no restrictions on what you build or which tools you bring. That said, a practical tip for scoring: submissions are judged against the track requirements, so the closer your project sits to them, the higher the judges can score it. Concretely: 🛠 Track 1 · RWA — CVI and CVA both integrated into your core flow, starting from the issuance stage 🛠 Track 2 · DeFi — at least one of CVI or CVA essential to your core flow (likely the natural fit for a wallet integration — e.g., CVI-gated access or CVA settlement inside Archon) The judging rubric weights "depth of CVI·CVA integration" at 30% — superficial or bolt-on integrations score low, so make the Cleanverse stack essential to how your project works, not an add-on. Docs are fully public at docs.cleanverse.com — and feel free to share your idea here anytime for feedback before you commit to it. Good luck! 🛡️

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 08:58

**AUTHOR**: Unknown

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: 🙏 Wow — the interest since the announcement has been amazing. Thank you, builders! For everyone just joining, here's what Cleanverse Build: Trusted Assets Hackathon is all about: 🛠 Track 1 · RWA — tokenization with compliance embedded from issuance 🛠 Track 2 · DeFi — identity-verified DeFi primitives 🏆 16,000 aUSDC total — top 3 in each track (5K / 2K / 1K) ⚡ Aug 8–9 (UTC) · 48 hours · fully online 🔑 Sandbox API access to CVI + CVA, docs fully public 🌐 And one thing worth repeating: you can deploy on any chain Cleanverse is integrated with — Ethereum, Arbitrum, Polygon, Avalanche, BNB Chain, or Monad. Same APIs across all six, so build on whichever stack you're fastest with. 📅 Register by Aug 7, 23:59 UTC 👉 cleanverse.com/hackathon Questions? Ask right here — we're live throughout 🚀

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 10:40

**AUTHOR**: Unknown

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Keep getting this error

**STATUS**: LEAD

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 16:29

**AUTHOR**: Ken Crypto

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: same issue, generate_apass always returns CV_500. Looks like the same root cause as the magicklink "Failed to calculate user points" error others are seeing. App ID: APP20260614112550LIDZXM , sample X-Request-ID: 1bbcc051-3ef0-461e-a763-6ff45dceaa25 @leeyisa

**STATUS**: LEAD

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 19:22

**AUTHOR**: Johnson Enyenihi

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Same error from my end too

**STATUS**: LEAD

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 11:38

**AUTHOR**: Ken Crypto

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: USDC faucet on BSC testnet is broken .InstitutionFaucet failed: insufficient funds for transfer. The faucet wallet looks empty (no USDC, no tBNB). Could you fund it? Everything else on bsc works fine.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 15:11

**AUTHOR**: Isaac

**AUTHOR TYPE**: OFFICIAL

**CLAIM**: how about use the usdt faucet instead?

**STATUS**: CONFIRMED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 17:39

**AUTHOR**: Chengcai

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: ALL, If you need to obtain AUSDC, you can get the deposit address through the API, then go to Circle Faucet ( https://faucet.circle.com ), select the Monad/Polygon Testnet network, enter the deposit address, and your wallet address will receive the AUSDC.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 17:36

**AUTHOR**: MystiqueMide

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Hi @leeyisa . My core flow gates settlement on A-Pass (CVI), so I need at least one or two verified wallets on Monad Testnet to demo the cleared path. The sandbox magic-link registration asks for a real ID or passport, which I'd rather not submit for testnet. Do you provide pre-verified test A-Pass wallets for hackathon builders, or a sandbox KYC path that doesn't need real documents? Also, does A-Pass verification reflect on-chain on Monad (readable via balanceOf on the A-Pass contract), or is it API-only? Thanks.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 18:01

**AUTHOR**: Fexx

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Before I send any role-grant or mint transaction, could you help me confirm that I’m using the token correctly? Could you please share or confirm: 1. The official ABI/source or deployment code hash for the exact proxy and implementation. 2. Whether transactions should target the proxy or implementation contract. 3. The exact MINTER_ROLE value and grant/revoke procedure. 4. The exact mint function, amount units, decimals, caps and expected events. 5. How admin/minter custody, rotation and revocation should be handled in UAT. 6. Which compliance rules Cleanverse enforces on direct A-Token transfers. 7. Whether a standard A-Token plus a separate benefit/settlement contract is acceptable for the RWA track. 8. Any official Monad UAT example or ABI I should follow. I can provide my request ID, issue asset ID, token address and issuance transaction hash privately if useful. I will not share API keys or private keys. I’d appreciate a quick sanity check before I continue.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 22:55

**AUTHOR**: Minos

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Heads up on the Base sandbox faucet for anyone building on aUSDC — /faucet has been failing since 24 July and it looks like an infra issue rather than a payload one. Two separate failures: • symbol: "usdc" → reverts InsufficientBalance. The faucet's source wallet holds 0.199994 origin USDC. • symbol: "ausdc" → reverts NoAPass. The faucet's own wallet 0xc448042e…de873 has no A-Pass, so aUSDC's transfer gate refuses it. Origin USDC has had zero transfers in 10 days, so I don't think anyone has drawn from it successfully in that window. Workaround if you're blocked: as an Issue Member you can launch your own A-Token via /atoken/launch and mint your own settlement supply. Same min_tier gating, works fine. One catch — download_travel_rule returns TR_001 for a standard A-Token with no deposit pair, so you lose Travel Rule reports that way. @leeyisa — is a faucet top-up possible before the build window? Happy to share the exact repro.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 03:48

**AUTHOR**: Fexx

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Before I send any role-grant or mint transaction, could you help me confirm that I’m using the token correctly? Could you please share or confirm: 1. The official ABI/source or deployment code hash for the exact proxy and implementation. 2. Whether transactions should target the proxy or implementation contract. 3. The exact MINTER_ROLE value and grant/revoke procedure. 4. The exact mint function, amount units, decimals, caps and expected events. 5. How admin/minter custody, rotation and revocation should be handled in UAT. 6. Which compliance rules Cleanverse enforces on direct A-Token transfers. 7. Whether a standard A-Token plus a separate benefit/settlement contract is acceptable for the RWA track. 8. Any official Monad UAT example or ABI I should follow. I can provide my request ID, issue asset ID, token address and issuance transaction hash privately if useful. I will not share API keys or private keys. I’d appreciate a quick sanity check before I continue.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 09:42

**AUTHOR**: Cleanverse Labs

**AUTHOR TYPE**: OFFICIAL

**CLAIM**: Yes, this event has been quite popular, and we will recharge the faucets as soon as possible. Also, you can get the deposit address through the API, then go to Circle Faucet ( https://faucet.circle.com ), select the Monad/Polygon Testnet network, enter the deposit address, and your wallet address will receive the AUSDC.

**STATUS**: CONFIRMED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 11:31

**AUTHOR**: Crypto Gk

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Hi team, could you please share the > following Monad UAT details? > > 1. Full request/response documentation >    for /query_apass , /query_apass_list , >    and /verify_apass , including all >    verification result codes. > > 2. Documentation for / >    query_deposit_atoken_list, / >    query_deposit_address, /query_txs , >    and /faucet . > > 3. Monad Testnet Validator contract >    address and Solidity ABI/interface or >    sample integration contract. > > 4. How a registered compliance pool >    should enforce Validator verification >    inside its smart-contract functions. > > 5. Whether a smart contract calling >    transferFrom on an A-Token must have >    an A-Pass or special authorization. > > 6. How hackathon participants can obtain >    real Monad UAT A-Tokens and aUSDC for >    end-to-end testing. > > 7. Link to the starter kit and sample >    contracts mentioned on the hackathon >    page.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 14:42

**AUTHOR**: Angel⚡VIA Raphael. Full Force 🐦SUI

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Hi, I'm integrating the Cooperate API (sandbox) for the Cleanverse Build hackathon and hit a signature issue I can't resolve from the docs alone. api-id: APP20260614112550LIDZXM Calling POST /validator/register on a contract I've deployed and verified is Ownable with the owner matching my signer wallet exactly. I self-verified the EIP-191 recovery locally and it's correct — the recovered address matches the contract's on-chain owner() — but the API still returns: {"code":"0001","message":"Invalid contract owner signature."}

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 15:32

**AUTHOR**: Unknown

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: This is a CVA integration guide and a compliance validator guide, containing a complete integration process and contract example templates for your reference. Compliance validator contracts address is: 0xaC7e5179C2C7f03f209136886c172eb34F161792. API reference : https://docs.cleanverse.com

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 17:48

**AUTHOR**: Anton

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Hi, What is the Monad testnet deployment address for IAPassComplianceValidator used with the Cleanverse sandbox/UAT API? Page 11 of the CVI pdf requires one as the validator_ constructor parameter in the single-contract template

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 17:51

**AUTHOR**: Cleanverse Labs

**AUTHOR TYPE**: OFFICIAL

**CLAIM**: compliance validator contracts address is: 0xaC7e5179C2C7f03f209136886c172eb34F161792.

**STATUS**: CONFIRMED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 05:19

**AUTHOR**: Fexx

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Hi Cleanverse support, I completed a UAT MINTER_ROLE grant–mint–revoke proof on Monad. Before deploying my Recovery Benefit Vault, could you confirm the UAT validator and policy contract addresses, registration permissions for registerV2 and registerApass, and whether registerApass(vault, cva, address(0)) is supported? Additionally, please clarify how the unrestricted RuleV2 rule is replaced and the expected behavior for expired, revoked, wrong-merchant, duplicate, paused, and failed-CVI transactions?

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 05:25

**AUTHOR**: Unknown

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Hi, thanks for providing the validator address. I confirmed that it is deployed on Monad UAT, but the issued CVA is not currently registered for CVI enforcement. Could you please share the exact registration steps for registerV2 and registerApass, the authorized caller or role, the policy contract address, and the process for replacing the unrestricted RuleV2 rule? Thank you.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 09:12

**AUTHOR**: Unknown

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: You can use the /validator/grant API to complete the authorization. and you can refer to the API documentation at docs.cleanverse.com , which includes operations such as adding a rule, removing a rule, and sett paused. You can replace a rule by adding a new rule or deleting an old rule. For contract integration guidance, you can refer to pinned messages.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 11:06

**AUTHOR**: Rakin

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Hey team how I can GET CWRSO3 faucet?

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 11:47

**AUTHOR**: Rakin

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Hey team how I can GET CWRSO3 faucet?

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 11:49

**AUTHOR**: Cleanverse Labs

**AUTHOR TYPE**: OFFICIAL

**CLAIM**: cwrs03 is the CVA one you issued yourself? You should mint it yourself. You can refer to the CVA integration guide for this.

**STATUS**: CONFIRMED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 11:56

**AUTHOR**: Rakin

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: team, CWRS03 is already issued, but our wallet 0x911F99f424D47F08a15fcC771e94dcc2f7252B02 does not have DEFAULT_ADMIN_ROLE or MINTER_ROLE. Could you confirm which wallet currently holds the admin/minter role, or help grant MINTER_ROLE to our wallet so we can mint CWRS03 on Monad Testnet

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 12:00

**AUTHOR**: Cleanverse Labs

**AUTHOR TYPE**: OFFICIAL

**CLAIM**: Refer to the CVA integration guide for granting the minter_role.

**STATUS**: CONFIRMED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 16:39

**AUTHOR**: Fexx

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: For chain ID 10143, could you please confirm: 1. For /validator/grant, who must sign owner_signature—the Cleanverse contract owner or my admin wallet? 2. What exact bytes are signed? Please provide the literal message or hash, EIP-191 variant, canonical chain string, whether 0x is included, and the expected recovered signer. 3. Which account should receive REGISTER_ROLE? 4. For /validator/register, should contract_address be the issued CVA, the RecoveryBenefitVault, or another policy pool? 5. Does /validator/register also perform the required A-Pass/CVA binding, or must I separately call registerApass? 6. Which caller, arguments, fee, and role are required for registerApass? 7. What does "CWRS03 requires your own mint" mean exactly? 8. Should I use set_rule, or add the replacement rule and delete the unrestricted rule? 9. Could you provide a redacted known-good request/response or test vector for /validator/grant and /validator/register? 10. Please map the complete supported flow in order of : authorization , registration, restrictive rule setup , CVA funding , vault activation, beneficiary redemption, merchant settlement, expiry/ revocation and refund . Please identify the caller, contract/API call and expected evidence for each step

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 18:45

**AUTHOR**: Unknown

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Unresolved: • Current UAT endpoint: /validator/grant or /validator/apply? • Who signs the grant and which address receives REGISTER_ROLE? • Can my project use a Factory contract? • Exact UAT validator/policy addresses and roles? • Does the refund recipient need A-Pass? • Meaning of CWRS03? • Exact transaction evidence and verification sequence?

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 20:06

**AUTHOR**: Woshvad

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: GM, so for the hackathon I am building Custos, a self-custody wallet with an embedded compliant swap, integrating CVI + CVA per your CCP Integration Guides (V2). I have API credentials [/ are awaiting credentials] and need the following to complete integration on your supported testnet: 1. Validator: IAPassComplianceValidator address on your supported testnet (Base Sepolia assumed — please confirm which testnets are live). 2. CVA: sandbox aUSDC/aUSDT-class token addresses on that network. 3. REGISTER_ROLE: we'll submit /api/cooperate/validator/apply for our PoolFactory at <address once deployed> — please confirm expected review time and any requirements for approval. 4. Test identities: two verified sandbox identities bound to wallets we control — one at tier ≥ 60, one at tier ~30 — so we can exercise tier-differentiated rules end to end. (Unverified cases we cover with fresh wallets.) 5. Test balances: sandbox CVA minted to the tier-60 wallet for pool liquidity and transfer testing. 6. Callback authentication: the signing scheme/secret for callback_url webhooks on cooperate APIs. 7. Four spec confirmations: a. AES/CBC/PKCS5Padding payloads — IV convention and response envelope. b. Country bitmap — the authoritative ISO-3166→bit-position mapping. c. Pause pool / freeze account — admin ABI or API for operators. d. Identity re-binding: when a verified user re-verifies from a new wallet/device, what artifact can our recovery contract verify (signed attestation vs on-chain CVI re-binding)?

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 09:25

**AUTHOR**: Cleanverse Labs

**AUTHOR TYPE**: OFFICIAL

**CLAIM**: - /validator/grant - your factory contract owner - yes, you can refer CVI Compliance Validator integration guide from pinned messages - IAPassComplianceValidator  address is 0xaC7e5179C2C7f03f209136886c172eb34F161792 - It depends on your CVA design. - Cleanverse does not provide a CAV for CWRS03; it should be a CVA issued by another developer. - the workflow your can refer CVI Compliance Validator integration guide from pinned messages

**STATUS**: CONFIRMED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 09:51

**AUTHOR**: Cleanverse Labs

**AUTHOR TYPE**: OFFICIAL

**CLAIM**: - 0xaC7e5179C2C7f03f209136886c172eb34F161792,  The networks supported by the hackathon have all been deployed, and the addresses are the same. - You can obtain it through the API query_deposit_atoken_list. - It should be api/validator/grant, and there's no review period; it only needs to be submitted by the owner. - You can register using the api generate_apass function. If you need tier support, it's recommended to use subtier for control, which allows you to set the subtier value yourself. - You can refer to the CVA Integration guide to issue the CVA you need yourself -  You can refer to the detailed description in the API interface. - You can refer to the detailed description in the API interface. The country bitmap is not currently publicly available. You can add rules via the API, which will calculate the bitmap.

**STATUS**: CONFIRMED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 11:34

**AUTHOR**: Pp Klkm

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Hi Cleanverse team, For our Monad Testnet integration we need to clarify one compliance point: Is a smart contract address allowed to receive and temporarily hold a CVA? If yes, does the contract require any special registration, exemption, or additional setup for transfer hooks / complianceVerify to work correctly? Thank you.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 15:04

**AUTHOR**: Eugene

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Hi @leeyisa We are integrating the CVI Compliance Validator V2 into our protocol and are currently blocked on the API Registration step. According to the PDF, we need to authorize our contract before we can set compliance rules, but we are running into endpoint and payload issues. Here is what we've tried based on the documentation: • POST /api/cooperate/validator/apply (referenced on Page 3 for Factory Mode) : This endpoint returns a 404 Not Found. • POST /api/cooperate/validator/register (referenced on Page 13 for Single-Contract Mode) : When we send the base payload { "contract_address": "0x...", "chain": "base" }, it returns 0001: Invalid contract owner signature.. The documentation mentions a Signature Rule (keccak256(chain + contract_address), lowercase hex concatenation). However, if we include the signature in the JSON body, the API rigidly rejects it with 10002: Unknown field(s): signature. POST /api/cooperate/validator/grant: We tested this as well and it returns the same errors as /register . Could you please clarify: 1. Which exact endpoint should we be using to authorize our contract? 2. What is the exact expected JSON payload structure? Specifically, how and where should the ECDSA signature be passed since the signature field is being rejected? Thanks for your help!

**STATUS**: LEAD

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 15:13

**AUTHOR**: Cleanverse Labs

**AUTHOR TYPE**: OFFICIAL

**CLAIM**: It should be /validator/grant, not /validator/apply. Please refer to the latest updated documentation from pinned messages. filed is owner_signature, not signature

**STATUS**: CONFIRMED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 15:22

**AUTHOR**: Unknown

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Also quick one, we are currently running tests and deploying our protocol on Base Sepolia, Sepolia and Monad Testnet. But for the purpose of the hackathon, we might be limited only to Base Sepolia for the meantime given that there are more things that are currently maintained and active on Base Sepolia than Monad. We are asking if this will not hurt our submission, since we noticed that this hackathon is pushed by Monad Foundation as well. After the hackathon, we intend to be deploying on Monad Mainnet instead.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 17:02

**AUTHOR**: NFT KING 👑

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Hi, does the hackathon sandbox provide an endpoint or onboarding flow to issue/seed an A-Pass for a connected test wallet? We want judges to complete the live CVI → private proof → CVA → Monad workflow using their own wallet.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 17:31

**AUTHOR**: Cleanverse Labs

**AUTHOR TYPE**: OFFICIAL

**CLAIM**: You can refer to the CVA Integration guide in pinned messages.

**STATUS**: CONFIRMED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 15:34

**AUTHOR**: Fexx

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: 1. Is /api/validator/grant the complete current endpoint, and what exact request fields does it require? 2. Is the address field the deployed Factory address, and does that exact address receive REGISTER_ROLE? 3. What exact bytes must the Factory owner sign? Please confirm the chain string, lowercase normalization, EIP-191 personal_sign behavior, and provide a redacted working test vector. 4. Which CVA address from query_deposit_atoken_list should we use, and is it an API-launched standard CVA or a custom CVA? 5. Does registerApass(vault, cva, address(0)) register the vault as the CVA pool and allow the vault to hold and transfer the CVA? 6. During a CVA mint from address(0) to the vault, which addresses are checked? 7. During a vault refund, is the refund recipient checked by the CVA hook, and must that recipient have A-Pass? 8. Which actors need individual A-Pass in this flow? 9. What API operation or contract call replaces the existing unrestricted rule, and what read proves that only the restrictive rule remains? 10. What transaction hashes, events, state reads, and negative-case receipts must be retained as UAT evidence?

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 17:04

**AUTHOR**: Fexx

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: 11. Please provide the separate policy contract address for Monad UAT, the validator and policy implementation addresses, their upgrade administrators, and the addresses currently holding DEFAULT_ADMIN_ROLE, REGISTER_ROLE, and rule-management permissions. 12. Is our one-benefit RecoveryBenefitVault accepted as the poolAddress for registerV2 and registerApass, with one registered vault per benefit? Or must we register one issuer-wide pool and manage individual benefits beneath that pool? 13. After registration, which exact events and state reads prove the Factory role, registerV2 registration, CVA association, and final RuleV2 state?

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 17:50

**AUTHOR**: MrNetwork

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: I just submitted my project (for application); how long does this take (deadline is in about 14hrs) Also, can one deploy app on monad mainnet?

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 18:29

**AUTHOR**: Cleanverse Labs

**AUTHOR TYPE**: OFFICIAL

**CLAIM**: You can issue your own CVA as needed. API reference : https://docs.cleanverse.com

**STATUS**: CONFIRMED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 20:20

**AUTHOR**: NFT KING 👑

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: You should have received an email after registration with more details and yes, yiu can deploy on monad(mainnet/testnet)

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 00:19

**AUTHOR**: Baiqiang D

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Let me try to answer some of your questions: 1. For API reference please check https://docs.cleanverse.com 2. Yes. You deploy your own factory and we grant REGISTER_ROLE to that address. 3. EIP-191 personal_sign. The message is chain+address. Most libs would do keccak256(msg) so you don't to do that. Please be noted that the chain on mainnet and testnet are the same. e.g. on monad sign "monad0xac0893567d43c3e7e6e35a72803df05416c1f20d". 4. You can launch your own CVA. 5. Yes. 6. The vault address. 7. Yes. 8. Every address that receives/sends CVA needs an A-Pass. 9. You can do POST /validator/set_rule to replace the current rules. After that, you can do POST /validator/rules to query rules or call the contract on chain by validator.getRulesV2(pool) .

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 01:04

**AUTHOR**: Woshvad

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Hey, think there are two things broken on your side for Base Sepolia aUSDC. The aUSDC faucet doesn't work for anyone. POST /faucet with symbol: "aUSDC" reverts inside your own faucet wallet 0xC448042edaC1899B023cAa0E9dA5E4a8833de873: ERC20InsufficientBalance(0xC448042e…e873, 0, 5000000) It holds 0 aUSDC and the dispense is a fixed 5. It does have 854 of the origin token, but isDepositMember(aUSDC, …) is false so it can't mint either. It also had no A-Pass — we issued one, so that bit's fixed, but the balance is the real problem. Separately, can someone create our deposit address? query_deposit_address gives 0x9AbFA7d4ab590d323cF0F44AD9EfeB0E05895b19 for 0x644C64B76272B6a2133Ce37925A8664c0B259102 on base, but there's no contract at it and query_user says status: 0. We're holding the origin token and ready to go, just can't wrap it. Also FYI, generate_apass takes a numeric subTier and returns code: "0000" success while ignoring it completely. Has to be a string. Took us a while to spot since the response looks fine and the tx hash is real.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 08:02

**AUTHOR**: Unknown

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Registration is officially closed — and the hacking window is open. The next 48 hours are yours. ⏰ Hacking window: Aug 8, 00:00 – Aug 9, 23:59 (UTC) 📦 What to submit (by Aug 9, 23:59 UTC): - Public GitHub repo — commit history during the hacking window is required (pre-work is fine; a single bulk upload is not) - Demo video (no time limit) - One-page summary: problem / solution / CVI·CVA integration points / deployed chain(s) - Live demo URL or testnet deployment (recommended) 👉 Submit via email to: isaac@cleanverse.com 📝 Want to update your project description? If you'd like to revise yours, simply include the updated description in your submission email. That said, please note: judges evaluate primarily based on your one-page summary, not the project description — so put your effort there. ⚖️ Judging: Concept 20% · CVI·CVA Integration Depth 30% · Build Quality 25% · UX & Demo 15% · Scalability 10% 🏆 Winners announced Aug 14 Build something institutions can actually use. Good luck! 🚀

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 15:42

**AUTHOR**: Baiqiang D

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Hi, For the faucet of aUSDC it's as you see that the balance was insufficient. We've just transferred some so you can claim now. An alternative way is to claim USDC and do a deposit. To wrap USDC to aUSDC you need to register it before transferring tokens to the deposit address. In your case you transferred USDC firstly so no wrapping happened.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 17:49

**AUTHOR**: shanrahul 💌

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: hello team, i just want to use testnet ETH in my project and where can i get ETH on monad testnet. i'm just doing a compliance base liquid staking protocol, where i need testnet ETH to mint stETH. or am i allowed to create mock ETH on a testnet and use that as a ETH and another, one as it supported my monad, are we allowed to do only on Monadchain, coz i see cleanverse supports multiple chain.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 18:45

**AUTHOR**: Isaac

**AUTHOR TYPE**: OFFICIAL

**CLAIM**: For now Monad chain seems like don't have a ETH faucet but only the Mon faucets. You can use Mon to build your product, or you can claim testnet ETH from other chains and bridge them to Monad. Or you can build on the chains which support ETH test tokens.

**STATUS**: CONFIRMED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 19:29

**AUTHOR**: xark

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: @leeyisa i can reach /api/cooperate/generate_apass , but I’m getting 400/403 responses. could you share the exact request body for Monad sandbox (field names and whether the payload should be encrypted or plaintext)? i already have a test wallet address and API ID set up.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 19:42

**AUTHOR**: Crypto Gk

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: • Hi team, we confirmed the live Monad UAT pair: USDC: 0x534b2f3A21130d7a60830c2Df862319e593943A3 aUSDC: 0xaC0893567D43C3E7e6e35a72803df05416C1f20D However, /atoken/ add_whitelist_for_institutional returns code 12013 for buyer: 0x911F99f424D47F08a15fcC771e94dcc2f7252B02 Request ID: 542e9d1e-ce2d-4fcb-991e- 016456ef9f36 The direct aUSDC faucet also returns ERC20InsufficientBalance. Faucet request ID: 0afb584b-68a3-4f8c-ae12- b1af08e0ff05 Could you please enable the Monad USDC→aUSDC deposit pair for our API account or whitelist the buyer from the issuer side, and refill the correct Monad aUSDC faucet?

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 19:56

**AUTHOR**: Cleanverse Labs

**AUTHOR TYPE**: OFFICIAL

**CLAIM**: Only self-issued Wrapped CVAs can manage their own deposit whitelist of institutional addresses using add_whitelist_for_institutional . AUSDC does not allow users to add their own. However, you can obtain the deposit address through the API, then go to Circle Faucet ( https://faucet.circle.com ), select the Monad/Polygon Testnet network, enter the deposit address, and your wallet address will receive AUSDC.

**STATUS**: CONFIRMED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 20:00

**AUTHOR**: YEMI 💚

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Hey Isaac. can I deploy my own CVA on monad? also is there a way to grant CVI on our wallet maybe temporarily or something cause right now I'm actually building in a demo sandbox. my wallet identity is blocked if I go into production mode

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 20:03

**AUTHOR**: Cleanverse Labs

**AUTHOR TYPE**: OFFICIAL

**CLAIM**: Yes, you can. You can refer to the CVA integration guide to issue your own CVA. You can generate your own wallet address's CVI using the generate_apass API. The API interface can be found at https://docs.cleanverse.com/ . You can find the integration guide in pinned messages.

**STATUS**: CONFIRMED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 20:10

**AUTHOR**: Crypto Gk

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Hi team, we followed your suggested Circle Faucet flow. Buyer wallet: 0x911F99f424D47F08a15fcC771e94dcc2f7252B02 /query_deposit_address returned: 0x36929bFb62F736f285c24d77d939Cb9e7967121D We sent 20 Monad Testnet USDC from Circle Faucet to that deposit address. However, it was not converted to aUSDC. The buyer’s USDC increased from 40 to 60, while aUSDC remains 0.018788 and the deposit address has zero USDC. Could you please check why the Circle Faucet deposit was returned instead of wrapped and confirm whether any additional setup is required?

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 20:14

**AUTHOR**: Cleanverse Labs

**AUTHOR TYPE**: OFFICIAL

**CLAIM**: Which network is it?  The Monad/Polygon Testnet network supports circle usdc. The base network requires you to call the /faucet api to obtain it.

**STATUS**: CONFIRMED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 20:15

**AUTHOR**: Crypto Gk

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Monad

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 20:18

**AUTHOR**: xark

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: thanks I can now successfully call verify_apass and receive code: "0000" , but the response says atoken not exist for my Monad sandbox token address: 0x42fB845De7BBEd1819Af1747BB36f5850CFcb3 Could you confirm whether this AToken needs to be registered/whitelisted in the sandbox before A-Pass generation and verification will pass? the API call itself is succeeding btw.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 20:23

**AUTHOR**: Cleanverse Labs

**AUTHOR TYPE**: OFFICIAL

**CLAIM**: You can refer to the CVA integration guide. If you are using a custom contract deployed using the CCP protocol, you need to call the /atoken/register_atoken API to register. You can find the detailed process in the CVA integration guide.

**STATUS**: CONFIRMED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 20:32

**AUTHOR**: Tim

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Hi Cleanverse team, raising this here per Isaac’s suggestion. Our hackathon sandbox credentials authenticate successfully against other Issue Member endpoints, but POST /generate_apass returns HTTP 403 on both Monad and Base. The response is a plain gateway error rather than the normal Cleanverse envelope: Forbidden.Data decryption failed. We’re using controlled test wallets and omitting kycSource / kycId per the hackathon guidance. Relevant X-Request-IDs: Monad: 772bed34-eee9-4af9-afbf-d7f6369a1069 Base: 83a68d89-d5fc-4ae0-8725-4d6ed98582ec Other API calls with the same credentials work correctly, and we’ve successfully registered/issued CVAs. Could you check whether our API ID is correctly provisioned/routed for encrypted generate_apass requests? This is currently preventing us from creating distinct controlled buyer/seller A-Passes for our end-to-end settlement demo.

**STATUS**: LEAD

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 20:37

**AUTHOR**: xark

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: I can successfully call /verify_apass and receive code: "0000" , so the API ID and wallet are working. However, /atoken/register_atoken returns 403 Forbidden.Data decryption failed even when I send the payload encrypted through the Cleanverse helper. Could you confirm whether the registration endpoint uses the same encryption scheme as the other cooperate APIs, or share a minimal working registration example for Monad sandbox?

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 20:45

**AUTHOR**: Unknown

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Please refer to the steps in the compliance validator integration guide and call the validator/grant API for automatic full authorization.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 20:56

**AUTHOR**: Koshak01

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Not support, just a fellow builder — we hit the same wall, here's what fixed it. We get 0000 from /verify_apass (plaintext), and — the useful part — /atoken/launch succeeds with an encrypted body. So the cooperate encryption itself is fine; "Data decryption failed" is almost always the IV or the key, not the endpoint. The scheme that works for us on the encrypted {"data": …} endpoints: - AES-256-CBC, PKCS#7 padding - IV = 16 zero bytes, fixed — not random - key = base64-decode(api-key) → exactly 32 bytes (the api-key, not the api-id) - send {"data": "<base64 ciphertext>"}, headers api-id + X-Request-ID If your helper generates a random IV, or you keyed with the api-id, you get exactly this 403. Force a zero IV and key with the decoded api-key. Monad sandbox, works for us.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 21:04

**AUTHOR**: Stella Maris

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Hi,  building on the Cooperate API for the hackathon (Monad/base). Following your note on deposit whitelists, I issued my own A-Token via POST /atoken/launch: cvUSD  0x5e7Ca7ec42A11B4F5259fc429AcD32dFFf83796D  (monad, 6dp) requestId IA20260808205025557489 — applyStatus ISSUED Two questions: 1) How do I launch a WRAPPED CVA (wrapping an existing ERC20, e.g. USDC 0x534b2f3A21130d7a60830c2Df862319e593943A3)? /atoken/launch rejects "origin_token" as an unknown field, and accepts only chain, admin_address, rule, decimals, icon, token_name, token_symbol. Is there a different endpoint or flag for the wrapped variant? 2) For a token I administer, how do holders actually receive it? Is add_whitelist_for_institutional (address_list) the route, so a whitelisted contract can deposit and have the A-Token minted to the depositor's wallet? Or is there a separate mint/issue endpoint for the admin_address? Context: my escrow contract releases funds only after identity + asset-rule + policy checks pass, and I want settlement to land as a compliance-enforcing A-Token rather than the plain origin token.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 21:06

**AUTHOR**: Tim

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Thanks. We’re already following that encryption specification exactly: AES/CBC/PKCS5Padding, zero IV, Base64-decoded API key, Base64 ciphertext in { "data": "..." } . The reason I’m raising this as potentially route-specific is that the same encryption implementation and same API credentials successfully work on another encrypted endpoint : POST /atoken/register_atoken We’ve successfully submitted custom CVA registrations through that route and they reached ISSUED . But with: POST /generate_apass the gateway returns HTTP 403: Forbidden.Data decryption failed. before the normal Cleanverse response envelope. X-Request-IDs: Monad: 772bed34-eee9-4af9-afbf-d7f6369a1069 Base: 83a68d89-d5fc-4ae0-8725-4d6ed98582ec So could you please check those request IDs on your side and confirm whether /generate_apass is using the same decryption configuration/key mapping for our api-id? Happy to provide the redacted plaintext field names as well. I won’t share the API key.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 21:14

**AUTHOR**: Cleanverse Labs

**AUTHOR TYPE**: OFFICIAL

**CLAIM**: You can refer to the /atoken/launch_wrapped_atoken API to issue a Wrapped CVA. After issuance, like with CVAs, you need to authorize Mint. Then, you can add an address with only native assets to the whitelist via the add_whitelist_for_institutional API. Subsequent transfers from this address to the deposit address will automatically and manually wrap the CVA.

**STATUS**: CONFIRMED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 21:14

**AUTHOR**: Ali Hammed

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: For Validator Compliance v5.6 on Monad, can you share the deployed Validator contract address and ABI? Can a registered pool contract call verify directly onchain? Can that registered pool hold A-Tokens without its own personal A-Pass? Also, does the hackathon API ID have Issue Member permission for validator/register, update_status, and faucet?

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 21:18

**AUTHOR**: Cleanverse Labs

**AUTHOR TYPE**: OFFICIAL

**CLAIM**: Yes, you have the necessary permissions. You can refer to the integration guide for the compliance validator. Holding a CVA always requires a CVI, unless your pool doesn't use CVA, but this is unrelated to the Cleanverse CCP protocol. compliance validator integration guide can be find in pinned messages

**STATUS**: CONFIRMED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 21:23

**AUTHOR**: Stella Maris

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Thanks — /atoken/launch_wrapped_atoken worked and I mapped the schema (origin_token_address + origin_token_icon were the ones I was missing). But issuance failed: "LaunchWrappedAToken failed: origin token USDC (0x534b2f3a21130d7a60830c2df862319e593943a3) is already paired" So on Monad I can't wrap USDC (aUSDC already pairs it), and I can't add myself to aUSDC's institutional whitelist. Both routes are closed. Could you add my escrow contract to the aUSDC institutional deposit whitelist? chain:  monad escrow: 0xb327709Ec4f0830722776746b1da42F98d51868e admin:  0xdC646c197d0202FC2A0326af8ab55066A3549E2E Then escrow releases would land as aUSDC. Alternatively, is there an unpaired origin token on Monad I could wrap instead?

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 22:27

**AUTHOR**: xark

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: i’m now past the encryption issue. /verify_apass returns 0000 , and /atoken/register_atoken accepts the encrypted payload but returns 0002 chain signature invalid . the signer address derived from my MONAD_PRIVATE_KEY is: 0x456f5ab4a1e27e0b4e0031df19e94f4d750f104d the A-Token contract I’m registering is: 0x42FB845De7BBEd1819Af1747BB36f5850CFCb3 the signed message is exactly: monad0x42fb845de7bbed1819af1747bb36f5850cfcb3 Could you confirm whether 0x456f5ab4a1e27e0b4e0031df19e94f4d750f104d is recognized as the owner/admin for that contract in the sandbox, or whether additional registration is required before register_atoken can succeed?

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 22:38

**AUTHOR**: Unknown

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: or if anyone else successfully received aUSDC from the faucet, I'd like to know how.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 23:10

**AUTHOR**: .

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: 0x9AE53a6d3c8E8955D1bAA660B4aBd477Fe512C2b this is my wallet address and APP20260614112550LIDZXM - app-id. can anyone send testnet aUSDC ? or tell me faucet

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 23:11

**AUTHOR**: Cyrin

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: here is the faucet

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 23:22

**AUTHOR**: .

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Hi team — following the Circle Faucet flow for aUSDC on Monad. API ID: APP20260614112550LIDZXM Buyer wallet (has A-Pass): 0x9AE53a6d3c8E8955D1bAA660B4aBd477Fe512C2b Deposit address from /query_deposit_address : 0x3a2EFB7275cf022e4971C697A80b807A99d140d3 Issue: Circle Faucet → deposit address gives USDC only (non_whitelist_transfer / no wrap). Direct POST /faucet symbol=ausdc returns ERC20InsufficientBalance. Could you please: 1) Refill Monad aUSDC institution faucet for our API ID, OR 2) Enable USDC→aUSDC deposit wrap for wallet B / whitelist Circle faucet sender on Monad? Need ~1 aUSDC for live DvP fill demo (CLINV01 secondary market).

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 23:25

**AUTHOR**: Crypto Gk

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: How to get Monad aUSDC (short) Wallet must have CVI / A-Pass on Monad. Call query_deposit_address for that wallet → copy deposit address. Open https://faucet.circle.com → choose Monad testnet. Request USDC to the deposit address (not a random wallet). Your same wallet receives aUSDC.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 23:36

**AUTHOR**: .

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Pool 0x1860b3182CAd1813Ce0F992E446e87Fb0FD93417 uses AccessControl + Gnosis Safe 2-of-3 admin (no Ownable.owner()). Docs require owner_signature from owner() for /validator/register. Please either sandbox-register this pool for api-id APP20260614112550LIDZXM, or document the Safe/EIP-1271 owner_signature format for multisig admins.

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 00:12

**AUTHOR**: NFT KING 👑

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Launch AToken reverted on Monad Testnet with Solidity Panic(0x41): memory allocation error. Coven submitted the documented RuleV2 API payload. Please check the sandbox launcher contract/backend for tx 0xffee70cea88b73837e934b11bdcd33e45b86f85db0c1fb69b4dccca017f6af51.

**STATUS**: LEAD

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 00:16

**AUTHOR**: Ali Hammed

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Hi, I’m integrating the CCP Validator on Monad. I deployed a PrincipalRegistry and PrincipalVault, then called validator/grant successfully. Onchain, hasRole(keccak256("REGISTER_ROLE"), registry) returns true. But calling registerV2(vault, RuleV2) from the registry reverts inside the Validator implementation with no revert data during estimation. I tried both: - (0x0000, 0x0000, 0, 0, 0) - (0x0000, 0x0000, 1, 0, 0) The vault is Ownable and its owner is the verified principal wallet, while the registry holds REGISTER_ROLE. Does registerV2 require pool.owner() to equal the registrar/factory? Or is there another required pool relationship, RuleV2 value, or API-side registration step before a factory can register a pool?

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 01:45

**AUTHOR**: Ives

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Hi, ethereum Sepolia ISSUED + DualLock works. On UAT, atoken/launch on monad keeps ISSUE_FAILED , and wrapped + whitelist hits factory/ 12013 . Is that expected?

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

**DATE**: 01:46

**AUTHOR**: Stella Maris

**AUTHOR TYPE**: PARTICIPANT

**CLAIM**: Could you confirm the currently canonical Monad aUSDC address? Earlier today 0xaC0893567D43C3E7e6e35a72803df05416C1f20D worked end-to-end and minted 20 aUSDC. Now all /query_deposit_atoken_list filters return 0xfa96de5b8f434c26fdff953303dd66ff80af1026; the former address returns atoken not exist, while the new address returns ComplianceFailed from /verify_apass . A fresh Circle deposit to the correct deposit address was recorded as non_whitelist_refund. Was the Monad pair migrated, and is any configuration step still pending?

**STATUS**: UNVERIFIED

**ENGINEERING IMPACT**: Pending review

---

