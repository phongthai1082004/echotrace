/**
 * User Test Fixtures
 * Reusable test data factories for user-related tests
 */

export const createTestUser = (overrides?: Partial<any>) => ({
  id: 'user_' + Math.random().toString(36).substr(2, 9),
  email: `test-${Math.random().toString(36).substr(2, 9)}@example.com`,
  name: 'Test User',
  phone: '+84912345678',
  address: '123 Test Street, Test City',
  googleId: null,
  passwordHash: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

export const createGoogleTestUser = (overrides?: Partial<any>) => ({
  ...createTestUser(overrides),
  googleId: 'google_' + Math.random().toString(36).substr(2, 9),
  passwordHash: null,
});

export const createPasswordTestUser = (overrides?: Partial<any>) => ({
  ...createTestUser(overrides),
  googleId: null,
  passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456789', // Mock bcrypt hash
});

export const createAdminUser = (overrides?: Partial<any>) => ({
  ...createTestUser(overrides),
  role: 'ADMIN',
});

export const validUserData = {
  email: 'valid@example.com',
  name: 'Valid Name',
  phone: '+84912345678',
  address: '123 Valid Street',
};

export const invalidUserDatasets = {
  emptyEmail: { email: '', name: 'Valid Name', phone: '+84912345678' },
  nullEmail: { email: null, name: 'Valid Name', phone: '+84912345678' },
  invalidEmailFormat: { email: 'not-an-email', name: 'Valid Name', phone: '+84912345678' },
  emptyName: { email: 'test@example.com', name: '', phone: '+84912345678' },
  nullName: { email: 'test@example.com', name: null, phone: '+84912345678' },
  nameWithSpecialChars: { email: 'test@example.com', name: '<script>alert("xss")</script>', phone: '+84912345678' },
  invalidPhoneFormat: { email: 'test@example.com', name: 'Valid Name', phone: 'abc123' },
  missingName: { email: 'test@example.com', phone: '+84912345678' },
};
