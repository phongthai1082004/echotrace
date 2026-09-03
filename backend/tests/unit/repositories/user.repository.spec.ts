import { UserRepository } from '@features/users/users.repository';
import { PrismaService } from '@lib/prisma';
import { Prisma } from '@prisma/client';

describe('UserRepository - Unit Tests', () => {
  let repo: UserRepository;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    mockPrismaService = {
      db: {
        user: {
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      },
    } as unknown as jest.Mocked<PrismaService>;

    repo = new UserRepository(mockPrismaService);
  });

  describe('findById', () => {
    it('EP: Should find active user by id', async () => {
      const mockUser = {
        id: 100,
        email: 'user@gmail.com',
        name: 'Test User',
        isDelete: false,
      };

      mockPrismaService.db.user.findFirst.mockResolvedValue(mockUser as any);

      const result = await repo.findById(100);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.db.user.findFirst).toHaveBeenCalledWith({
        where: { id: 100, isDelete: false },
      });
    });

    it('EP: Should return null for deleted user', async () => {
      mockPrismaService.db.user.findFirst.mockResolvedValue(null);

      const result = await repo.findById(100);

      expect(result).toBeNull();
      expect(mockPrismaService.db.user.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({ isDelete: false }),
      });
    });

    it('EP: Should support extra where conditions', async () => {
      mockPrismaService.db.user.findFirst.mockResolvedValue(null);

      await repo.findById(100, { role: 'ADMIN' });

      expect(mockPrismaService.db.user.findFirst).toHaveBeenCalledWith({
        where: { id: 100, isDelete: false, role: 'ADMIN' },
      });
    });

    it('EP: Should support multiple extra conditions', async () => {
      mockPrismaService.db.user.findFirst.mockResolvedValue(null);

      await repo.findById(100, { role: 'ADMIN', email: 'admin@test.com' });

      expect(mockPrismaService.db.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: 100,
          isDelete: false,
          role: 'ADMIN',
          email: 'admin@test.com',
        },
      });
    });

    it('BVA: Should find user with boundary id (1)', async () => {
      mockPrismaService.db.user.findFirst.mockResolvedValue({ id: 1, isDelete: false } as any);

      await repo.findById(1);

      expect(mockPrismaService.db.user.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: 1 }),
      });
    });

    it('BVA: Should find user with large id', async () => {
      mockPrismaService.db.user.findFirst.mockResolvedValue(null);

      await repo.findById(2147483647);

      expect(mockPrismaService.db.user.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: 2147483647 }),
      });
    });

    it('EP: Should not find deleted users regardless of other conditions', async () => {
      mockPrismaService.db.user.findFirst.mockResolvedValue(null);

      await repo.findById(100, { role: 'USER' });

      // Should always include isDelete: false
      const call = mockPrismaService.db.user.findFirst.mock.calls[0][0];
      expect(call.where).toEqual({
        id: 100,
        isDelete: false,
        role: 'USER',
      });
    });
  });

  describe('updateById', () => {
    it('EP: Should update active user', async () => {
      const update = { name: 'Updated Name' };
      mockPrismaService.db.user.update.mockResolvedValue({
        id: 100,
        ...update,
        isDelete: false,
      } as any);

      const result = await repo.updateById(100, update);

      expect(result).toHaveProperty('name', 'Updated Name');
      expect(mockPrismaService.db.user.update).toHaveBeenCalledWith({
        where: { id: 100, isDelete: false },
        data: update,
      });
    });

    it('Error: Should fail for deleted user', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025' });
      mockPrismaService.db.user.update.mockRejectedValue(error);

      await expect(repo.updateById(100, { name: 'Update' })).rejects.toThrow();
    });

    it('EP: Should support extra where conditions', async () => {
      mockPrismaService.db.user.update.mockResolvedValue({} as any);

      await repo.updateById(100, { name: 'Updated' }, { role: 'ADMIN' });

      expect(mockPrismaService.db.user.update).toHaveBeenCalledWith({
        where: { id: 100, isDelete: false, role: 'ADMIN' },
        data: { name: 'Updated' },
      });
    });

    it('BVA: Should update multiple fields', async () => {
      const update = {
        name: 'New Name',
        email: 'new@email.com',
        avatar: 'new_avatar.jpg',
        phone: '0123456789',
      };
      mockPrismaService.db.user.update.mockResolvedValue({ id: 100, ...update } as any);

      await repo.updateById(100, update);

      expect(mockPrismaService.db.user.update).toHaveBeenCalledWith({
        where: expect.any(Object),
        data: update,
      });
    });

    it('Error: Should handle invalid update data', async () => {
      const error = new Error('Invalid column');
      mockPrismaService.db.user.update.mockRejectedValue(error);

      await expect(repo.updateById(100, { invalidField: 'value' })).rejects.toThrow();
    });

    it('EP: Should enforce soft-delete check', async () => {
      mockPrismaService.db.user.update.mockResolvedValue({} as any);

      await repo.updateById(100, { name: 'Name' });

      const where = mockPrismaService.db.user.update.mock.calls[0][0].where;
      expect(where).toEqual({ id: 100, isDelete: false });
    });
  });

  describe('findByIdFull', () => {
    it('EP: Should return full user record including password', async () => {
      const mockUser = {
        id: 100,
        email: 'user@gmail.com',
        password: 'hashed_pwd',
        name: 'Test',
        phone: '0123456789',
        address: '123 Street',
        isDelete: false,
      };

      mockPrismaService.db.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await repo.findByIdFull(100);

      expect(result).toEqual(mockUser);
      expect(result).toHaveProperty('password');
      expect(mockPrismaService.db.user.findUnique).toHaveBeenCalledWith({
        where: { id: 100 },
      });
    });

    it('EP: Should return null for non-existent user', async () => {
      mockPrismaService.db.user.findUnique.mockResolvedValue(null);

      const result = await repo.findByIdFull(999);

      expect(result).toBeNull();
    });

    it('EP: Should include sensitive fields (password, phone, address)', async () => {
      const mockUser = {
        id: 100,
        password: 'sensitive_pwd',
        phone: '0987654321',
        address: 'Secret Address',
      };

      mockPrismaService.db.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await repo.findByIdFull(100);

      expect(result).toHaveProperty('password');
      expect(result).toHaveProperty('phone');
      expect(result).toHaveProperty('address');
    });

    it('BVA: Should fetch with boundary user id', async () => {
      mockPrismaService.db.user.findUnique.mockResolvedValue(null);

      await repo.findByIdFull(1);

      expect(mockPrismaService.db.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('findByPhone', () => {
    it('EP: Should find user by phone', async () => {
      const mockUser = {
        id: 100,
        email: 'user@gmail.com',
        phone: '0123456789',
        name: 'Test User',
      };

      mockPrismaService.db.user.findFirst.mockResolvedValue(mockUser as any);

      const result = await repo.findByPhone('0123456789');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.db.user.findFirst).toHaveBeenCalledWith({
        where: { phone: '0123456789', isDelete: false },
      });
    });

    it('EP: Should return null for non-existent phone', async () => {
      mockPrismaService.db.user.findFirst.mockResolvedValue(null);

      const result = await repo.findByPhone('9999999999');

      expect(result).toBeNull();
    });

    it('BVA: Should handle phone boundary formats', async () => {
      mockPrismaService.db.user.findFirst.mockResolvedValue(null);

      // Minimum valid phone
      await repo.findByPhone('0');

      expect(mockPrismaService.db.user.findFirst).toHaveBeenCalled();
    });

    it('BVA: Should handle long phone numbers', async () => {
      mockPrismaService.db.user.findFirst.mockResolvedValue(null);

      const longPhone = '+1' + '9'.repeat(20);
      await repo.findByPhone(longPhone);

      expect(mockPrismaService.db.user.findFirst).toHaveBeenCalledWith({
        where: { phone: longPhone, isDelete: false },
      });
    });

    it('EP: Should only find active (non-deleted) users', async () => {
      mockPrismaService.db.user.findFirst.mockResolvedValue(null);

      await repo.findByPhone('0123456789');

      expect(mockPrismaService.db.user.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({ isDelete: false }),
      });
    });
  });

  describe('updateUser', () => {
    it('EP: Should update user profile', async () => {
      const update = { name: 'New Name', phone: '0987654321' };
      mockPrismaService.db.user.update.mockResolvedValue({
        id: 100,
        ...update,
      } as any);

      const result = await repo.updateUser(100, update);

      expect(result).toHaveProperty('name', 'New Name');
      expect(mockPrismaService.db.user.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: update,
      });
    });

    it('EP: Should update single field', async () => {
      mockPrismaService.db.user.update.mockResolvedValue({} as any);

      await repo.updateUser(100, { name: 'Only Name' });

      expect(mockPrismaService.db.user.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { name: 'Only Name' },
      });
    });

    it('Error: Should handle non-existent user', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025' });
      mockPrismaService.db.user.update.mockRejectedValue(error);

      await expect(repo.updateUser(999, { name: 'Update' })).rejects.toThrow();
    });

    it('BVA: Should update multiple profile fields', async () => {
      const update = {
        name: 'Full Name',
        email: 'newemail@test.com',
        phone: '0123456789',
        address: '456 New Street',
        avatar: 'new_avatar.jpg',
      };

      mockPrismaService.db.user.update.mockResolvedValue({ id: 100, ...update } as any);

      await repo.updateUser(100, update);

      expect(mockPrismaService.db.user.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: update,
      });
    });
  });

  describe('findRoleById', () => {
    it('EP: Should return user id and role', async () => {
      const mockUser = { id: 100, role: 'ADMIN' };

      mockPrismaService.db.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await repo.findRoleById(100);

      expect(result).toEqual({ id: 100, role: 'ADMIN' });
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('password');
    });

    it('EP: Should return USER role', async () => {
      mockPrismaService.db.user.findUnique.mockResolvedValue({
        id: 100,
        role: 'USER',
      } as any);

      const result = await repo.findRoleById(100);

      expect(result?.role).toBe('USER');
    });

    it('EP: Should return VENDOR role', async () => {
      mockPrismaService.db.user.findUnique.mockResolvedValue({
        id: 100,
        role: 'VENDOR',
      } as any);

      const result = await repo.findRoleById(100);

      expect(result?.role).toBe('VENDOR');
    });

    it('EP: Should return null for non-existent user', async () => {
      mockPrismaService.db.user.findUnique.mockResolvedValue(null);

      const result = await repo.findRoleById(999);

      expect(result).toBeNull();
    });

    it('EP: Should only return id and role (minimal projection)', async () => {
      mockPrismaService.db.user.findUnique.mockResolvedValue({
        id: 100,
        role: 'ADMIN',
      } as any);

      const result = await repo.findRoleById(100);

      // Check that it only has id and role
      expect(Object.keys(result || {})).toEqual(expect.arrayContaining(['id', 'role']));
      expect(Object.keys(result || {})).toHaveLength(2);
    });

    it('Performance: Should use minimal projection for authorization checks', async () => {
      mockPrismaService.db.user.findUnique.mockResolvedValue({ id: 100, role: 'ADMIN' } as any);

      await repo.findRoleById(100);

      // Should use select to minimize data transfer
      expect(mockPrismaService.db.user.findUnique).toHaveBeenCalledWith({
        where: { id: 100 },
        select: expect.any(Object),
      });
    });
  });

  describe('Soft Delete Pattern', () => {
    it('Pattern: findById enforces isDelete=false', async () => {
      mockPrismaService.db.user.findFirst.mockResolvedValue(null);

      await repo.findById(100);

      expect(mockPrismaService.db.user.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({ isDelete: false }),
      });
    });

    it('Pattern: updateById enforces isDelete=false', async () => {
      mockPrismaService.db.user.update.mockResolvedValue({} as any);

      await repo.updateById(100, { name: 'Update' });

      expect(mockPrismaService.db.user.update).toHaveBeenCalledWith({
        where: expect.objectContaining({ isDelete: false }),
        data: expect.any(Object),
      });
    });

    it('Pattern: findByPhone enforces isDelete=false', async () => {
      mockPrismaService.db.user.findFirst.mockResolvedValue(null);

      await repo.findByPhone('0123456789');

      expect(mockPrismaService.db.user.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({ isDelete: false }),
      });
    });

    it('Pattern: findByIdFull does NOT enforce isDelete check (allows full record of deleted user)', async () => {
      // This is intentional - use case is recovery/audit
      mockPrismaService.db.user.findUnique.mockResolvedValue({ isDelete: true } as any);

      const result = await repo.findByIdFull(100);

      // findByIdFull should NOT filter by isDelete
      expect(mockPrismaService.db.user.findUnique).toHaveBeenCalledWith({
        where: { id: 100 },
      });
    });
  });

  describe('Authorization Patterns', () => {
    it('Pattern: findRoleById used for permission checks (lightweight)', async () => {
      mockPrismaService.db.user.findUnique.mockResolvedValue({
        id: 100,
        role: 'ADMIN',
      } as any);

      const user = await repo.findRoleById(100);

      // Service can check: if (user?.role === 'ADMIN')
      expect(user?.role).toBe('ADMIN');
    });

    it('Pattern: Extra where clause for authorization', async () => {
      mockPrismaService.db.user.findFirst.mockResolvedValue({
        id: 100,
        role: 'VENDOR',
      } as any);

      // Example: find user only if they're ADMIN
      await repo.findById(100, { role: 'ADMIN' });

      expect(mockPrismaService.db.user.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({ role: 'ADMIN' }),
      });
    });
  });

  describe('Error Handling', () => {
    it('Error: Should propagate database errors', async () => {
      const error = new Error('Database connection failed');
      mockPrismaService.db.user.findFirst.mockRejectedValue(error);

      await expect(repo.findById(100)).rejects.toThrow('Database connection failed');
    });

    it('Error: Should translate P2025 (record not found) in updates', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025' });
      mockPrismaService.db.user.update.mockRejectedValue(error);

      await expect(repo.updateById(100, { name: 'Update' })).rejects.toThrow();
    });
  });
});
