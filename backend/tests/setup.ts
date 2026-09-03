/**
 * Global Jest Setup
 * Initializes test environment, global test utilities, and mock configuration
 */

require('reflect-metadata');

// Extend Jest timeout for database operations
jest.setTimeout(10000);

// Global test utilities
(global as any).testUtils = {
  sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
};

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/echotrace_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.PAYOS_CLIENT_ID = 'test-payos-client-id';
process.env.PAYOS_API_KEY = 'test-payos-api-key';
process.env.PAYOS_CHECKSUM_KEY = 'test-payos-checksum-key';
process.env.R2_ACCOUNT_ID = 'test-account-id';
process.env.R2_ACCESS_KEY = 'test-access-key';
process.env.R2_SECRET_KEY = 'test-secret-key';
process.env.R2_BUCKET_NAME = 'test-bucket';
