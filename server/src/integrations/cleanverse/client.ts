import crypto from 'crypto';
import { IdentityComplianceState, AssetComplianceState, PolicyDecision } from './types';

export class CleanverseNotConfiguredError extends Error {
  constructor(message: string = 'Cleanverse API is not configured or unavailable.') {
    super(message);
    this.name = 'CleanverseNotConfiguredError';
  }
}

export class CleanverseClient {
  private apiId: string;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiId = process.env.CLEANVERSE_API_ID || '';
    this.apiKey = process.env.CLEANVERSE_API_KEY || '';
    this.baseUrl = process.env.CLEANVERSE_API_BASE_URL || 'https://uatapi.cleanverse.com/api/cooperate';
  }

  private checkConfig() {
    if (!this.apiId || !this.apiKey || !this.baseUrl) {
      throw new CleanverseNotConfiguredError();
    }
  }

  private encryptPayload(payload: any): string {
    const jsonStr = JSON.stringify(payload);
    const key = Buffer.from(this.apiKey, 'base64');
    const iv = Buffer.alloc(16, 0); // 16 zero bytes
    
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(jsonStr, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  }

  private decryptPayload(encryptedBase64: string): any {
    const key = Buffer.from(this.apiKey, 'base64');
    const iv = Buffer.alloc(16, 0);
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }

  private async post(endpoint: string, payload: any, encrypt: boolean = true): Promise<any> {
    this.checkConfig();
    const url = `${this.baseUrl}${endpoint}`;
    
    const body = encrypt ? { data: this.encryptPayload(payload) } : payload;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-id': this.apiId
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    // Some endpoints may return encrypted responses in `data` string
    if (data.code === '0000' && typeof data.data === 'string' && encrypt && data.data !== '{}' && data.data !== '') {
      try {
        data.data = this.decryptPayload(data.data);
      } catch (e) {
        // If decryption fails or data was actually just a string, ignore
      }
    }

    return data;
  }

  public async generateAPass(payload: any) {
    return this.post('/generate_apass', payload, true);
  }

  // --- CVI (A-Pass) Methods ---
  public async getWalletIdentityState(walletAddress: string, chain: string = 'monad'): Promise<IdentityComplianceState> {
    try {
      const payload = { chain, address: walletAddress };
      const response = await this.post('/query_apass', payload, false); // Not encrypted

      if (response.code !== '0000' || !response.data) {
        return IdentityComplianceState.UNVERIFIED;
      }

      const data = response.data;
      if (data.status === 2) {
        return IdentityComplianceState.SUSPENDED;
      }

      if (data.expirationTime && data.expirationTime * 1000 < Date.now()) {
        return IdentityComplianceState.EXPIRED;
      }

      return IdentityComplianceState.VERIFIED;
    } catch (e) {
      console.error('Cleanverse CVI Error:', e);
      return IdentityComplianceState.UNAVAILABLE;
    }
  }

  // --- CCP (Pre-transaction Policy) Methods ---
  public async evaluatePreTransactionPolicy(userAddress: string, contractAddress: string, chain: string = 'monad'): Promise<PolicyDecision> {
    try {
      this.checkConfig();
      const payload = { chain, contract_address: contractAddress, user_address: userAddress };
      const response = await this.post('/validator/verify', payload, false); // Not encrypted
      console.log(`CCP verify response for ${userAddress} at ${contractAddress}:`, response);

      if (response.code !== '0000' || !response.data) {
        return PolicyDecision.ERROR;
      }

      return response.data.valid ? PolicyDecision.APPROVED : PolicyDecision.DENIED;
    } catch (e) {
      console.error('Cleanverse CCP Error:', e);
      return PolicyDecision.UNAVAILABLE;
    }
  }

  // --- Validator / RuleV2 Methods ---
  public async validatorRegister(contractAddress: string, chain: string, ownerSignature: string, rule: any): Promise<any> {
    return this.post('/validator/register', {
      chain,
      contract_address: contractAddress,
      owner_signature: ownerSignature,
      rule
    }, true);
  }

  public async validatorGrant(contractAddress: string, chain: string, ownerSignature: string): Promise<any> {
    return this.post('/validator/grant', {
      chain,
      address: contractAddress,
      owner_signature: ownerSignature
    }, true);
  }

  public async validatorSetRule(contractAddress: string, chain: string, rule: any): Promise<any> {
    return this.post('/validator/set_rule', {
      chain,
      contract_address: contractAddress,
      rule
    }, true);
  }

  public async queryRules(contractAddress: string, chain: string): Promise<any> {
    return this.post('/validator/rules', {
      chain,
      contract_address: contractAddress
    }, false);
  }

  // --- CVA Methods ---
  public async queryDepositATokenList(chain: string): Promise<any> {
    return this.post('/query_deposit_atoken_list', { chain }, false);
  }
  
  // --- Travel Rule Methods ---
  public async processTravelRule(payload: any): Promise<string> {
    this.checkConfig();
    throw new Error('Not implemented: Pending documentation mapping');
  }
}
