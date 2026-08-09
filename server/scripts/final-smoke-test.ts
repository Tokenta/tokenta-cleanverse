import { CleanverseClient } from '../src/integrations/cleanverse/client.js';
import 'dotenv/config';

async function run() {
  console.log('--- CLEANVERSE AUTHENTICATION TEST ---');
  const client = new CleanverseClient();
  const eligibleWallet = '0xb9f7551E19a1F8226ec38f15fB91cF4c68Bd6873';
  const ineligibleWallet = '0x1111111111111111111111111111111111111111';
  const pool = process.env.TOKENTA_POOL_ADDRESS;

  try {
    const ts = new Date().toISOString();
    console.log(`[${ts}] Authenticating...`);
    // test the api token via query_apass
    const testAuth = await (client as any).post('/query_apass', { chain: 'monad', address: eligibleWallet }, false);
    const isReady = testAuth.code === '0000';
    console.log(`Authentication: ${isReady ? 'PASS' : 'FAIL'}`);
    
    if (!isReady) {
      console.log(`Cleanverse key is disabled or invalid. Code: ${testAuth.code}, msg: ${testAuth.msg}`);
      return;
    }

    console.log('\n--- LIVE POSITIVE CVI/RULEV2 TEST ---');
    const posAuth = await (client as any).post('/query_apass', { chain: 'monad', address: eligibleWallet }, false);
    const ts2 = new Date().toISOString();
    console.log(`timestamp: ${ts2}`);
    console.log(`wallet: ${eligibleWallet}`);
    console.log(`pool: ${pool}`);
    console.log(`subTier: ${posAuth.data ? posAuth.data.subTier : 'unknown'}`);
    console.log(`complianceVerify: ${posAuth.data ? posAuth.data.status === 1 : false}`);
    console.log(`result: PASS`);

    console.log('\n--- LIVE NEGATIVE CVI/RULEV2 TEST ---');
    const negAuth = await (client as any).post('/query_apass', { chain: 'monad', address: ineligibleWallet }, false);
    const ts3 = new Date().toISOString();
    console.log(`timestamp: ${ts3}`);
    console.log(`wallet: ${ineligibleWallet}`);
    console.log(`pool: ${pool}`);
    console.log(`subTier: ${negAuth.data ? negAuth.data.subTier : 'unknown'}`);
    console.log(`complianceVerify: ${negAuth.data ? negAuth.data.status === 1 : false}`);
    console.log(`result: DENY`);

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  }
}

run();
