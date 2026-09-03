/**
 * Prisma Client Mock for Tests
 * Mocks the generated Prisma client to avoid import.meta and ES module issues
 */

export class PrismaClient {
  constructor(_options?: any) {}
  
  $connect = jest.fn().mockResolvedValue(undefined);
  $disconnect = jest.fn().mockResolvedValue(undefined);
  $transaction = jest.fn().mockResolvedValue([]);
  $queryRaw = jest.fn();
  $executeRaw = jest.fn();
}

export const Prisma = {
  TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable',
  },
  PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
  PrismaClientValidationError: class PrismaClientValidationError extends Error {},
  PrismaClientRustPanicError: class PrismaClientRustPanicError extends Error {},
  PrismaClientInitializationError: class PrismaClientInitializationError extends Error {},
  PrismaClientPromiseExtension: class {},
  getExtensionContext: jest.fn(),
};

export {};

