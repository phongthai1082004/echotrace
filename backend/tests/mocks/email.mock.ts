/**
 * Email Service Mock
 * Simulates email sending functionality for unit tests
 */

export interface EmailSent {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export class EmailServiceMock {
  private sentEmails: EmailSent[] = [];
  private shouldFail = false;

  async sendOtpEmail(to: string, otp: string, userName?: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Failed to send OTP email');
    }

    this.sentEmails.push({
      to,
      subject: `Your OTP Code: ${otp}`,
      html: `<p>Hello ${userName || 'User'},</p><p>Your OTP code is: <strong>${otp}</strong></p><p>This code will expire in 10 minutes.</p>`,
    });
  }

  async sendPaymentConfirmation(
    to: string,
    orderCode: string,
    amount: number,
    userName?: string
  ): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Failed to send payment confirmation email');
    }

    this.sentEmails.push({
      to,
      subject: `Payment Confirmation - Order ${orderCode}`,
      html: `<p>Hello ${userName || 'User'},</p><p>Your payment of ${amount.toLocaleString()} VND has been confirmed for order ${orderCode}.</p>`,
    });
  }

  async sendReturnRequest(
    to: string,
    orderCode: string,
    reason: string,
    userName?: string
  ): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Failed to send return request email');
    }

    this.sentEmails.push({
      to,
      subject: `Return Request - Order ${orderCode}`,
      html: `<p>Hello ${userName || 'User'},</p><p>Your return request for order ${orderCode} has been received. Reason: ${reason}</p>`,
    });
  }

  async sendOrderShipped(
    to: string,
    orderCode: string,
    trackingNumber?: string,
    userName?: string
  ): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Failed to send order shipped email');
    }

    this.sentEmails.push({
      to,
      subject: `Order Shipped - ${orderCode}`,
      html: `<p>Hello ${userName || 'User'},</p><p>Your order ${orderCode} has been shipped${trackingNumber ? ` with tracking number ${trackingNumber}` : ''}.</p>`,
    });
  }

  // Test utilities
  getSentEmails(): EmailSent[] {
    return [...this.sentEmails];
  }

  getEmailsByRecipient(to: string): EmailSent[] {
    return this.sentEmails.filter((email) => email.to === to);
  }

  getLastEmail(): EmailSent | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  emailCount(): number {
    return this.sentEmails.length;
  }

  clear(): void {
    this.sentEmails = [];
  }

  setFailure(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  findEmailBySubject(subject: string): EmailSent | undefined {
    return this.sentEmails.find((email) => email.subject.includes(subject));
  }
}

export const createEmailServiceMock = (): EmailServiceMock => {
  return new EmailServiceMock();
};
