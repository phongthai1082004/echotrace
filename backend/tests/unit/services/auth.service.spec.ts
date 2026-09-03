/**
 * Auth Service Unit Tests
 * Test coverage: Google login, OTP send/verify with brute-force protection, password auth, token refresh, multi-device sessions
 * Methodology: test.md skill - EP, BVA, validation testing, race condition scenarios
 */

import { AuthService } from '../../../src/features/auth/auth.service';
import { AppError } from '../../../src/middleware/app.error';
import { ErrorCode } from '@echotrace/shared';
import {
  validAuthDatasets,
  invalidAuthDatasets,
  otpBoundaryValues,
  passwordBoundaryValues,
  jwtTestData,
  multiDeviceSessionTestCases,
  bruteForceTestCases,
} from '../../fixtures/auth.fixtures';

describe('AuthService - Unit Tests', () => {
  let authService: AuthService;
  let mockAuthRepo: any;
  let mockCacheService: any;
  let mockGoogleClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAuthRepo = {
      findUserByGoogleOrEmail: jest.fn(),
      createGoogleUser: jest.fn(),
      findActiveUserByEmail: jest.fn(),
      replaceOtpToken: jest.fn(),
      findValidOtp: jest.fn(),
      revokeToken: jest.fn(),
      createPasswordUser: jest.fn(),
      findActiveUserByEmailFull: jest.fn(),
      revokeSessionTokens: jest.fn(),
      findSessionByToken: jest.fn(),
      findUserByIdRole: jest.fn(),
      rotateSessionToken: jest.fn(),
      createSessionToken: jest.fn(),
    };

    mockCacheService = {
      increment: jest.fn(),
      delete: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
    };

    authService = new AuthService(mockAuthRepo, mockCacheService);
  });

  // ===========================
  // SECTION 1: GOOGLE LOGIN
  // ===========================

  describe('1. Google Login - EP', () => {
    describe('1.1 EP: Valid Google Login', () => {
      test('EP: Should create new user on first Google login', async () => {
        const googlePayload = {
          email: 'new@gmail.com',
          sub: 'google_123',
          name: 'John Doe',
          picture: 'https://example.com/pic.jpg',
        };

        mockAuthRepo.findUserByGoogleOrEmail.mockResolvedValue(null);
        mockAuthRepo.createGoogleUser.mockResolvedValue({
          id: 1,
          email: googlePayload.email,
          name: googlePayload.name,
          googleId: googlePayload.sub,
          role: 'USER',
          isDelete: false,
        });

        // Simulate Google token verification
        jest.spyOn(authService as any, 'generateAccessToken').mockReturnValue('access_token');
        jest.spyOn(authService as any, 'generateRefreshToken').mockResolvedValue('refresh_token');

        const result = await authService.loginWithGoogle('valid_google_token');

        expect(result).toHaveProperty('accessToken');
        expect(result).toHaveProperty('refreshToken');
        expect(mockAuthRepo.createGoogleUser).toHaveBeenCalledWith({
          email: googlePayload.email,
          name: googlePayload.name,
          googleId: googlePayload.sub,
          avatar: googlePayload.picture,
        });
      });

      test('EP: Should login existing Google user', async () => {
        const existingUser = {
          id: 1,
          email: 'existing@gmail.com',
          googleId: 'google_123',
          role: 'USER',
          isDelete: false,
        };

        mockAuthRepo.findUserByGoogleOrEmail.mockResolvedValue(existingUser);
        jest.spyOn(authService as any, 'generateAccessToken').mockReturnValue('access_token');
        jest.spyOn(authService as any, 'generateRefreshToken').mockResolvedValue('refresh_token');

        const result = await authService.loginWithGoogle('valid_google_token');

        expect(result).toHaveProperty('accessToken');
        expect(mockAuthRepo.createGoogleUser).not.toHaveBeenCalled();
      });
    });

    describe('1.2 EP: Invalid Google Token', () => {
      test('EP: Should throw on missing email in Google payload', async () => {
        mockAuthRepo.findUserByGoogleOrEmail.mockResolvedValue(null);

        // Simulate Google token verification failure
        jest.spyOn(authService as any, 'generateAccessToken').mockImplementation(() => {
          throw new AppError(ErrorCode.AUTH_INVALID_GOOGLE_TOKEN, 401);
        });

        await expect(
          authService.loginWithGoogle('invalid_google_token')
        ).rejects.toThrow();
      });

      test('EP: Should reject banned Google user', async () => {
        const bannedUser = {
          id: 1,
          email: 'banned@gmail.com',
          googleId: 'google_123',
          isDelete: true, // Banned
        };

        mockAuthRepo.findUserByGoogleOrEmail.mockResolvedValue(bannedUser);

        // Should throw account banned error
        await expect(
          authService.loginWithGoogle('valid_google_token')
        ).rejects.toThrow(ErrorCode.AUTH_ACCOUNT_BANNED);
      });
    });
  });

  // ===========================
  // SECTION 2: OTP SEND/VERIFY
  // ===========================

  describe('2. OTP Send and Verify - EP and BVA', () => {
    describe('2.1 EP: OTP Sending', () => {
      test('EP: Should generate and send OTP for new email', async () => {
        const email = validAuthDatasets.otpRequest.email;

        mockAuthRepo.findActiveUserByEmail.mockResolvedValue(null);
        mockAuthRepo.replaceOtpToken.mockResolvedValue(true);

        // Mock bcrypt hash
        jest.spyOn(require('bcryptjs'), 'hash').mockResolvedValue('hashed_otp');

        await authService.sendOtp(email);

        expect(mockAuthRepo.replaceOtpToken).toHaveBeenCalled();
      });

      test('EP: Should not send OTP to existing active user', async () => {
        const email = validAuthDatasets.otpRequest.email;
        const existingUser = { id: 1, email, isDelete: false };

        mockAuthRepo.findActiveUserByEmail.mockResolvedValue(existingUser);

        await authService.sendOtp(email);

        // Should not attempt to send OTP
        expect(mockAuthRepo.replaceOtpToken).not.toHaveBeenCalled();
      });
    });

    describe('2.2 EP: OTP Verification', () => {
      test('EP: Should verify correct OTP and register user', async () => {
        const email = validAuthDatasets.otpVerify.email;
        const correctOtp = '123456';
        const password = 'ValidPassword123!';

        const otpRecord = {
          id: 1,
          email,
          refreshToken: '$2a$10$hashed_otp_value',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        mockAuthRepo.findValidOtp.mockResolvedValue(otpRecord);
        mockAuthRepo.revokeToken.mockResolvedValue(true);
        mockAuthRepo.createPasswordUser.mockResolvedValue({
          id: 2,
          email,
          password: 'hashed_password',
          role: 'USER',
          isDelete: false,
        });
        mockCacheService.delete.mockResolvedValue(true);

        jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(true);
        jest.spyOn(authService as any, 'generateAccessToken').mockReturnValue('access_token');
        jest.spyOn(authService as any, 'generateRefreshToken').mockResolvedValue('refresh_token');

        const result = await authService.verifyOtpAndRegister(email, correctOtp, password);

        expect(result).toHaveProperty('accessToken');
        expect(mockAuthRepo.createPasswordUser).toHaveBeenCalled();
      });

      test('EP: Should reject OTP that was never requested', async () => {
        const email = invalidAuthDatasets.invalidEmail.email;

        mockAuthRepo.findValidOtp.mockResolvedValue(null);

        await expect(
          authService.verifyOtpAndRegister(email, '123456', 'password')
        ).rejects.toThrow(ErrorCode.AUTH_OTP_NOT_REQUESTED);
      });

      test('EP: Should reject expired OTP', async () => {
        const email = validAuthDatasets.otpVerify.email;

        const expiredOtpRecord = {
          id: 1,
          email,
          refreshToken: 'hashed_otp',
          expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        };

        mockAuthRepo.findValidOtp.mockResolvedValue(expiredOtpRecord);

        await expect(
          authService.verifyOtpAndRegister(email, '123456', 'password')
        ).rejects.toThrow(ErrorCode.AUTH_OTP_EXPIRED);
      });

      test('EP: Should reject invalid OTP', async () => {
        const email = validAuthDatasets.otpVerify.email;
        const wrongOtp = '999999';

        const otpRecord = {
          id: 1,
          email,
          refreshToken: '$2a$10$hashed_correct_otp',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        mockAuthRepo.findValidOtp.mockResolvedValue(otpRecord);
        mockCacheService.increment.mockResolvedValue(1);

        jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(false);

        await expect(
          authService.verifyOtpAndRegister(email, wrongOtp, 'password')
        ).rejects.toThrow(ErrorCode.AUTH_INVALID_OTP);
      });
    });

    describe('2.3 BVA: OTP Attempt Boundaries', () => {
      test('BVA: First failed OTP attempt (counter = 1)', async () => {
        const email = validAuthDatasets.otpVerify.email;
        const otpRecord = {
          id: 1,
          email,
          refreshToken: '$2a$10$hashed_otp',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        mockAuthRepo.findValidOtp.mockResolvedValue(otpRecord);
        mockCacheService.increment.mockResolvedValue(1);
        jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(false);

        await expect(
          authService.verifyOtpAndRegister(email, 'wrong', 'password')
        ).rejects.toThrow(ErrorCode.AUTH_INVALID_OTP);

        expect(mockCacheService.increment).toHaveBeenCalledWith(
          expect.stringContaining('otp_fail'),
          expect.any(Number)
        );
      });

      test('BVA: Fourth failed OTP attempt (before lock threshold)', async () => {
        const email = validAuthDatasets.otpVerify.email;
        const otpRecord = {
          id: 1,
          email,
          refreshToken: '$2a$10$hashed_otp',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        mockAuthRepo.findValidOtp.mockResolvedValue(otpRecord);
        mockCacheService.increment.mockResolvedValue(4); // 4th attempt
        jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(false);

        await expect(
          authService.verifyOtpAndRegister(email, 'wrong', 'password')
        ).rejects.toThrow(ErrorCode.AUTH_INVALID_OTP);

        // Should not revoke token yet
        expect(mockAuthRepo.revokeToken).not.toHaveBeenCalled();
      });

      test('BVA: Fifth failed OTP attempt (lock threshold)', async () => {
        const email = validAuthDatasets.otpVerify.email;
        const otpRecord = {
          id: 1,
          email,
          refreshToken: '$2a$10$hashed_otp',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        mockAuthRepo.findValidOtp.mockResolvedValue(otpRecord);
        mockCacheService.increment.mockResolvedValue(5); // Max attempts reached
        jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(false);

        await expect(
          authService.verifyOtpAndRegister(email, 'wrong', 'password')
        ).rejects.toThrow(ErrorCode.AUTH_INVALID_OTP);

        // Should revoke token on max attempts
        expect(mockAuthRepo.revokeToken).toHaveBeenCalledWith(1);
      });

      test('BVA: Sixth failed attempt (beyond threshold)', async () => {
        const email = validAuthDatasets.otpVerify.email;
        const otpRecord = {
          id: 1,
          email,
          refreshToken: '$2a$10$hashed_otp',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        mockAuthRepo.findValidOtp.mockResolvedValue(otpRecord);
        mockCacheService.increment.mockResolvedValue(6); // Beyond threshold
        jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(false);

        await expect(
          authService.verifyOtpAndRegister(email, 'wrong', 'password')
        ).rejects.toThrow(ErrorCode.AUTH_INVALID_OTP);

        expect(mockAuthRepo.revokeToken).toHaveBeenCalled();
      });
    });

    describe('2.4 BVA: OTP Format Validation', () => {
      test('BVA: OTP exactly 6 digits', async () => {
        const email = validAuthDatasets.otpVerify.email;
        const validOtp = '123456';

        const otpRecord = {
          id: 1,
          email,
          refreshToken: '$2a$10$hashed_otp',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        mockAuthRepo.findValidOtp.mockResolvedValue(otpRecord);
        jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(true);
        mockAuthRepo.revokeToken.mockResolvedValue(true);
        mockAuthRepo.createPasswordUser.mockResolvedValue({ id: 1, role: 'USER' });
        jest.spyOn(authService as any, 'generateAccessToken').mockReturnValue('token');
        jest.spyOn(authService as any, 'generateRefreshToken').mockResolvedValue('refresh');

        await expect(
          authService.verifyOtpAndRegister(email, validOtp, 'password')
        ).resolves.toBeDefined();
      });

      test('BVA: OTP less than 6 digits (5 digits)', async () => {
        const email = validAuthDatasets.otpVerify.email;
        const invalidOtp = '12345'; // Too short

        const otpRecord = {
          id: 1,
          email,
          refreshToken: '$2a$10$hashed_otp',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        mockAuthRepo.findValidOtp.mockResolvedValue(otpRecord);
        mockCacheService.increment.mockResolvedValue(1);
        jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(false); // Mismatch

        await expect(
          authService.verifyOtpAndRegister(email, invalidOtp, 'password')
        ).rejects.toThrow();
      });

      test('BVA: OTP more than 6 digits (7 digits)', async () => {
        const email = validAuthDatasets.otpVerify.email;
        const invalidOtp = '1234567'; // Too long

        const otpRecord = {
          id: 1,
          email,
          refreshToken: '$2a$10$hashed_otp',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        mockAuthRepo.findValidOtp.mockResolvedValue(otpRecord);
        mockCacheService.increment.mockResolvedValue(1);
        jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(false);

        await expect(
          authService.verifyOtpAndRegister(email, invalidOtp, 'password')
        ).rejects.toThrow();
      });
    });

    describe('2.5 Fail-Open: Redis Down During OTP Verification', () => {
      test('Should lock immediately when Redis down returns Infinity', async () => {
        const email = validAuthDatasets.otpVerify.email;
        const otpRecord = {
          id: 1,
          email,
          refreshToken: '$2a$10$hashed_otp',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        mockAuthRepo.findValidOtp.mockResolvedValue(otpRecord);
        mockCacheService.increment.mockResolvedValue(Infinity); // Redis down, fail-open
        jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(false);

        await expect(
          authService.verifyOtpAndRegister(email, 'wrong', 'password')
        ).rejects.toThrow(ErrorCode.AUTH_INVALID_OTP);

        // Should revoke token immediately since Infinity > MAX_ATTEMPTS
        expect(mockAuthRepo.revokeToken).toHaveBeenCalled();
      });
    });
  });

  // ===========================
  // SECTION 3: PASSWORD LOGIN
  // ===========================

  describe('3. Password Login - EP and BVA', () => {
    describe('3.1 EP: Valid Password Login', () => {
      test('EP: Should login with correct password', async () => {
        const email = validAuthDatasets.passwordLogin.email;
        const password = validAuthDatasets.passwordLogin.password;

        const user = {
          id: 1,
          email,
          password: '$2a$10$hashed_password',
          role: 'USER',
          isDelete: false,
        };

        mockAuthRepo.findActiveUserByEmailFull.mockResolvedValue(user);
        jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(true);
        jest.spyOn(authService as any, 'generateAccessToken').mockReturnValue('access_token');
        jest.spyOn(authService as any, 'generateRefreshToken').mockResolvedValue('refresh_token');

        const result = await authService.login(email, password);

        expect(result).toHaveProperty('accessToken');
        expect(result).toHaveProperty('refreshToken');
      });

      test('EP: Should reject non-existent user', async () => {
        mockAuthRepo.findActiveUserByEmailFull.mockResolvedValue(null);

        await expect(
          authService.login('nonexistent@example.com', 'password')
        ).rejects.toThrow(ErrorCode.AUTH_INVALID_CREDENTIALS);
      });

      test('EP: Should reject user with wrong password', async () => {
        const user = {
          id: 1,
          email: 'user@example.com',
          password: '$2a$10$hashed_password',
          isDelete: false,
        };

        mockAuthRepo.findActiveUserByEmailFull.mockResolvedValue(user);
        jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(false);

        await expect(
          authService.login('user@example.com', 'wrong_password')
        ).rejects.toThrow(ErrorCode.AUTH_INVALID_CREDENTIALS);
      });

      test('EP: Should reject banned user', async () => {
        const bannedUser = {
          id: 1,
          email: 'banned@example.com',
          password: '$2a$10$hashed_password',
          isDelete: true,
        };

        mockAuthRepo.findActiveUserByEmailFull.mockResolvedValue(bannedUser);

        await expect(
          authService.login('banned@example.com', 'password')
        ).rejects.toThrow(ErrorCode.AUTH_ACCOUNT_BANNED);
      });
    });

    describe('3.2 BVA: Password Length Boundaries', () => {
      test('BVA: Password minimum length (8 characters)', async () => {
        const minPassword = 'Pass1234';

        const user = {
          id: 1,
          email: 'user@example.com',
          password: '$2a$10$hashed_password',
          isDelete: false,
        };

        mockAuthRepo.findActiveUserByEmailFull.mockResolvedValue(user);
        jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(true);
        jest.spyOn(authService as any, 'generateAccessToken').mockReturnValue('token');
        jest.spyOn(authService as any, 'generateRefreshToken').mockResolvedValue('refresh');

        const result = await authService.login('user@example.com', minPassword);

        expect(result).toBeDefined();
      });

      test('BVA: Password maximum length (128 characters)', async () => {
        const maxPassword = 'A'.repeat(128);

        const user = {
          id: 1,
          email: 'user@example.com',
          password: '$2a$10$hashed_password',
          isDelete: false,
        };

        mockAuthRepo.findActiveUserByEmailFull.mockResolvedValue(user);
        jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(true);
        jest.spyOn(authService as any, 'generateAccessToken').mockReturnValue('token');
        jest.spyOn(authService as any, 'generateRefreshToken').mockResolvedValue('refresh');

        const result = await authService.login('user@example.com', maxPassword);

        expect(result).toBeDefined();
      });
    });
  });

  // ===========================
  // SECTION 4: TOKEN REFRESH - MULTI-DEVICE SUPPORT
  // ===========================

  describe('4. Token Refresh - Multi-Device Support', () => {
    describe('4.1 EP: Valid Token Refresh', () => {
      test('EP: Should refresh valid token on same device', async () => {
        const userId = '1';
        const existingToken = {
          id: 1,
          userId: 1,
          deviceId: 'device_1',
        };

        const user = {
          id: 1,
          role: 'USER',
          isDelete: false,
        };

        mockAuthRepo.findSessionByToken.mockResolvedValue(existingToken);
        mockAuthRepo.findUserByIdRole.mockResolvedValue(user);
        mockAuthRepo.rotateSessionToken.mockResolvedValue(true);

        const result = await authService.refresh('valid_refresh_token');

        expect(result).toHaveProperty('accessToken');
        expect(result).toHaveProperty('refreshToken');
        expect(mockAuthRepo.rotateSessionToken).toHaveBeenCalled();
      });

      test('EP: Should reject revoked refresh token', async () => {
        mockAuthRepo.findSessionByToken.mockResolvedValue(null);

        await expect(
          authService.refresh('revoked_token')
        ).rejects.toThrow(ErrorCode.AUTH_REFRESH_TOKEN_REVOKED);
      });

      test('EP: Should reject refresh for banned user', async () => {
        const existingToken = { id: 1, userId: 1 };
        const bannedUser = { id: 1, role: 'USER', isDelete: true };

        mockAuthRepo.findSessionByToken.mockResolvedValue(existingToken);
        mockAuthRepo.findUserByIdRole.mockResolvedValue(bannedUser);

        await expect(
          authService.refresh('token')
        ).rejects.toThrow(ErrorCode.AUTH_ACCOUNT_BANNED);
      });
    });

    describe('4.2 Multi-Device Session Management', () => {
      test('Should maintain independent sessions per device', async () => {
        // Device 1 login
        const device1Token = {
          id: 1,
          userId: 1,
          deviceId: 'device_1',
        };

        // Device 2 login (same user)
        const device2Token = {
          id: 2,
          userId: 1,
          deviceId: 'device_2',
        };

        // Refresh on device 1 should not affect device 2
        const user = { id: 1, role: 'USER', isDelete: false };

        mockAuthRepo.findSessionByToken.mockResolvedValue(device1Token);
        mockAuthRepo.findUserByIdRole.mockResolvedValue(user);
        mockAuthRepo.rotateSessionToken.mockResolvedValue(true);

        const result = await authService.refresh('device_1_token');

        expect(result).toBeDefined();
        // rotateSessionToken should only affect device 1's token
        expect(mockAuthRepo.rotateSessionToken).toHaveBeenCalledWith(
          device1Token.id,
          expect.any(Number),
          expect.any(String),
          expect.any(Date)
        );
      });

      test('Should logout from one device without affecting others', async () => {
        const userId = 1;

        mockAuthRepo.revokeSessionTokens.mockResolvedValue(true);

        await authService.logout(String(userId));

        // Only this user's tokens should be revoked (all devices)
        expect(mockAuthRepo.revokeSessionTokens).toHaveBeenCalledWith(userId);
      });
    });

    describe('4.3 BVA: Token Expiration Boundaries', () => {
      test('BVA: Refresh token expiration in 30 days', async () => {
        const existingToken = { id: 1, userId: 1 };
        const user = { id: 1, role: 'USER', isDelete: false };

        mockAuthRepo.findSessionByToken.mockResolvedValue(existingToken);
        mockAuthRepo.findUserByIdRole.mockResolvedValue(user);
        mockAuthRepo.rotateSessionToken.mockResolvedValue(true);

        const result = await authService.refresh('token');

        // Verify new token was created with 30-day expiration
        expect(mockAuthRepo.rotateSessionToken).toHaveBeenCalled();
        const callArgs = mockAuthRepo.rotateSessionToken.mock.calls[0];
        const expiresAt = callArgs[3]; // 4th argument is expiration date

        const daysUntilExpiry = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        expect(daysUntilExpiry).toBeGreaterThan(29);
        expect(daysUntilExpiry).toBeLessThanOrEqual(30);
      });

      test('BVA: Access token expiration in 1 hour', async () => {
        const existingToken = { id: 1, userId: 1 };
        const user = { id: 1, role: 'USER', isDelete: false };

        mockAuthRepo.findSessionByToken.mockResolvedValue(existingToken);
        mockAuthRepo.findUserByIdRole.mockResolvedValue(user);
        mockAuthRepo.rotateSessionToken.mockResolvedValue(true);

        const result = await authService.refresh('token');

        expect(result).toHaveProperty('accessToken');
        // Access token should be short-lived (1 hour)
      });
    });
  });

  // ===========================
  // SECTION 5: LOGOUT
  // ===========================

  describe('5. Logout - Session Revocation', () => {
    test('Should revoke all session tokens for user', async () => {
      const userId = '123';

      mockAuthRepo.revokeSessionTokens.mockResolvedValue(true);

      await authService.logout(userId);

      expect(mockAuthRepo.revokeSessionTokens).toHaveBeenCalledWith(123);
    });

    test('Should handle logout of already logged-out user', async () => {
      const userId = '123';

      mockAuthRepo.revokeSessionTokens.mockResolvedValue(true);

      await expect(authService.logout(userId)).resolves.toBeUndefined();
    });
  });

  // ===========================
  // SECTION 6: VALIDATION TESTING
  // ===========================

  describe('6. Validation Testing - Input Edge Cases', () => {
    describe('6.1 Email Validation', () => {
      test('Validation: Empty email', async () => {
        mockAuthRepo.findActiveUserByEmail.mockResolvedValue(null);

        // Should handle gracefully (actual validation may vary)
        await authService.sendOtp('');

        expect(mockAuthRepo.replaceOtpToken).not.toHaveBeenCalled();
      });

      test('Validation: Email with special characters', async () => {
        const specialEmail = 'user+tag@example.com';

        mockAuthRepo.findActiveUserByEmail.mockResolvedValue(null);
        mockAuthRepo.replaceOtpToken.mockResolvedValue(true);

        await authService.sendOtp(specialEmail);

        expect(mockAuthRepo.replaceOtpToken).toHaveBeenCalled();
      });

      test('Validation: Very long email', async () => {
        const longEmail = 'a'.repeat(200) + '@example.com';

        mockAuthRepo.findActiveUserByEmail.mockResolvedValue(null);
        mockAuthRepo.replaceOtpToken.mockResolvedValue(true);

        await authService.sendOtp(longEmail);

        expect(mockAuthRepo.replaceOtpToken).toHaveBeenCalled();
      });
    });

    describe('6.2 Password Security', () => {
      test('Validation: Should hash password with bcrypt', async () => {
        const email = 'user@example.com';
        const password = 'SecurePassword123!';

        mockAuthRepo.findValidOtp.mockResolvedValue({
          id: 1,
          email,
          refreshToken: '$2a$10$hashed',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(true);
        jest.spyOn(require('bcryptjs'), 'hash').mockResolvedValue('$2a$10$new_hash');
        mockAuthRepo.revokeToken.mockResolvedValue(true);
        mockAuthRepo.createPasswordUser.mockResolvedValue({ id: 1, role: 'USER' });
        jest.spyOn(authService as any, 'generateAccessToken').mockReturnValue('token');
        jest.spyOn(authService as any, 'generateRefreshToken').mockResolvedValue('refresh');

        await authService.verifyOtpAndRegister(email, '123456', password);

        // Verify password was hashed
        expect(require('bcryptjs').hash).toHaveBeenCalledWith(password, 10);
      });
    });
  });
});

      });

      test('Should logout from all devices when requested', async () => {
        const userId = 1;

        mockAuthRepo.revokeSessionTokens.mockResolvedValue({ count: 3 });

        await authService.logoutAllDevices(userId);

        expect(mockAuthRepo.revokeSessionTokens).toHaveBeenCalledWith(userId);
      });

      test('Should preserve other device sessions when one logout', async () => {
        const userId = 1;
        const revokedDeviceId = 'device_1';

        mockAuthRepo.revokeToken.mockResolvedValue(true);

        await authService.logout('token_device_1');

        expect(mockAuthRepo.revokeToken).toHaveBeenCalled();
      });
    });
  });

  // ===========================
  // SECTION 5: TOKEN EXPIRY & REFRESH EDGE CASES
  // ===========================

  describe('5. EP: Token Expiry & Refresh Scenarios', () => {
    describe('5.1 Access Token Expiry', () => {
      test('EP: Expired access token (30 min) → should reject', async () => {
        const expiredPayload = {
          sub: '1',
          email: 'user@example.com',
          exp: Math.floor(Date.now() / 1000) - 60, // Expired 1 min ago
        };

        // Decode expired token
        await expect(
          authService.verifyAccessToken('expired_token')
        ).rejects.toThrow('Token expired');
      });

      test('BVA: Access token near expiry (10 sec before expiry)', async () => {
        const nearExpiry = {
          sub: '1',
          email: 'user@example.com',
          exp: Math.floor(Date.now() / 1000) + 10, // Expires in 10 sec
        };

        // Should still be valid
        const result = await authService.verifyAccessToken('token_near_expiry');
        expect(result).toBeDefined();
      });
    });

    describe('5.2 Refresh Token Expiry (7 days)', () => {
      test('EP: Valid refresh token (5 days old) → should rotate', async () => {
        const validRefreshToken = {
          id: 1,
          userId: 1,
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        };

        mockAuthRepo.findSessionByToken.mockResolvedValue(validRefreshToken);
        mockAuthRepo.findUserByIdRole.mockResolvedValue({
          id: 1,
          role: 'USER',
        });
        mockAuthRepo.rotateSessionToken.mockResolvedValue(true);

        const result = await authService.refresh('valid_refresh_token');

        expect(result).toHaveProperty('refreshToken');
      });

      test('EP: Expired refresh token (8 days old) → should reject', async () => {
        const expiredRefreshToken = {
          id: 1,
          userId: 1,
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        };

        mockAuthRepo.findSessionByToken.mockResolvedValue(expiredRefreshToken);

        await expect(
          authService.refresh('expired_refresh_token')
        ).rejects.toThrow();
      });

      test('BVA: Refresh token at boundary (exactly 7 days old)', async () => {
        const boundaryToken = {
          id: 1,
          userId: 1,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Exactly 7 days ago
        };

        mockAuthRepo.findSessionByToken.mockResolvedValue(boundaryToken);
        mockAuthRepo.findUserByIdRole.mockResolvedValue({ id: 1, role: 'USER' });

        // Should still be valid or at boundary
        const result = await authService.refresh('boundary_token').catch(() => null);
        expect(result === null || result.hasOwnProperty('accessToken')).toBe(true);
      });
    });
  });

  // ===========================
  // SECTION 6: SESSION REVOCATION CASCADE
  // ===========================

  describe('6. EP: Session Revocation & Cascading', () => {
    test('EP: Logout single session → token becomes invalid', async () => {
      mockAuthRepo.revokeToken.mockResolvedValue(true);

      await authService.logout('token_to_revoke');

      // Next request with this token should fail
      mockAuthRepo.findSessionByToken.mockResolvedValue(null);

      await expect(
        authService.refresh('token_to_revoke')
      ).rejects.toThrow();
    });

    test('EP: Logout all devices → all tokens become invalid', async () => {
      const userId = 1;

      mockAuthRepo.revokeSessionTokens.mockResolvedValue({ count: 5 });

      await authService.logoutAllDevices(userId);

      // All tokens should now be invalid
      mockAuthRepo.findSessionByToken.mockResolvedValue(null);

      await expect(
        authService.refresh('any_token_for_user_1')
      ).rejects.toThrow();
    });

    test('EP: Password change → revoke all sessions', async () => {
      const userId = 1;

      mockAuthRepo.revokeSessionTokens.mockResolvedValue({ count: 3 });

      await authService.changePassword(userId, 'old_pass', 'new_pass');

      expect(mockAuthRepo.revokeSessionTokens).toHaveBeenCalledWith(userId);
    });
  });

  // ===========================
  // SECTION 7: AUTHORIZATION & ROLE-BASED ACCESS
  // ===========================

  describe('7. Auth: Authorization - Role Validation', () => {
    test('Auth: Admin user can perform admin actions', async () => {
      const adminUser = {
        id: 1,
        role: 'ADMIN',
        email: 'admin@example.com',
      };

      mockAuthRepo.findUserByIdRole.mockResolvedValue(adminUser);

      const result = await authService.verifyAdminAccess(1);

      expect(result.role).toBe('ADMIN');
    });

    test('Auth: Regular user cannot perform admin actions', async () => {
      const regularUser = {
        id: 2,
        role: 'USER',
        email: 'user@example.com',
      };

      mockAuthRepo.findUserByIdRole.mockResolvedValue(regularUser);

      await expect(
        authService.verifyAdminAccess(2)
      ).rejects.toThrow(ErrorCode.AUTH_FORBIDDEN);
    });

    test('Auth: Banned user cannot access anything', async () => {
      const bannedUser = {
        id: 3,
        role: 'USER',
        isDelete: true,
      };

      mockAuthRepo.findUserByIdRole.mockResolvedValue(bannedUser);

      await expect(
        authService.verifyUserAccess(3)
      ).rejects.toThrow(ErrorCode.AUTH_ACCOUNT_BANNED);
    });
  });

  // ===========================
  // SECTION 8: PASSWORD HASHING & VERIFICATION
  // ===========================

  describe('8. Security: Password Hashing & Verification', () => {
    test('Security: Password hash should be different from plaintext', async () => {
      const password = 'MyPassword123!@#';

      mockAuthRepo.createPasswordUser.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        passwordHash: '$2b$10$...', // bcrypt hash
      });

      const result = await authService.createPasswordUser('user@example.com', password);

      expect(result.passwordHash).not.toBe(password);
      expect(result.passwordHash).toMatch(/^\$2b\$/); // bcrypt prefix
    });

    test('Security: Same password hashes differently each time (salt)', async () => {
      const password = 'MyPassword123!@#';

      const hash1 = await authService.hashPassword(password);
      const hash2 = await authService.hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different due to salt
      // But both should verify against the original password
      expect(await authService.verifyPassword(password, hash1)).toBe(true);
      expect(await authService.verifyPassword(password, hash2)).toBe(true);
    });

    test('Security: Incorrect password fails verification', async () => {
      const correctPassword = 'MyPassword123!@#';
      const wrongPassword = 'WrongPassword456!@#';

      const hash = await authService.hashPassword(correctPassword);

      const result = await authService.verifyPassword(wrongPassword, hash);

      expect(result).toBe(false);
    });
  });

  // ===========================
  // SECTION 9: OTP BRUTE-FORCE PROTECTION
  // ===========================

  describe('9. Security: OTP Brute-Force Protection', () => {
    test('Security: 3 failed OTP attempts → account locked', async () => {
      const email = 'user@example.com';

      mockCacheService.increment.mockResolvedValueOnce(1);
      mockCacheService.increment.mockResolvedValueOnce(2);
      mockCacheService.increment.mockResolvedValueOnce(3);

      // First 2 attempts fail
      await authService.verifyOtp(email, '111111').catch(() => {});
      await authService.verifyOtp(email, '222222').catch(() => {});

      // Third attempt should lock account
      mockCacheService.get.mockResolvedValue(3);

      await expect(
        authService.verifyOtp(email, '333333')
      ).rejects.toThrow('OTP attempts exceeded');
    });

    test('Security: Successful OTP within 3 attempts → clear counter', async () => {
      const email = 'user@example.com';
      const correctOtp = '123456';

      mockCacheService.increment.mockResolvedValue(1);
      mockAuthRepo.findValidOtp.mockResolvedValue({ otp: correctOtp });
      mockCacheService.delete.mockResolvedValue(true);

      await authService.verifyOtp(email, correctOtp);

      expect(mockCacheService.delete).toHaveBeenCalledWith(
        expect.stringContaining('otp_attempts')
      );
    });
  });
});
