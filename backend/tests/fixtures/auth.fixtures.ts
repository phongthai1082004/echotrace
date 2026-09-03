/**
 * Auth Test Fixtures
 * Reusable test data for authentication-related tests
 */

export const createTestOtpToken = (overrides?: Partial<any>) => ({
  id: 'otp_' + Math.random().toString(36).substr(2, 9),
  email: `test-${Math.random().toString(36).substr(2, 9)}@example.com`,
  otpHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456789', // Mock bcrypt hash
  attemptCount: 0,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  ...overrides,
});

export const createTestRefreshToken = (overrides?: Partial<any>) => ({
  id: 'token_' + Math.random().toString(36).substr(2, 9),
  userId: 'user_' + Math.random().toString(36).substr(2, 9),
  deviceId: 'device_' + Math.random().toString(36).substr(2, 9),
  tokenHash: 'hash_' + Math.random().toString(36).substr(2, 9),
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  ...overrides,
});

export const validAuthDatasets = {
  googleLogin: {
    googleToken: 'valid-google-token-jwt',
    deviceId: 'device_123',
  },
  otpRequest: {
    email: 'test@example.com',
  },
  otpVerify: {
    email: 'test@example.com',
    otp: '123456',
    deviceId: 'device_123',
  },
  passwordLogin: {
    email: 'test@example.com',
    password: 'ValidPassword123!',
    deviceId: 'device_123',
  },
  tokenRefresh: {
    refreshToken: 'valid-refresh-token',
    deviceId: 'device_123',
  },
};

export const invalidAuthDatasets = {
  invalidEmail: {
    email: 'not-an-email',
  },
  emptyEmail: {
    email: '',
  },
  nullEmail: {
    email: null,
  },
  invalidOtp: {
    email: 'test@example.com',
    otp: '999999', // Wrong OTP
  },
  expiredOtp: {
    email: 'test@example.com',
    otp: '123456',
    otpExpired: true,
  },
  shortOtp: {
    email: 'test@example.com',
    otp: '123', // Too short
  },
  alphanumericOtp: {
    email: 'test@example.com',
    otp: 'abcdef', // Should be numeric
  },
  invalidPassword: {
    email: 'test@example.com',
    password: 'wrong-password',
  },
  weakPassword: {
    password: '123', // Too weak
  },
  missingDeviceId: {
    email: 'test@example.com',
    otp: '123456',
  },
};

export const otpBoundaryValues = {
  minOtpLength: 6,
  minOtpBoundary: 5,
  validOtpRange: '000000-999999',
  validOtp: '123456',
  minAttempts: 0,
  maxAttempts: 5,
  maxAttemptsBoundary: 6,
};

export const passwordBoundaryValues = {
  minLength: 8,
  maxLength: 128,
  minLengthBoundary: 7,
  maxLengthBoundary: 129,
};

export const jwtTestData = {
  validToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjogMTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  expiredToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjogMTUxNjIzOTAyMn0.invalid',
  malformedToken: 'not-a-valid-jwt',
  emptyToken: '',
};

export const multiDeviceSessionTestCases = [
  {
    name: 'Two devices with independent sessions',
    devices: [
      { id: 'device_1', userId: 'user_1', refreshToken: 'token_1' },
      { id: 'device_2', userId: 'user_1', refreshToken: 'token_2' },
    ],
    action: 'logout from device_1',
    expectedResult: {
      device_1: 'logged out',
      device_2: 'still logged in',
    },
  },
  {
    name: 'Logout from all devices',
    devices: [
      { id: 'device_1', userId: 'user_1', refreshToken: 'token_1' },
      { id: 'device_2', userId: 'user_1', refreshToken: 'token_2' },
      { id: 'device_3', userId: 'user_1', refreshToken: 'token_3' },
    ],
    action: 'logout from all devices',
    expectedResult: {
      device_1: 'logged out',
      device_2: 'logged out',
      device_3: 'logged out',
    },
  },
  {
    name: 'Refresh token on one device does not affect others',
    devices: [
      { id: 'device_1', userId: 'user_1', refreshToken: 'token_1' },
      { id: 'device_2', userId: 'user_1', refreshToken: 'token_2' },
    ],
    action: 'refresh token on device_1',
    expectedResult: {
      device_1: 'new tokens generated',
      device_2: 'unaffected',
    },
  },
];

export const bruteForceTestCases = [
  {
    name: 'Single user 5 failed attempts locked',
    email: 'test@example.com',
    attempts: 5,
    expectLocked: true,
  },
  {
    name: '4 failed attempts still unlocked',
    email: 'test@example.com',
    attempts: 4,
    expectLocked: false,
  },
  {
    name: 'Reset counter after successful attempt',
    email: 'test@example.com',
    failedAttempts: 3,
    successfulAttempt: true,
    expectCounterReset: true,
  },
];
