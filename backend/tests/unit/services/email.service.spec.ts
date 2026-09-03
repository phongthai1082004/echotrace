/**
 * Email Service (Mailer) - Comprehensive Unit Tests
 *
 * Methodology: EP (Equivalence Partitioning), Validation Testing
 *
 * Test Coverage:
 * 1. OTP Email: sendOtpEmail with valid email + OTP
 * 2. API Key Handling: With RESEND_API_KEY, without key
 * 3. HTTP Response Handling: Success (2xx), Error (4xx/5xx)
 * 4. Logging: Console output for debugging
 * 5. Validation: Email format, OTP format
 * 6. Edge Cases: Null/empty values, API errors
 *
 * Total Tests: 25
 */

import { sendOtpEmail } from '../../../lib/mailer.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('Email Service (Mailer) - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    delete process.env.RESEND_API_KEY;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==================== 1. OTP EMAIL SENDING ====================
  describe('1. EP: Send OTP Email', () => {
    test('EP: Valid email + OTP with API key → fetch POST to Resend', async () => {
      process.env.RESEND_API_KEY = 'test-api-key-123';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(''),
      });

      await sendOtpEmail('user@example.com', '123456');

      expect(global.fetch).toHaveBeenCalledWith('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-api-key-123',
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('user@example.com'),
      });
    });

    test('EP: OTP code displayed in email HTML template', async () => {
      process.env.RESEND_API_KEY = 'key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      await sendOtpEmail('test@mail.com', 'ABC123');

      const callBody = (global.fetch as jest.Mock).mock.calls[0][1].body;
      expect(callBody).toContain('ABC123');
      expect(callBody).toContain('Cabinet Memoir');
    });

    test('EP: Multiple OTP sends with different codes', async () => {
      process.env.RESEND_API_KEY = 'key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      await sendOtpEmail('user1@mail.com', 'OTP001');
      await sendOtpEmail('user2@mail.com', 'OTP002');

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  // ==================== 2. API KEY VALIDATION ====================
  describe('2. EP: API Key Handling', () => {
    test('EP: No API key set → console.log message, no fetch call', async () => {
      delete process.env.RESEND_API_KEY;

      await sendOtpEmail('user@mail.com', '123456');

      expect(global.fetch).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('RESEND_API_KEY'));
    });

    test('EP: Empty API key → console.log message, no fetch', async () => {
      process.env.RESEND_API_KEY = '';

      await sendOtpEmail('user@mail.com', '123456');

      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('EP: Valid API key present → fetch called', async () => {
      process.env.RESEND_API_KEY = 'valid-key-xyz';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      await sendOtpEmail('user@mail.com', '123456');

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  // ==================== 3. HTTP RESPONSE HANDLING ====================
  describe('3. EP: HTTP Response Status Handling', () => {
    test('EP: Response ok (200) → logs success', async () => {
      process.env.RESEND_API_KEY = 'key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(''),
      });

      await sendOtpEmail('user@mail.com', '123456');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Sent via Resend'));
    });

    test('EP: Response not ok (400) → logs error', async () => {
      process.env.RESEND_API_KEY = 'key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Invalid recipient'),
      });

      await sendOtpEmail('user@mail.com', '123456');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Resend failed'));
    });

    test('EP: Response 500 → logs server error', async () => {
      process.env.RESEND_API_KEY = 'key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal server error'),
      });

      await sendOtpEmail('user@mail.com', '123456');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Resend failed'));
    });
  });

  // ==================== 4. EMAIL VALIDATION ====================
  describe('4. Validation: Email Formats', () => {
    test('Validation: Standard email format → accepted', async () => {
      process.env.RESEND_API_KEY = 'key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      await sendOtpEmail('john.doe@company.co.uk', '123456');

      const callBody = (global.fetch as jest.Mock).mock.calls[0][1].body;
      expect(callBody).toContain('john.doe@company.co.uk');
    });

    test('Validation: Email with plus sign → accepted', async () => {
      process.env.RESEND_API_KEY = 'key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      await sendOtpEmail('user+tag@example.com', '123456');

      const callBody = (global.fetch as jest.Mock).mock.calls[0][1].body;
      expect(callBody).toContain('user+tag@example.com');
    });

    test('Validation: Uppercase email → sent as-is', async () => {
      process.env.RESEND_API_KEY = 'key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      await sendOtpEmail('USER@EXAMPLE.COM', '123456');

      const callBody = (global.fetch as jest.Mock).mock.calls[0][1].body;
      expect(callBody).toContain('USER@EXAMPLE.COM');
    });
  });

  // ==================== 5. OTP VALIDATION ====================
  describe('5. Validation: OTP Formats', () => {
    test('Validation: 6-digit numeric OTP → accepted', async () => {
      process.env.RESEND_API_KEY = 'key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      await sendOtpEmail('user@mail.com', '123456');

      const callBody = (global.fetch as jest.Mock).mock.calls[0][1].body;
      expect(callBody).toContain('123456');
    });

    test('Validation: Alphanumeric OTP → accepted', async () => {
      process.env.RESEND_API_KEY = 'key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      await sendOtpEmail('user@mail.com', 'ABC123');

      const callBody = (global.fetch as jest.Mock).mock.calls[0][1].body;
      expect(callBody).toContain('ABC123');
    });

    test('Validation: OTP with special characters → accepted', async () => {
      process.env.RESEND_API_KEY = 'key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      await sendOtpEmail('user@mail.com', 'X-Y-Z-1-2-3');

      const callBody = (global.fetch as jest.Mock).mock.calls[0][1].body;
      expect(callBody).toContain('X-Y-Z-1-2-3');
    });
  });

  // ==================== 6. LOGGING OUTPUT ====================
  describe('6. EP: Logging & Console Output', () => {
    test('EP: Console logs OTP before sending', async () => {
      process.env.RESEND_API_KEY = 'key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      await sendOtpEmail('user@mail.com', 'OTP123');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('OTP123'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('user@mail.com'));
    });

    test('EP: Console logs expiry time (24 hours)', async () => {
      process.env.RESEND_API_KEY = 'key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      await sendOtpEmail('user@mail.com', '123456');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('24 hours'));
    });

    test('EP: All logs include separator line', async () => {
      await sendOtpEmail('user@mail.com', '123456');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('═════════════'));
    });
  });

  // ==================== 7. EDGE CASES ====================
  describe('7. Edge Cases', () => {
    test('Edge: Very long email address → accepted', async () => {
      process.env.RESEND_API_KEY = 'key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      const longEmail = 'verylongemailaddressname@subdomain.example.co.uk';
      await sendOtpEmail(longEmail, '123456');

      const callBody = (global.fetch as jest.Mock).mock.calls[0][1].body;
      expect(callBody).toContain(longEmail);
    });

    test('Edge: Very long OTP code → accepted', async () => {
      process.env.RESEND_API_KEY = 'key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      const longOtp = 'VERYLONGOTPCODE1234567890ABCDEFGHIJKLMNOP';
      await sendOtpEmail('user@mail.com', longOtp);

      const callBody = (global.fetch as jest.Mock).mock.calls[0][1].body;
      expect(callBody).toContain(longOtp);
    });

    test('Edge: Concurrent OTP sends to same email', async () => {
      process.env.RESEND_API_KEY = 'key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      await Promise.all([
        sendOtpEmail('user@mail.com', 'OTP001'),
        sendOtpEmail('user@mail.com', 'OTP002'),
        sendOtpEmail('user@mail.com', 'OTP003'),
      ]);

      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    test('Edge: API key changes between calls', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      process.env.RESEND_API_KEY = 'key-1';
      await sendOtpEmail('user1@mail.com', 'OTP1');

      process.env.RESEND_API_KEY = 'key-2';
      await sendOtpEmail('user2@mail.com', 'OTP2');

      expect(global.fetch).toHaveBeenCalledTimes(2);
      const call1 = (global.fetch as jest.Mock).mock.calls[0];
      const call2 = (global.fetch as jest.Mock).mock.calls[1];
      expect(call1[1].headers.Authorization).toContain('key-1');
      expect(call2[1].headers.Authorization).toContain('key-2');
    });
  });

  // ==================== 8. PAYLOAD STRUCTURE ====================
  describe('8. EP: Resend API Payload Structure', () => {
    test('EP: Payload includes all required fields (from, to, subject, html)', async () => {
      process.env.RESEND_API_KEY = 'key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      await sendOtpEmail('user@mail.com', '123456');

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody).toHaveProperty('from');
      expect(callBody).toHaveProperty('to');
      expect(callBody).toHaveProperty('subject');
      expect(callBody).toHaveProperty('html');
    });

    test('EP: From address is noreply@cabinetmemoir.app', async () => {
      process.env.RESEND_API_KEY = 'key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      await sendOtpEmail('user@mail.com', '123456');

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.from).toBe('Cabinet Memoir <noreply@cabinetmemoir.app>');
    });

    test('EP: Subject includes "OTP Code" text', async () => {
      process.env.RESEND_API_KEY = 'key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      await sendOtpEmail('user@mail.com', '123456');

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.subject).toContain('OTP');
    });

    test('EP: HTML includes proper formatting (bold, colors)', async () => {
      process.env.RESEND_API_KEY = 'key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      await sendOtpEmail('user@mail.com', '123456');

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.html).toContain('<html>');
      expect(callBody.html).toContain('#FFF7D6'); // Background color
      expect(callBody.html).toContain('123456'); // OTP
    });
  });
});
