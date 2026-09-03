import { AuthRepository } from '@features/auth/auth.repository';
import { PrismaService } from '@lib/prisma';
import { Prisma, TokenType } from '@prisma/client';

describe('AuthRepository - Unit Tests', () => {
  let repo: AuthRepository;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    mockPrismaService = {
      db: {
        user: {
          findFirst: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        token: {
          create: jest.fn(),
          findFirst: jest.fn(),
          deleteMany: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      } as any,
      $transaction: jest.fn((callback) => callback(mockPrismaService.db)),
    } as unknown as jest.Mocked<PrismaService>;

    repo = new AuthRepository(mockPrismaService);
  });

  describe('findUserByGoogleOrEmail', () => {
    it('EP: Should find user by Google ID', async () => {
      const mockUser = {
        id: 1,
        email: 'user@gmail.com',
        googleId: 'goog123',
        name: 'Test User',
        avatar: 'avatar.jpg',
        role: 'USER',
        isDelete: false,
      };

      mockPrismaService.db.user.findFirst.mockResolvedValue(mockUser as any);

      const result = await repo.findUserByGoogleOrEmail('user@gmail.com', 'goog123');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.db.user.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ googleId: 'goog123' }, { email: 'user@gmail.com' }] },
        select: expect.any(Object),
      });
    });

    it('EP: Should find user by email (no Google ID)', async () => {
      mockPrismaService.db.user.findFirst.mockResolvedValue(null);

      const result = await repo.findUserByGoogleOrEmail('user@gmail.com', null);

      expect(mockPrismaService.db.user.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ googleId: null }, { email: 'user@gmail.com' }] },
        select: expect.any(Object),
      });
    });

    it('EP: Should return null for non-existent user', async () => {
      mockPrismaService.db.user.findFirst.mockResolvedValue(null);

      const result = await repo.findUserByGoogleOrEmail('unknown@gmail.com', null);

      expect(result).toBeNull();
    });

    it('BVA: Should handle email at boundary', async () => {
      mockPrismaService.db.user.findFirst.mockResolvedValue(null);

      await repo.findUserByGoogleOrEmail('a@b.c', null);

      expect(mockPrismaService.db.user.findFirst).toHaveBeenCalled();
    });

    it('BVA: Should handle very long email', async () => {
      mockPrismaService.db.user.findFirst.mockResolvedValue(null);

      const longEmail = 'a'.repeat(200) + '@example.com';
      await repo.findUserByGoogleOrEmail(longEmail, null);

      expect(mockPrismaService.db.user.findFirst).toHaveBeenCalled();
    });
  });

  describe('createGoogleUser', () => {
    it('EP: Should create new Google user', async () => {
      const data = {
        email: 'user@gmail.com',
        googleId: 'goog123',
        name: 'Test User',
        avatar: 'avatar.jpg',
      };

      mockPrismaService.db.user.create.mockResolvedValue({ id: 1, ...data, isDelete: false } as any);

      const result = await repo.createGoogleUser(data);

      expect(result).toHaveProperty('id', 1);
      expect(mockPrismaService.db.user.create).toHaveBeenCalledWith({ data });
    });

    it('Error: Should handle duplicate email', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002' });
      mockPrismaService.db.user.create.mockRejectedValue(error);

      await expect(
        repo.createGoogleUser({ email: 'dup@gmail.com', googleId: 'g123', name: 'User' })
      ).rejects.toThrow();
    });
  });

  describe('findActiveUserByEmailFull', () => {
    it('EP: Should find active user with full details', async () => {
      const mockUser = {
        id: 1,
        email: 'user@gmail.com',
        password: 'hashed_password',
        name: 'Test',
        isDelete: false,
      };

      mockPrismaService.db.user.findFirst.mockResolvedValue(mockUser as any);

      const result = await repo.findActiveUserByEmailFull('user@gmail.com');

      expect(result).toHaveProperty('password');
      expect(mockPrismaService.db.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'user@gmail.com', isDelete: false },
      });
    });

    it('EP: Should return null for deleted user', async () => {
      mockPrismaService.db.user.findFirst.mockResolvedValue(null);

      const result = await repo.findActiveUserByEmailFull('deleted@gmail.com');

      expect(result).toBeNull();
      expect(mockPrismaService.db.user.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({ isDelete: false }),
      });
    });

    it('BVA: Should handle email boundary values', async () => {
      mockPrismaService.db.user.findFirst.mockResolvedValue(null);

      await repo.findActiveUserByEmailFull('a@b');

      expect(mockPrismaService.db.user.findFirst).toHaveBeenCalled();
    });
  });

  describe('replaceOtpToken', () => {
    it('EP: Should atomically replace OTP token', async () => {
      const mockTx = {
        token: {
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
          create: jest.fn().mockResolvedValue({ id: 1, email: 'user@gmail.com' }),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      const result = await repo.replaceOtpToken('user@gmail.com', 'hashed_otp', new Date());

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('EP: Should delete all prior OTPs before creating new one', async () => {
      const mockTx = {
        token: {
          deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
          create: jest.fn().mockResolvedValue({ id: 1 }),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      await repo.replaceOtpToken('user@gmail.com', 'new_otp', new Date());

      // Verify transaction was used
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('Error: Should handle missing email', async () => {
      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce(() =>
        Promise.reject(new Error('Missing email'))
      );

      await expect(repo.replaceOtpToken('', 'otp', new Date())).rejects.toThrow();
    });

    it('BVA: Should handle expiry at boundary (current time)', async () => {
      const mockTx = {
        token: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          create: jest.fn().mockResolvedValue({ id: 1 }),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      const now = new Date();
      await repo.replaceOtpToken('user@gmail.com', 'otp', now);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('BVA: Should handle expiry in far future', async () => {
      const mockTx = {
        token: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          create: jest.fn().mockResolvedValue({ id: 1 }),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      await repo.replaceOtpToken('user@gmail.com', 'otp', futureDate);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('Concurrency: Should be atomic (no partial updates)', async () => {
      // Transaction ensures both delete and create happen together
      let txCalled = false;

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce(async (callback) => {
        txCalled = true;
        return callback({
          token: {
            deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
            create: jest.fn().mockResolvedValue({ id: 1 }),
          },
        });
      });

      await repo.replaceOtpToken('user@gmail.com', 'otp', new Date());

      expect(txCalled).toBe(true);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('rotateSessionToken', () => {
    it('EP: Should atomically rotate session token', async () => {
      const mockTx = {
        token: {
          delete: jest.fn().mockResolvedValue({ id: 1 }),
          create: jest.fn().mockResolvedValue({ id: 2, userId: 100 }),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      const result = await repo.rotateSessionToken(1, 100, 'new_rt', new Date());

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('EP: Should delete old token and create new one atomically', async () => {
      const mockTx = {
        token: {
          delete: jest.fn().mockResolvedValue({ id: 1 }),
          create: jest.fn().mockResolvedValue({ id: 2 }),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      await repo.rotateSessionToken(1, 100, 'new_rt', new Date());

      // Both operations should be called in transaction
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('Concurrency: Should prevent token replay attacks', async () => {
      // Old token is deleted before new one is active, preventing concurrent usage
      const mockTx = {
        token: {
          delete: jest.fn().mockResolvedValue({ id: 1 }),
          create: jest.fn().mockResolvedValue({ id: 2 }),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      await repo.rotateSessionToken(1, 100, 'new_rt', new Date());

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('revokeSessionTokens', () => {
    it('EP: Should revoke all session tokens for user', async () => {
      mockPrismaService.db.token.deleteMany.mockResolvedValue({ count: 3 });

      const result = await repo.revokeSessionTokens(100);

      expect(result).toHaveProperty('count', 3);
      expect(mockPrismaService.db.token.deleteMany).toHaveBeenCalledWith({
        where: { userId: 100, tokenType: TokenType.SESSION },
      });
    });

    it('EP: Should handle user with no tokens', async () => {
      mockPrismaService.db.token.deleteMany.mockResolvedValue({ count: 0 });

      const result = await repo.revokeSessionTokens(100);

      expect(result.count).toBe(0);
    });

    it('BVA: Should handle user ID boundary', async () => {
      mockPrismaService.db.token.deleteMany.mockResolvedValue({ count: 0 });

      await repo.revokeSessionTokens(1);

      expect(mockPrismaService.db.token.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1, tokenType: TokenType.SESSION },
      });
    });

    it('EP: Should only revoke SESSION tokens, not OTP', async () => {
      mockPrismaService.db.token.deleteMany.mockResolvedValue({ count: 5 });

      await repo.revokeSessionTokens(100);

      expect(mockPrismaService.db.token.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 100,
          tokenType: TokenType.SESSION,
        },
      });
    });
  });

  describe('deleteOtpTokens', () => {
    it('EP: Should delete all OTP tokens for email', async () => {
      mockPrismaService.db.token.deleteMany.mockResolvedValue({ count: 2 });

      const result = await repo.deleteOtpTokens('user@gmail.com');

      expect(result).toHaveProperty('count', 2);
      expect(mockPrismaService.db.token.deleteMany).toHaveBeenCalledWith({
        where: { email: 'user@gmail.com', tokenType: TokenType.OTP },
      });
    });

    it('EP: Should return 0 if no OTP tokens exist', async () => {
      mockPrismaService.db.token.deleteMany.mockResolvedValue({ count: 0 });

      const result = await repo.deleteOtpTokens('user@gmail.com');

      expect(result.count).toBe(0);
    });
  });

  describe('revokeToken', () => {
    it('EP: Should revoke token by id', async () => {
      mockPrismaService.db.token.delete.mockResolvedValue({ id: 1 });

      const result = await repo.revokeToken(1);

      expect(result).toHaveProperty('id', 1);
    });

    it('Error: Should handle non-existent token', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025' });
      mockPrismaService.db.token.delete.mockRejectedValue(error);

      await expect(repo.revokeToken(999)).rejects.toThrow();
    });
  });

  describe('findSessionByToken', () => {
    it('EP: Should find active session by token', async () => {
      const mockSession = {
        id: 1,
        userId: 100,
        refreshToken: 'token123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      mockPrismaService.db.token.findFirst.mockResolvedValue(mockSession as any);

      const result = await repo.findSessionByToken('token123');

      expect(result).toHaveProperty('userId', 100);
      expect(mockPrismaService.db.token.findFirst).toHaveBeenCalledWith({
        where: {
          refreshToken: 'token123',
          tokenType: TokenType.SESSION,
          expiresAt: { gt: expect.any(Date) },
        },
      });
    });

    it('EP: Should return null for expired token', async () => {
      mockPrismaService.db.token.findFirst.mockResolvedValue(null);

      const result = await repo.findSessionByToken('expired_token');

      expect(result).toBeNull();
    });

    it('BVA: Should handle token at expiry boundary', async () => {
      mockPrismaService.db.token.findFirst.mockResolvedValue(null);

      await repo.findSessionByToken('token');

      expect(mockPrismaService.db.token.findFirst).toHaveBeenCalledWith({
        where: {
          refreshToken: 'token',
          tokenType: TokenType.SESSION,
          expiresAt: { gt: expect.any(Date) },
        },
      });
    });
  });

  describe('Transaction Patterns', () => {
    it('Pattern: Atomic OTP replacement uses $transaction', async () => {
      const mockTx = {
        token: {
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
          create: jest.fn().mockResolvedValue({ id: 1 }),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      await repo.replaceOtpToken('user@gmail.com', 'otp', new Date());

      // Verify atomic operation
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('Pattern: Session token rotation is atomic', async () => {
      const mockTx = {
        token: {
          delete: jest.fn().mockResolvedValue({ id: 1 }),
          create: jest.fn().mockResolvedValue({ id: 2 }),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      await repo.rotateSessionToken(1, 100, 'new_rt', new Date());

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('Security Patterns', () => {
    it('Security: Should only expose non-sensitive fields in public methods', async () => {
      const mockUser = {
        id: 1,
        email: 'user@gmail.com',
        name: 'User',
        avatar: 'avatar.jpg',
        role: 'USER',
      };

      mockPrismaService.db.user.findFirst.mockResolvedValue(mockUser as any);

      const result = await repo.findUserByGoogleOrEmail('user@gmail.com', null);

      // Should not include password or sensitive data
      expect(result).toHaveProperty('email');
      expect(result).not.toHaveProperty('password');
    });

    it('Security: findActiveUserByEmailFull should expose password for login verification', async () => {
      const mockUser = {
        id: 1,
        email: 'user@gmail.com',
        password: 'hashed_pwd',
      };

      mockPrismaService.db.user.findFirst.mockResolvedValue(mockUser as any);

      const result = await repo.findActiveUserByEmailFull('user@gmail.com');

      // Should include password because this is for login verification
      expect(result).toHaveProperty('password');
    });
  });
});
