// Normalized identity compliance states for Tokenta
export enum IdentityComplianceState {
  UNKNOWN = 'UNKNOWN',
  CHECKING = 'CHECKING',
  VERIFIED = 'VERIFIED',
  UNVERIFIED = 'UNVERIFIED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
  UNAVAILABLE = 'UNAVAILABLE',
  ERROR = 'ERROR'
}

// Normalized asset compliance states for Tokenta
export enum AssetComplianceState {
  UNKNOWN = 'UNKNOWN',
  CHECKING = 'CHECKING',
  VERIFIED = 'VERIFIED',
  UNVERIFIED = 'UNVERIFIED',
  RESTRICTED = 'RESTRICTED',
  UNAVAILABLE = 'UNAVAILABLE',
  ERROR = 'ERROR'
}

// Normalized transaction/policy decisions
export enum PolicyDecision {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  UNAVAILABLE = 'UNAVAILABLE',
  ERROR = 'ERROR'
}

export enum TradeComplianceDecision {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  UNAVAILABLE = 'UNAVAILABLE',
  ERROR = 'ERROR'
}

export interface TradeComplianceResult {
  buyerIdentityStatus: IdentityComplianceState;
  sellerIdentityStatus: IdentityComplianceState;
  settlementAssetStatus: AssetComplianceState;
  policyDecision: PolicyDecision;
  travelRuleStatus?: string;
  evidenceReferences: string[];
  timestamp: string;
  overallDecision: TradeComplianceDecision;
  reasonCodes: string[];
}
