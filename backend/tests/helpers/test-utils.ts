/**
 * Test Utilities & Helpers
 * Common test utilities for all test suites
 */

/**
 * Sleep utility for async test delays
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Generate random test ID
 */
export const generateTestId = (prefix = 'test'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create mock transaction context for Prisma
 */
export const createMockTransaction = () => {
  return {
    $transaction: jest.fn().mockImplementation((callback) => {
      if (typeof callback === 'function') {
        return callback(createMockTransaction());
      }
      return Promise.resolve(callback);
    }),
  };
};

/**
 * Assert error code matches
 */
export const expectErrorCode = (error: any, expectedCode: string): void => {
  if (error.errorCode) {
    expect(error.errorCode).toBe(expectedCode);
  } else if (error.message) {
    expect(error.message).toContain(expectedCode);
  } else {
    fail(`Error does not contain expected code: ${expectedCode}`);
  }
};

/**
 * Verify async function throws specific error
 */
export const expectToThrowError = async (
  fn: () => Promise<any>,
  expectedCode: string,
  expectedStatus?: number
): Promise<void> => {
  try {
    await fn();
    fail('Expected function to throw an error');
  } catch (error: any) {
    expectErrorCode(error, expectedCode);
    if (expectedStatus !== undefined) {
      expect(error.statusCode).toBe(expectedStatus);
    }
  }
};

/**
 * Compare objects while ignoring timestamp fields
 */
export const compareIgnoringTimestamps = (actual: any, expected: any): boolean => {
  const timestampFields = ['createdAt', 'updatedAt', 'expiresAt', 'deletedAt'];

  const actualCopy = { ...actual };
  const expectedCopy = { ...expected };

  for (const field of timestampFields) {
    delete actualCopy[field];
    delete expectedCopy[field];
  }

  return JSON.stringify(actualCopy) === JSON.stringify(expectedCopy);
};

/**
 * Create spy on method without mocking
 */
export const spyOnMethod = (obj: any, method: string): jest.SpyInstance => {
  return jest.spyOn(obj, method);
};

/**
 * Simulate concurrent operations
 */
export const simulateConcurrent = async <T>(
  operation: () => Promise<T>,
  concurrency: number
): Promise<T[]> => {
  const promises: Promise<T>[] = [];

  for (let i = 0; i < concurrency; i++) {
    promises.push(operation());
  }

  return Promise.all(promises);
};

/**
 * Create mock Prisma query builder
 */
export const createMockPrismaQuery = (result: any = null) => {
  return {
    findMany: jest.fn().mockResolvedValue(result ?? []),
    findFirst: jest.fn().mockResolvedValue(result ?? null),
    findUnique: jest.fn().mockResolvedValue(result ?? null),
    create: jest.fn().mockResolvedValue(result ?? {}),
    update: jest.fn().mockResolvedValue(result ?? {}),
    upsert: jest.fn().mockResolvedValue(result ?? {}),
    delete: jest.fn().mockResolvedValue(result ?? {}),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    count: jest.fn().mockResolvedValue(0),
  };
};

/**
 * Verify mock was called with exact parameters
 */
export const verifyMockCall = (
  mock: jest.Mock,
  expectedArgs: any[],
  callIndex = 0
): void => {
  const actualCall = mock.mock.calls[callIndex];

  if (!actualCall) {
    fail(`Mock was not called at index ${callIndex}`);
  }

  expect(actualCall).toEqual(expectedArgs);
};

/**
 * Create test context with common dependencies
 */
export const createTestContext = () => {
  return {
    userId: 1,
    userRole: 'USER',
    email: `test-${Date.now()}@example.com`,
    requestId: generateTestId('req'),
    timestamp: new Date(),
  };
};
