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
    this.baseUrl = process.env.CLEANVERSE_API_BASE_URL || '';
  }

  private checkConfig() {
    if (!this.apiId || !this.apiKey || !this.baseUrl) {
      throw new CleanverseNotConfiguredError();
    }
  }

  // --- CVI (A-Pass) Methods ---
  public async getWalletIdentityState(walletAddress: string): Promise<IdentityComplianceState> {
    this.checkConfig();
    throw new Error('Not implemented: Pending documentation mapping');
  }

  // --- CVA (A-Token) Methods ---
  public async getAssetComplianceState(contractAddress: string, chainId: number): Promise<AssetComplianceState> {
    this.checkConfig();
    throw new Error('Not implemented: Pending documentation mapping');
  }

  // --- CCP (Pre-transaction Policy) Methods ---
  public async evaluatePreTransactionPolicy(payload: any): Promise<PolicyDecision> {
    this.checkConfig();
    throw new Error('Not implemented: Pending documentation mapping');
  }
  
  // --- Travel Rule Methods ---
  public async processTravelRule(payload: any): Promise<string> {
    this.checkConfig();
    throw new Error('Not implemented: Pending documentation mapping');
  }
}
