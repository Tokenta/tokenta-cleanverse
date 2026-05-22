export interface BuybackConfirmation {
  id: string;
  jobId: string;
  buybackOfferId: string;
  quantity: number;
  proofHash: string;
  orderId: string;
  escrowId: string;
  rotationDeadline: string;
  createdAt: string;
}

export class BuybackStore {
  private confirmations = new Map<string, BuybackConfirmation>();

  confirm(input: {
    jobId: string;
    buybackOfferId: string;
    quantity: number;
    proofHash: string;
  }): BuybackConfirmation {
    const id = `bb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record: BuybackConfirmation = {
      id,
      jobId: input.jobId,
      buybackOfferId: input.buybackOfferId,
      quantity: input.quantity,
      proofHash: input.proofHash,
      orderId: `ORD-BB-${id.slice(-8).toUpperCase()}`,
      escrowId: `ESC-BB-${id.slice(-8).toUpperCase()}`,
      rotationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.confirmations.set(id, record);
    return record;
  }

  getByJob(jobId: string): BuybackConfirmation | undefined {
    return [...this.confirmations.values()].find((c) => c.jobId === jobId);
  }
}

export const buybackStore = new BuybackStore();
