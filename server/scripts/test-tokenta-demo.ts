import { createWalletClient, createPublicClient, http, getContract, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet } from 'viem/chains';
import { CVASettlementAdapter, SettlementState } from '../src/integrations/cleanverse/CVASettlementAdapter.js';
import 'dotenv/config';
import fs from 'fs';

async function run() {
  const pk = process.env.TOKENTA_ADMIN_PK;
  if (!pk) throw new Error("Missing PK");

  const account = privateKeyToAccount(`0x${pk}`);
  const client = createWalletClient({ account, chain: monadTestnet, transport: http('https://testnet-rpc.monad.xyz') });
  const publicClient = createPublicClient({ chain: monadTestnet, transport: http('https://testnet-rpc.monad.xyz') });

  const cvaAdapter = new CVASettlementAdapter();

  const buyerWallet = account.address;
  const eligibleSeller = '0xb9f7551E19a1F8226ec38f15fB91cF4c68Bd6873';
  const ineligibleSeller = '0x1111111111111111111111111111111111111111';

  console.log('==================================================');
  console.log('  SCENARIO 1: APPROVED TOKENTA SETTLEMENT');
  console.log('==================================================');
  console.log(`[1] AI asset verified.`);
  console.log(`[2] Evaluating Trade (Buyer -> Eligible Seller)`);
  
  const auth1 = await cvaAdapter.evaluateSettlement(buyerWallet, eligibleSeller, parseUnits('1', 6).toString());
  
  if (auth1.state === SettlementState.APPROVED) {
    console.log(`[3] Cleanverse Policy: APPROVED`);
    const preparedTransfer = cvaAdapter.prepareTransfer(eligibleSeller, parseUnits('1', 6).toString());
    console.log(`[4] User signs transaction on client...`);
    
    // Execute on-chain as the client would
    try {
      const txHash = await client.sendTransaction({
        to: preparedTransfer.to,
        data: preparedTransfer.data,
        chain: monadTestnet
      });
      console.log(`[5] Transaction broadcasted: ${txHash}`);
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      const finalState = await cvaAdapter.verifySettlement(receipt.transactionHash);
      console.log(`[6] Tokenta Settlement: ${finalState}`);
    } catch (e: any) {
      console.error(`Error executing transfer: ${e.message}`);
    }
  } else {
    console.error(`Unexpected state: ${auth1.state} - ${auth1.reason}`);
  }

  console.log('\n==================================================');
  console.log('  SCENARIO 2: DENIED TOKENTA SETTLEMENT');
  console.log('==================================================');
  console.log(`[1] AI asset verified.`);
  console.log(`[2] Evaluating Trade (Buyer -> Ineligible Seller)`);

  const auth2 = await cvaAdapter.evaluateSettlement(buyerWallet, ineligibleSeller, parseUnits('1', 6).toString());
  
  if (auth2.state !== SettlementState.APPROVED) {
    console.log(`[3] Cleanverse Policy: ${auth2.state} - ${auth2.reason}`);
    console.log(`[4] Settlement BLOCKED. No CVA value moved.`);
  } else {
    console.error(`Unexpected state: APPROVED for ineligible seller!`);
  }
}

run();
