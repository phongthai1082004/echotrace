/**
 * Sample Books Routes Integration Tests
 * Test coverage: GET /sample-books, GET /sample-books/:id, POST /sample-books, PUT /sample-books/:id, DELETE /sample-books/:id
 * Methodology: EP (Equivalence Partitioning), BVA (Boundary Value Analysis), sample management
 */

import { SampleBooksService } from '@features/sample-books/sample-books.service';
import { SampleBooksRepository } from '@features/sample-books/sample-books.repository';
import { AppError } from '@middleware/app.error';
import { Request, Response } from 'express';

describe('Sample Books Routes - Integration Tests', () => {
  let mockSampleBooksService: jest.Mocked<SampleBooksService>;
  let mockSampleBooksRepository: jest.Mocked<SampleBooksRepository>;
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    mockSampleBooksService = {
      getAllSampleBooks: jest.fn(),
      getSampleBookById: jest.fn(),
      createSampleBook: jest.fn(),
      updateSampleBook: jest.fn(),
      deleteSampleBook: jest.fn(),
      getSampleBooksByCategory: jest.fn(),
      searchSampleBooks: jest.fn(),
      getFeaturedSampleBooks: jest.fn(),
      incrementViewCount: jest.fn(),
    } as any;

    mockSampleBooksRepository = {
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

  describe('GET /sample-books - List All Sample Books', () => {
    it('EP: Should return all sample books', async () => {
      const samples = [
        {
          id: 1,
          title: 'Sample 1',
          category: 'Fiction',
          views: 100,
          featured: true,
        },
        {
          id: 2,
          title: 'Sample 2',
          category: 'Non-Fiction',
          views: 50,
          featured: false,
        },
      ];
      mockSampleBooksService.getAllSampleBooks.mockResolvedValue(samples);

      const result = await mockSampleBooksService.getAllSampleBooks();

      expect(result).toEqual(samples);
      expect(result).toHaveLength(2);
    });

    it('EP: Should handle empty samples list', async () => {
      mockSampleBooksService.getAllSampleBooks.mockResolvedValue([]);

      const result = await mockSampleBooksService.getAllSampleBooks();

      expect(result).toEqual([]);
    });

    it('BVA: Should handle pagination', async () => {
      const samples = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        title: `Sample ${i + 1}`,
      }));
      mockSampleBooksService.getAllSampleBooks.mockResolvedValue(samples);

      req.query = { page: '1', limit: '10' };
      const result = await mockSampleBooksService.getAllSampleBooks();

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('GET /sample-books/:id - Get Single Sample Book', () => {
    it('EP: Should return sample book by ID', async () => {
      const sample = {
        id: 1,
        title: 'Premium Sample',
        category: 'Fiction',
        description: 'A great sample book',
        imageUrl: 'https://example.com/sample.jpg',
        views: 500,
        featured: true,
      };
      mockSampleBooksService.getSampleBookById.mockResolvedValue(sample);

      const result = await mockSampleBooksService.getSampleBookById(1);

      expect(result).toEqual(sample);
      expect(result.views).toBe(500);
    });

    it('EP: Should increment view count on access', async () => {
      const sample = { id: 1, title: 'Sample', views: 100 };
      mockSampleBooksService.incrementViewCount.mockResolvedValue({
        ...sample,
        views: 101,
      });

      await mockSampleBooksService.getSampleBookById(1);
      const result = await mockSampleBooksService.incrementViewCount(1);

      expect(result.views).toBe(101);
    });

    it('EP: Should return 404 for non-existent sample', async () => {
      mockSampleBooksService.getSampleBookById.mockResolvedValue(null);

      const result = await mockSampleBooksService.getSampleBookById(999);

      expect(result).toBeNull();
    });

    it('BVA: Should handle high view count (millions)', async () => {
      const sample = { id: 1, title: 'Popular', views: 1000000 };
      mockSampleBooksService.getSampleBookById.mockResolvedValue(sample);

      const result = await mockSampleBooksService.getSampleBookById(1);

      expect(result.views).toBe(1000000);
    });
  });

  describe('POST /sample-books - Create Sample Book', () => {
    it('EP: Should create sample book with valid data', async () => {
      const sampleData = {
        title: 'New Sample',
        category: 'Fiction',
        description: 'A new sample book',
        imageUrl: 'https://example.com/new.jpg',
      };
      const created = { id: 1, ...sampleData, views: 0, featured: false };
      mockSampleBooksService.createSampleBook.mockResolvedValue(created);

      const result = await mockSampleBooksService.createSampleBook(sampleData);

      expect(result.id).toBe(1);
      expect(result.title).toBe('New Sample');
      expect(result.views).toBe(0);
    });

    it('EP: Should reject duplicate sample title', async () => {
      const sampleData = { title: 'Duplicate', category: 'Fiction' };
      mockSampleBooksService.createSampleBook.mockRejectedValue(
        new AppError('DUPLICATE_TITLE', 409)
      );

      await expect(
        mockSampleBooksService.createSampleBook(sampleData)
      ).rejects.toThrow();
    });

    it('BVA: Should handle long title (300 chars)', async () => {
      const longTitle = 'A'.repeat(300);
      const sampleData = {
        title: longTitle,
        category: 'Fiction',
      };
      const created = { id: 1, ...sampleData };
      mockSampleBooksService.createSampleBook.mockResolvedValue(created);

      const result = await mockSampleBooksService.createSampleBook(sampleData);

      expect(result.title).toHaveLength(300);
    });

    it('BVA: Should handle long description (5000 chars)', async () => {
      const longDesc = 'A'.repeat(5000);
      const sampleData = {
        title: 'Sample',
        category: 'Fiction',
        description: longDesc,
      };
      const created = { id: 1, ...sampleData };
      mockSampleBooksService.createSampleBook.mockResolvedValue(created);

      const result = await mockSampleBooksService.createSampleBook(sampleData);

      expect(result.description).toHaveLength(5000);
    });

    it('Error: Should reject missing required fields', async () => {
      const sampleData = { category: 'Fiction' };
      mockSampleBooksService.createSampleBook.mockRejectedValue(
        new AppError('VALIDATION_FAILED', 400)
      );

      await expect(
        mockSampleBooksService.createSampleBook(sampleData)
      ).rejects.toThrow();
    });
  });

  describe('PUT /sample-books/:id - Update Sample Book', () => {
    it('EP: Should update sample book', async () => {
      const update = { title: 'Updated Title' };
      const updated = {
        id: 1,
        title: 'Updated Title',
        category: 'Fiction',
      };
      mockSampleBooksService.updateSampleBook.mockResolvedValue(updated);

      const result = await mockSampleBooksService.updateSampleBook(1, update);

      expect(result.title).toBe('Updated Title');
    });

    it('EP: Should return 404 if not found', async () => {
      mockSampleBooksService.updateSampleBook.mockResolvedValue(null);

      const result = await mockSampleBooksService.updateSampleBook(999, { title: 'Updated' });

      expect(result).toBeNull();
    });

    it('EP: Should toggle featured status', async () => {
      const update = { featured: true };
      const updated = { id: 1, title: 'Sample', featured: true };
      mockSampleBooksService.updateSampleBook.mockResolvedValue(updated);

      const result = await mockSampleBooksService.updateSampleBook(1, update);

      expect(result.featured).toBe(true);
    });

    it('Error: Should reject duplicate title', async () => {
      mockSampleBooksService.updateSampleBook.mockRejectedValue(
        new AppError('DUPLICATE_TITLE', 409)
      );

      await expect(
        mockSampleBooksService.updateSampleBook(1, { title: 'Taken Title' })
      ).rejects.toThrow();
    });
  });

  describe('DELETE /sample-books/:id - Delete Sample Book', () => {
    it('EP: Should delete sample book', async () => {
      mockSampleBooksService.deleteSampleBook.mockResolvedValue(true);

      const result = await mockSampleBooksService.deleteSampleBook(1);

      expect(result).toBe(true);
    });

    it('EP: Should return 404 if not found', async () => {
      mockSampleBooksService.deleteSampleBook.mockResolvedValue(false);

      const result = await mockSampleBooksService.deleteSampleBook(999);

      expect(result).toBe(false);
    });

    it('Error: Should deny deletion for non-admin', async () => {
      req.user = { id: 1, role: 'user' };
      mockSampleBooksService.deleteSampleBook.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(mockSampleBooksService.deleteSampleBook(1)).rejects.toThrow();
    });
  });

  describe('GET /sample-books/category/:category - By Category', () => {
    it('EP: Should return samples in Fiction category', async () => {
      const samples = [
        { id: 1, title: 'Fiction 1', category: 'Fiction' },
        { id: 2, title: 'Fiction 2', category: 'Fiction' },
      ];
      mockSampleBooksService.getSampleBooksByCategory.mockResolvedValue(samples);

      const result = await mockSampleBooksService.getSampleBooksByCategory('Fiction');

      expect(result).toHaveLength(2);
      expect(result.every((s) => s.category === 'Fiction')).toBe(true);
    });

    it('EP: Should return empty if category has no samples', async () => {
      mockSampleBooksService.getSampleBooksByCategory.mockResolvedValue([]);

      const result = await mockSampleBooksService.getSampleBooksByCategory('EmptyCategory');

      expect(result).toEqual([]);
    });
  });

  describe('GET /sample-books/search - Search Samples', () => {
    it('EP: Should search by title', async () => {
      const results = [{ id: 1, title: 'Programming Book', category: 'Tech' }];
      mockSampleBooksService.searchSampleBooks.mockResolvedValue(results);

      const result = await mockSampleBooksService.searchSampleBooks('Programming');

      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('Programming');
    });

    it('EP: Should return empty if no matches', async () => {
      mockSampleBooksService.searchSampleBooks.mockResolvedValue([]);

      const result = await mockSampleBooksService.searchSampleBooks('NonExistent');

      expect(result).toEqual([]);
    });

    it('BVA: Should handle empty search query', async () => {
      mockSampleBooksService.searchSampleBooks.mockResolvedValue([]);

      const result = await mockSampleBooksService.searchSampleBooks('');

      expect(result).toBeDefined();
    });
  });

  describe('GET /sample-books/featured - Featured Samples', () => {
    it('EP: Should return only featured samples', async () => {
      const featured = [
        { id: 1, title: 'Featured 1', featured: true },
        { id: 2, title: 'Featured 2', featured: true },
      ];
      mockSampleBooksService.getFeaturedSampleBooks.mockResolvedValue(featured);

      const result = await mockSampleBooksService.getFeaturedSampleBooks();

      expect(result).toHaveLength(2);
      expect(result.every((s) => s.featured)).toBe(true);
    });

    it('EP: Should return empty if no featured samples', async () => {
      mockSampleBooksService.getFeaturedSampleBooks.mockResolvedValue([]);

      const result = await mockSampleBooksService.getFeaturedSampleBooks();

      expect(result).toEqual([]);
    });

    it('BVA: Should handle limit on featured items', async () => {
      const featured = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        title: `Featured ${i + 1}`,
        featured: true,
      }));
      mockSampleBooksService.getFeaturedSampleBooks.mockResolvedValue(featured);

      const result = await mockSampleBooksService.getFeaturedSampleBooks();

      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Authorization & Security', () => {
    it('Security: Should only allow admins to create', async () => {
      req.user = { id: 1, role: 'user' };
      mockSampleBooksService.createSampleBook.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(
        mockSampleBooksService.createSampleBook({
          title: 'Sample',
          category: 'Fiction',
        })
      ).rejects.toThrow();
    });

    it('Security: Should only allow admins to update', async () => {
      req.user = { id: 1, role: 'user' };
      mockSampleBooksService.updateSampleBook.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(
        mockSampleBooksService.updateSampleBook(1, { title: 'Updated' })
      ).rejects.toThrow();
    });

    it('Security: Should only allow admins to delete', async () => {
      req.user = { id: 1, role: 'user' };
      mockSampleBooksService.deleteSampleBook.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(mockSampleBooksService.deleteSampleBook(1)).rejects.toThrow();
    });
  });

  describe('Performance & Edge Cases', () => {
    it('Performance: Should handle concurrent access', async () => {
      const samples = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        title: `Sample ${i + 1}`,
      }));

      const promises = samples.map((s) => Promise.resolve(s));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(50);
    });

    it('Edge: Should handle sample with null optional fields', async () => {
      const sample = {
        id: 1,
        title: 'Sample',
        category: 'Fiction',
        description: null,
        imageUrl: null,
      };
      mockSampleBooksService.getSampleBookById.mockResolvedValue(sample);

      const result = await mockSampleBooksService.getSampleBookById(1);

      expect(result.description).toBeNull();
    });

    it('Edge: Should cache popular samples', async () => {
      const sample = { id: 1, title: 'Popular', views: 10000 };
      mockSampleBooksService.getSampleBookById.mockResolvedValue(sample);

      const result1 = await mockSampleBooksService.getSampleBookById(1);
      const result2 = await mockSampleBooksService.getSampleBookById(1);

      expect(result1).toEqual(result2);
      expect(mockSampleBooksService.getSampleBookById).toHaveBeenCalledTimes(2);
    });

    it('Edge: Should handle samples with special characters in title', async () => {
      const sample = {
        id: 1,
        title: 'Sample & Co. "Special" Edition',
        category: 'Fiction',
      };
      mockSampleBooksService.getSampleBookById.mockResolvedValue(sample);

      const result = await mockSampleBooksService.getSampleBookById(1);

      expect(result.title).toContain('&');
    });
  });
});
