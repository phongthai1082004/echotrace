/**
 * PayOS Mock Implementation
 * Simulates PayOS payment gateway for unit tests
 */

export class PayOSMock {
  private paymentLinks: Map<
    string,
    {
      orderCode: number;
      amount: number;
      description: string;
      returnUrl: string;
      cancelUrl: string;
      checkoutUrl: string;
      status: 'PENDING' | 'PAID' | 'CANCELLED' | 'FAILED';
      transactions: Array<{
        id: string;
        amount: number;
        status: 'SUCCESS' | 'FAILED' | 'PENDING';
        createdAt: Date;
      }>;
    }
  > = new Map();

  private failureMode: 'NONE' | 'CREATE_FAIL' | 'WEBHOOK_INVALID_SIGNATURE' = 'NONE';

  async createPaymentLink(data: {
    orderCode: number;
    amount: number;
    description: string;
    returnUrl: string;
    cancelUrl: string;
    buyerName?: string;
    buyerEmail?: string;
    buyerPhone?: string;
  }): Promise<{ checkoutUrl: string; paymentLinkId: string }> {
    if (this.failureMode === 'CREATE_FAIL') {
      throw new Error('Failed to create payment link');
    }

    const linkId = `pl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const checkoutUrl = `https://test.payos.vn/checkout/${linkId}`;

    this.paymentLinks.set(linkId, {
      orderCode: data.orderCode,
      amount: data.amount,
      description: data.description,
      returnUrl: data.returnUrl,
      cancelUrl: data.cancelUrl,
      checkoutUrl,
      status: 'PENDING',
      transactions: [],
    });

    return {
      checkoutUrl,
      paymentLinkId: linkId,
    };
  }

  async getPaymentLinkInfo(paymentLinkId: string): Promise<{
    id: string;
    status: 'PENDING' | 'PAID' | 'CANCELLED' | 'FAILED';
    transactions: Array<{
      id: string;
      amount: number;
      status: 'SUCCESS' | 'FAILED' | 'PENDING';
    }>;
  }> {
    const link = this.paymentLinks.get(paymentLinkId);
    if (!link) {
      throw new Error('Payment link not found');
    }

    return {
      id: paymentLinkId,
      status: link.status,
      transactions: link.transactions.map((t) => ({
        id: t.id,
        amount: t.amount,
        status: t.status,
      })),
    };
  }

  async cancelPaymentLink(paymentLinkId: string): Promise<{ cancelled: boolean }> {
    const link = this.paymentLinks.get(paymentLinkId);
    if (!link) {
      throw new Error('Payment link not found');
    }

    link.status = 'CANCELLED';
    return { cancelled: true };
  }

  async refundPayment(paymentLinkId: string): Promise<{ refunded: boolean }> {
    const link = this.paymentLinks.get(paymentLinkId);
    if (!link) {
      throw new Error('Payment link not found');
    }

    if (link.status !== 'PAID') {
      throw new Error('Cannot refund payment that is not in PAID status');
    }

    link.status = 'CANCELLED';
    return { refunded: true };
  }

  // Webhook utilities
  verifyWebhookSignature(body: string, signature: string, checksumKey: string): boolean {
    if (this.failureMode === 'WEBHOOK_INVALID_SIGNATURE') {
      return false;
    }
    // Mock verification logic - in real implementation, this would validate HMAC
    return true;
  }

  createWebhookSignature(data: object, checksumKey: string): string {
    // Mock signature - in real implementation, this would generate HMAC
    return `sig_${Date.now()}`;
  }

  // Test utilities
  simulatePayment(paymentLinkId: string, amount: number, status: 'SUCCESS' | 'FAILED' = 'SUCCESS'): void {
    const link = this.paymentLinks.get(paymentLinkId);
    if (!link) {
      throw new Error('Payment link not found');
    }

    const transaction = {
      id: `txn_${Date.now()}`,
      amount,
      status,
      createdAt: new Date(),
    };

    link.transactions.push(transaction);

    if (status === 'SUCCESS' && amount === link.amount) {
      link.status = 'PAID';
    }
  }

  simulatePartialPayment(paymentLinkId: string, amount: number): void {
    const link = this.paymentLinks.get(paymentLinkId);
    if (!link) {
      throw new Error('Payment link not found');
    }

    link.transactions.push({
      id: `txn_${Date.now()}`,
      amount,
      status: 'SUCCESS',
      createdAt: new Date(),
    });

    if (amount < link.amount) {
      link.status = 'PAID'; // Mark as PAID even if partial (test scenario)
    }
  }

  setFailureMode(mode: 'NONE' | 'CREATE_FAIL' | 'WEBHOOK_INVALID_SIGNATURE'): void {
    this.failureMode = mode;
  }

  clear(): void {
    this.paymentLinks.clear();
  }

  getLink(paymentLinkId: string) {
    return this.paymentLinks.get(paymentLinkId);
  }
}

export const createPayOSMock = (): PayOSMock => {
  return new PayOSMock();
};
