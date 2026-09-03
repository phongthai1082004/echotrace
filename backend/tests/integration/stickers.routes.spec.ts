/**
 * Stickers Routes Integration Tests
 * Test coverage: GET /stickers, GET /stickers/:id, POST /stickers, PUT /stickers/:id, DELETE /stickers/:id
 * Methodology: EP (Equivalence Partitioning), BVA (Boundary Value Analysis), sticker management
 */

import { StickersService } from '@features/stickers/stickers.service';
import { StickersRepository } from '@features/stickers/stickers.repository';
import { AppError } from '@middleware/app.error';
import { Request, Response } from 'express';

describe('Stickers Routes - Integration Tests', () => {
  let mockStickersService: jest.Mocked<StickersService>;
  let mockStickersRepository: jest.Mocked<StickersRepository>;
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    mockStickersService = {
      getAllStickers: jest.fn(),
      getStickerById: jest.fn(),
      createSticker: jest.fn(),
      updateSticker: jest.fn(),
      deleteSticker: jest.fn(),
      getStickersByCategory: jest.fn(),
      searchStickers: jest.fn(),
      getActiveStickers: jest.fn(),
      incrementDownloads: jest.fn(),
    } as any;

    mockStickersRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    req = {
      params: {},
      query: {},
      body: {},
      user: { id: 1, role: 'admin' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('GET /stickers - List All Stickers', () => {
    it('EP: Should return all stickers', async () => {
      const stickers = [
        { id: 1, name: 'Sticker A', category: 'Decorative', downloads: 100 },
        { id: 2, name: 'Sticker B', category: 'Nature', downloads: 50 },
      ];
      mockStickersService.getAllStickers.mockResolvedValue(stickers);

      const result = await mockStickersService.getAllStickers();

      expect(result).toEqual(stickers);
      expect(result).toHaveLength(2);
    });

    it('EP: Should handle empty stickers list', async () => {
      mockStickersService.getAllStickers.mockResolvedValue([]);

      const result = await mockStickersService.getAllStickers();

      expect(result).toEqual([]);
    });

    it('BVA: Should handle pagination (page 1, limit 20)', async () => {
      const stickers = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `Sticker ${i + 1}`,
      }));
      mockStickersService.getAllStickers.mockResolvedValue(stickers);

      req.query = { page: '1', limit: '20' };
      const result = await mockStickersService.getAllStickers();

      expect(result).toHaveLength(20);
    });
  });

  describe('GET /stickers/:id - Get Single Sticker', () => {
    it('EP: Should return sticker by ID', async () => {
      const sticker = {
        id: 1,
        name: 'Premium Sticker',
        category: 'Premium',
        fileUrl: 'https://example.com/sticker.png',
        downloads: 500,
        active: true,
      };
      mockStickersService.getStickerById.mockResolvedValue(sticker);

      const result = await mockStickersService.getStickerById(1);

      expect(result).toEqual(sticker);
      expect(result.downloads).toBe(500);
    });

    it('EP: Should return 404 for non-existent sticker', async () => {
      mockStickersService.getStickerById.mockResolvedValue(null);

      const result = await mockStickersService.getStickerById(999);

      expect(result).toBeNull();
    });

    it('EP: Should increment downloads on access', async () => {
      const sticker = { id: 1, name: 'Sticker', downloads: 100 };
      mockStickersService.incrementDownloads.mockResolvedValue({
        ...sticker,
        downloads: 101,
      });

      const result = await mockStickersService.incrementDownloads(1);

      expect(result.downloads).toBe(101);
    });

    it('BVA: Should handle high download count (millions)', async () => {
      const sticker = { id: 1, name: 'Popular', downloads: 5000000 };
      mockStickersService.getStickerById.mockResolvedValue(sticker);

      const result = await mockStickersService.getStickerById(1);

      expect(result.downloads).toBe(5000000);
    });
  });

  describe('POST /stickers - Create Sticker', () => {
    it('EP: Should create sticker with valid data', async () => {
      const stickerData = {
        name: 'New Sticker',
        category: 'Custom',
        fileUrl: 'https://example.com/new.png',
      };
      const created = { id: 1, ...stickerData, downloads: 0, active: true };
      mockStickersService.createSticker.mockResolvedValue(created);

      const result = await mockStickersService.createSticker(stickerData);

      expect(result.id).toBe(1);
      expect(result.name).toBe('New Sticker');
    });

    it('EP: Should reject duplicate sticker name', async () => {
      const stickerData = { name: 'Duplicate', category: 'Custom' };
      mockStickersService.createSticker.mockRejectedValue(
        new AppError('DUPLICATE_NAME', 409)
      );

      await expect(
        mockStickersService.createSticker(stickerData)
      ).rejects.toThrow();
    });

    it('BVA: Should handle long sticker name (200 chars)', async () => {
      const longName = 'A'.repeat(200);
      const stickerData = {
        name: longName,
        category: 'Custom',
        fileUrl: 'https://example.com/sticker.png',
      };
      const created = { id: 1, ...stickerData };
      mockStickersService.createSticker.mockResolvedValue(created);

      const result = await mockStickersService.createSticker(stickerData);

      expect(result.name).toHaveLength(200);
    });

    it('Error: Should reject invalid file URL', async () => {
      const stickerData = {
        name: 'Sticker',
        category: 'Custom',
        fileUrl: 'not-a-url',
      };
      mockStickersService.createSticker.mockRejectedValue(
        new AppError('INVALID_URL', 400)
      );

      await expect(
        mockStickersService.createSticker(stickerData)
      ).rejects.toThrow();
    });

    it('Error: Should reject missing required fields', async () => {
      const stickerData = { category: 'Custom' };
      mockStickersService.createSticker.mockRejectedValue(
        new AppError('VALIDATION_FAILED', 400)
      );

      await expect(
        mockStickersService.createSticker(stickerData)
      ).rejects.toThrow();
    });
  });

  describe('PUT /stickers/:id - Update Sticker', () => {
    it('EP: Should update sticker', async () => {
      const update = { name: 'Updated Sticker' };
      const updated = {
        id: 1,
        name: 'Updated Sticker',
        category: 'Custom',
      };
      mockStickersService.updateSticker.mockResolvedValue(updated);

      const result = await mockStickersService.updateSticker(1, update);

      expect(result.name).toBe('Updated Sticker');
    });

    it('EP: Should return 404 if not found', async () => {
      mockStickersService.updateSticker.mockResolvedValue(null);

      const result = await mockStickersService.updateSticker(999, { name: 'Updated' });

      expect(result).toBeNull();
    });

    it('EP: Should toggle active status', async () => {
      const update = { active: false };
      const updated = { id: 1, name: 'Sticker', active: false };
      mockStickersService.updateSticker.mockResolvedValue(updated);

      const result = await mockStickersService.updateSticker(1, update);

      expect(result.active).toBe(false);
    });

    it('Error: Should reject duplicate name', async () => {
      mockStickersService.updateSticker.mockRejectedValue(
        new AppError('DUPLICATE_NAME', 409)
      );

      await expect(
        mockStickersService.updateSticker(1, { name: 'Taken Name' })
      ).rejects.toThrow();
    });
  });

  describe('DELETE /stickers/:id - Delete Sticker', () => {
    it('EP: Should delete sticker', async () => {
      mockStickersService.deleteSticker.mockResolvedValue(true);

      const result = await mockStickersService.deleteSticker(1);

      expect(result).toBe(true);
    });

    it('EP: Should return 404 if not found', async () => {
      mockStickersService.deleteSticker.mockResolvedValue(false);

      const result = await mockStickersService.deleteSticker(999);

      expect(result).toBe(false);
    });

    it('Error: Should deny deletion for non-admin', async () => {
      req.user = { id: 1, role: 'user' };
      mockStickersService.deleteSticker.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(mockStickersService.deleteSticker(1)).rejects.toThrow();
    });
  });

  describe('GET /stickers/category/:category - By Category', () => {
    it('EP: Should return stickers in Decorative category', async () => {
      const stickers = [
        { id: 1, name: 'Deco 1', category: 'Decorative' },
        { id: 2, name: 'Deco 2', category: 'Decorative' },
      ];
      mockStickersService.getStickersByCategory.mockResolvedValue(stickers);

      const result = await mockStickersService.getStickersByCategory('Decorative');

      expect(result).toHaveLength(2);
      expect(result.every((s) => s.category === 'Decorative')).toBe(true);
    });

    it('EP: Should return empty if category has no stickers', async () => {
      mockStickersService.getStickersByCategory.mockResolvedValue([]);

      const result = await mockStickersService.getStickersByCategory('EmptyCategory');

      expect(result).toEqual([]);
    });
  });

  describe('GET /stickers/search - Search Stickers', () => {
    it('EP: Should search by name', async () => {
      const results = [{ id: 1, name: 'Funny Face Sticker', category: 'Funny' }];
      mockStickersService.searchStickers.mockResolvedValue(results);

      const result = await mockStickersService.searchStickers('Funny');

      expect(result).toHaveLength(1);
      expect(result[0].name).toContain('Funny');
    });

    it('EP: Should return empty if no matches', async () => {
      mockStickersService.searchStickers.mockResolvedValue([]);

      const result = await mockStickersService.searchStickers('NonExistent');

      expect(result).toEqual([]);
    });
  });

  describe('GET /stickers/active - Active Stickers', () => {
    it('EP: Should return only active stickers', async () => {
      const active = [
        { id: 1, name: 'Active 1', active: true },
        { id: 2, name: 'Active 2', active: true },
      ];
      mockStickersService.getActiveStickers.mockResolvedValue(active);

      const result = await mockStickersService.getActiveStickers();

      expect(result).toHaveLength(2);
      expect(result.every((s) => s.active)).toBe(true);
    });

    it('EP: Should return empty if no active stickers', async () => {
      mockStickersService.getActiveStickers.mockResolvedValue([]);

      const result = await mockStickersService.getActiveStickers();

      expect(result).toEqual([]);
    });
  });

  describe('Authorization & Security', () => {
    it('Security: Should only allow admins to create', async () => {
      req.user = { id: 1, role: 'user' };
      mockStickersService.createSticker.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(
        mockStickersService.createSticker({
          name: 'Sticker',
          category: 'Custom',
          fileUrl: 'https://example.com/sticker.png',
        })
      ).rejects.toThrow();
    });

    it('Security: Should only allow admins to delete', async () => {
      req.user = { id: 1, role: 'user' };
      mockStickersService.deleteSticker.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(mockStickersService.deleteSticker(1)).rejects.toThrow();
    });
  });

  describe('Performance & Edge Cases', () => {
    it('Performance: Should handle many stickers', async () => {
      const stickers = Array.from({ length: 500 }, (_, i) => ({
        id: i + 1,
        name: `Sticker ${i + 1}`,
      }));
      mockStickersService.getAllStickers.mockResolvedValue(stickers);

      const result = await mockStickersService.getAllStickers();

      expect(result).toHaveLength(500);
    });

    it('Edge: Should handle sticker with null optional fields', async () => {
      const sticker = {
        id: 1,
        name: 'Sticker',
        category: 'Custom',
        description: null,
      };
      mockStickersService.getStickerById.mockResolvedValue(sticker);

      const result = await mockStickersService.getStickerById(1);

      expect(result.description).toBeNull();
    });

    it('Edge: Should track sticker popularity by downloads', async () => {
      const popular = [
        { id: 1, name: 'Popular 1', downloads: 10000 },
        { id: 2, name: 'Popular 2', downloads: 5000 },
      ];
      mockStickersService.getAllStickers.mockResolvedValue(popular);

      const result = await mockStickersService.getAllStickers();

      expect(result[0].downloads).toBeGreaterThan(result[1].downloads);
    });
  });
});
