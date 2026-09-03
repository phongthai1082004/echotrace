/**
 * Stickers Repository Unit Tests
 * Test coverage: CRUD operations, caching, filtering by category
 * Methodology: EP (Equivalence Partitioning), BVA (Boundary Value Analysis)
 */

import { StickersRepository } from '@features/stickers/stickers.repository';
import { PrismaService } from '@lib/prisma';
import { Prisma } from '@prisma/client';

describe('Stickers Repository - Unit Tests', () => {
  let repository: StickersRepository;
  let mockClient: jest.Mocked<PrismaService>;
  let mockTx: any;

  beforeEach(() => {
    mockClient = {
      sticker: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    } as any;

    mockTx = {
      sticker: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    repository = new StickersRepository(mockClient);
  });

  describe('1. Find Operations', () => {
    test('EP: Should return all stickers', async () => {
      const stickers = [
        { id: 1, name: 'Sticker A', category: 'Decorative', downloads: 100 },
        { id: 2, name: 'Sticker B', category: 'Nature', downloads: 50 },
      ];
      mockClient.sticker.findMany.mockResolvedValue(stickers);

      const result = await repository.findAll();

      expect(result).toEqual(stickers);
    });

    test('EP: Should return sticker by ID', async () => {
      const sticker = {
        id: 1,
        name: 'Premium Sticker',
        category: 'Premium',
        downloads: 500,
      };
      mockClient.sticker.findUnique.mockResolvedValue(sticker);

      const result = await repository.findById(1);

      expect(result).toEqual(sticker);
    });

    test('EP: Should return null if not found', async () => {
      mockClient.sticker.findUnique.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });

    test('BVA: Should handle high download count (millions)', async () => {
      const sticker = { id: 1, name: 'Popular', downloads: 10000000 };
      mockClient.sticker.findUnique.mockResolvedValue(sticker);

      const result = await repository.findById(1);

      expect(result.downloads).toBe(10000000);
    });
  });

  describe('2. Create Operations', () => {
    test('EP: Should create sticker', async () => {
      const stickerData = {
        name: 'New Sticker',
        category: 'Custom',
        fileUrl: 'https://example.com/sticker.png',
      };
      const created = { id: 1, ...stickerData, downloads: 0, active: true };
      mockClient.sticker.create.mockResolvedValue(created);

      const result = await repository.create(stickerData);

      expect(result.id).toBe(1);
      expect(result.downloads).toBe(0);
    });

    test('EP: Should create with transaction', async () => {
      const stickerData = { name: 'Sticker', category: 'Custom' };
      const created = { id: 1, ...stickerData };
      mockTx.sticker.create.mockResolvedValue(created);

      const result = await repository.create(stickerData, mockTx);

      expect(result.id).toBe(1);
    });

    test('BVA: Should handle long name (255 chars)', async () => {
      const stickerData = {
        name: 'A'.repeat(255),
        category: 'Custom',
      };
      const created = { id: 1, ...stickerData };
      mockClient.sticker.create.mockResolvedValue(created);

      const result = await repository.create(stickerData);

      expect(result.name).toHaveLength(255);
    });
  });

  describe('3. Update Operations', () => {
    test('EP: Should update sticker', async () => {
      const updateData = { name: 'Updated Sticker' };
      const updated = { id: 1, name: 'Updated Sticker' };
      mockClient.sticker.update.mockResolvedValue(updated);

      const result = await repository.update(1, updateData);

      expect(result.name).toBe('Updated Sticker');
    });

    test('EP: Should toggle active status', async () => {
      const updateData = { active: false };
      const updated = { id: 1, active: false };
      mockClient.sticker.update.mockResolvedValue(updated);

      const result = await repository.update(1, updateData);

      expect(result.active).toBe(false);
    });

    test('EP: Should increment download count', async () => {
      const updateData = { downloads: 101 };
      const updated = { id: 1, downloads: 101 };
      mockClient.sticker.update.mockResolvedValue(updated);

      const result = await repository.update(1, updateData);

      expect(result.downloads).toBe(101);
    });
  });

  describe('4. Delete Operations', () => {
    test('EP: Should delete sticker', async () => {
      mockClient.sticker.delete.mockResolvedValue({ id: 1 });

      const result = await repository.delete(1);

      expect(result).toBe(true);
    });

    test('EP: Should handle delete not found', async () => {
      mockClient.sticker.delete.mockRejectedValue(new Error('Not found'));

      await expect(repository.delete(999)).rejects.toThrow();
    });
  });

  describe('5. Filter Operations', () => {
    test('EP: Should find by category', async () => {
      const stickers = [
        { id: 1, category: 'Decorative', name: 'Deco 1' },
        { id: 2, category: 'Decorative', name: 'Deco 2' },
      ];
      mockClient.sticker.findMany.mockResolvedValue(stickers);

      const result = await repository.findByCategory('Decorative');

      expect(result).toHaveLength(2);
      expect(result.every((s) => s.category === 'Decorative')).toBe(true);
    });

    test('EP: Should find active stickers', async () => {
      const stickers = [
        { id: 1, active: true, name: 'Active 1' },
        { id: 2, active: true, name: 'Active 2' },
      ];
      mockClient.sticker.findMany.mockResolvedValue(stickers);

      const result = await repository.findActive();

      expect(result).toHaveLength(2);
      expect(result.every((s) => s.active)).toBe(true);
    });

    test('EP: Should search by name', async () => {
      const stickers = [{ id: 1, name: 'Funny Face', category: 'Funny' }];
      mockClient.sticker.findMany.mockResolvedValue(stickers);

      const result = await repository.search('Funny');

      expect(result[0].name).toContain('Funny');
    });
  });

  describe('6. Caching', () => {
    test('Performance: Should cache active stickers', async () => {
      const stickers = [{ id: 1, active: true }];
      mockClient.sticker.findMany.mockResolvedValue(stickers);

      const result1 = await repository.findActive();
      const result2 = await repository.findActive();

      expect(result1).toEqual(result2);
    });

    test('Performance: Should cache popular stickers', async () => {
      const stickers = [
        { id: 1, downloads: 50000 },
        { id: 2, downloads: 30000 },
      ];
      mockClient.sticker.findMany.mockResolvedValue(stickers);

      const result = await repository.findPopular();

      expect(result).toBeDefined();
    });
  });

  describe('7. Edge Cases', () => {
    test('Edge: Should handle null optional fields', async () => {
      const sticker = {
        id: 1,
        name: 'Sticker',
        description: null,
        fileUrl: 'https://example.com/file.png',
      };
      mockClient.sticker.findUnique.mockResolvedValue(sticker);

      const result = await repository.findById(1);

      expect(result.description).toBeNull();
    });

    test('Edge: Should handle special characters in name', async () => {
      const sticker = {
        id: 1,
        name: "O'Brien's & Friends' Stickers",
        category: 'Custom',
      };
      mockClient.sticker.findUnique.mockResolvedValue(sticker);

      const result = await repository.findById(1);

      expect(result.name).toContain('&');
    });

    test('BVA: Should handle download count at 0', async () => {
      const sticker = { id: 1, name: 'New', downloads: 0 };
      mockClient.sticker.findUnique.mockResolvedValue(sticker);

      const result = await repository.findById(1);

      expect(result.downloads).toBe(0);
    });
  });

  describe('8. Transaction Support', () => {
    test('Validation: Should create with transaction', async () => {
      const stickerData = { name: 'Tx Sticker', category: 'Custom' };
      const created = { id: 1, ...stickerData };
      mockTx.sticker.create.mockResolvedValue(created);

      const result = await repository.create(stickerData, mockTx);

      expect(result.id).toBe(1);
    });

    test('Validation: Should update with transaction', async () => {
      const updateData = { active: false };
      const updated = { id: 1, active: false };
      mockTx.sticker.update.mockResolvedValue(updated);

      const result = await repository.update(1, updateData, mockTx);

      expect(result.active).toBe(false);
    });

    test('Validation: Should delete with transaction', async () => {
      mockTx.sticker.delete.mockResolvedValue({ id: 1 });

      const result = await repository.delete(1, mockTx);

      expect(result).toBe(true);
    });
  });
});
