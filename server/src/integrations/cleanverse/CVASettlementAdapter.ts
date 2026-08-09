import { createPublicClient, http, encodeFunctionData, parseUnits } from 'viem';
import { monadTestnet } from 'viem/chains';
import { CleanverseClient } from './client.js';

export enum SettlementState {
  APPROVED = 'APPROVED',
  POLICY_DENIED = 'POLICY_DENIED',
  POLICY_ERROR = 'POLICY_ERROR',
  UPSTREAM_UNAVAILABLE = 'UPSTREAM_UNAVAILABLE',
  SETTLEMENT_FAILED = 'SETTLEMENT_FAILED'
}

export interface SettlementAuthorization {
  state: SettlementState;
  reason?: string;
}

export class CVASettlementAdapter {
  private cvClient: CleanverseClient;
  private publicClient: any;
  
  // The deployed Tokenta CVA
  public readonly CVA_ADDRESS = '0x2ecd60dc0fe611c60bd241f46943b2813abb243f';
  // The Cleanverse A-Token Policy Validator
  public readonly ATOKEN_POLICY = '0x36489be45fa84f70a0c2bdb11d824be608cb12dd';
  
  private CVA_ABI = [
    {
      "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
      "name": "balanceOf",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "address", "name": "to", "type": "address" },
        { "internalType": "uint256", "name": "amount", "type": "uint256" }
      ],
      "name": "transfer",
      "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];

  private POLICY_ABI = [
    {
      "inputs": [
        { "internalType": "address", "name": "token", "type": "address" },
        { "internalType": "address", "name": "from", "type": "address" },
        { "internalType": "address", "name": "to", "type": "address" },
        { "internalType": "uint256", "name": "amount", "type": "uint256" }
      ],
      "name": "canTransfer",
      "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  constructor() {
    this.cvClient = new CleanverseClient();
    this.publicClient = createPublicClient({ 
      chain: monadTestnet, 
      transport: http('https://testnet-rpc.monad.xyz') 
    });
  }

  /**
   * Retrieves the current balance of the wallet for the Tokenta CVA
   */
  async getAssetState(wallet: string): Promise<string> {
    try {
      const balance = await this.publicClient.readContract({
        address: this.CVA_ADDRESS,
        abi: this.CVA_ABI,
        functionName: 'balanceOf',
        args: [wallet]
      });
      return balance.toString();
    } catch (error) {
      console.error('Failed to get CVA asset state:', error);
      return '0';
    }
  }

  /**
   * Evaluates if a transfer is allowed between the buyer and seller.
   * This delegates to the Cleanverse A-Token Policy's canTransfer check.
   */
  async evaluateSettlement(from: string, to: string, amountStr: string): Promise<SettlementAuthorization> {
    try {
      // For on-chain verification, we simulate `canTransfer` on the A-Token policy
      // This enforces the rule directly as the CVA would during a real transaction.
      const amount = BigInt(amountStr);
      
      const allowed = await this.publicClient.readContract({
        address: this.ATOKEN_POLICY,
        abi: this.POLICY_ABI,
        functionName: 'canTransfer',
        args: [this.CVA_ADDRESS, from, to, amount]
      });

      if (allowed) {
        return { state: SettlementState.APPROVED };
      } else {
        return { state: SettlementState.POLICY_DENIED, reason: 'Cleanverse policy denied transfer' };
      }
    } catch (error: any) {
      const errMsg = error.shortMessage || error.message;
      
      // If RPC is down or network error
      if (errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('500') || errMsg.includes('RPC')) {
        return { state: SettlementState.UPSTREAM_UNAVAILABLE, reason: 'Monad RPC unavailable' };
      }

      // If it reverts, it's a policy denial (TokenNotRegistered, TransferNotAllowed, etc.)
      if (errMsg.includes('revert') || errMsg.includes('TransferNotAllowed') || errMsg.includes('TokenNotRegistered')) {
         return { state: SettlementState.POLICY_DENIED, reason: 'Cleanverse A-Token Policy rejected transfer' };
      }

      console.error('CVASettlementAdapter evaluateSettlement Error:', errMsg);
      return { state: SettlementState.POLICY_ERROR, reason: 'Unknown policy evaluation error' };
    }
  }

  /**
   * Constructs the raw transaction payload for the client (Metamask) to sign.
   * Does NOT execute the transaction.
   */
  prepareTransfer(to: string, amountStr: string) {
    const data = encodeFunctionData({
      abi: this.CVA_ABI,
      functionName: 'transfer',
      args: [to, BigInt(amountStr)]
    });

    return {
      to: this.CVA_ADDRESS,
      data,
      chainId: 10143
    };
  }

  /**
   * Verifies that the settlement transaction was successful on-chain.
   */
  async verifySettlement(txHash: `0x${string}`): Promise<SettlementState> {
    try {
      const receipt = await this.publicClient.getTransactionReceipt({ hash: txHash });
      
      if (receipt.status === 'success') {
        return SettlementState.APPROVED;
      } else {
        return SettlementState.SETTLEMENT_FAILED;
      }
    } catch (error) {
      console.error('Failed to verify settlement receipt:', error);
      return SettlementState.UPSTREAM_UNAVAILABLE;
    }
  }
}
