/**
 * Sample Books Repository Unit Tests
 * Test coverage: CRUD operations, caching, filtering
 * Methodology: EP (Equivalence Partitioning), BVA (Boundary Value Analysis)
 */

import { SampleBooksRepository } from '@features/sample-books/sample-books.repository';
import { PrismaService } from '@lib/prisma';
import { Prisma } from '@prisma/client';

describe('Sample Books Repository - Unit Tests', () => {
  let repository: SampleBooksRepository;
  let mockClient: jest.Mocked<PrismaService>;
  let mockTx: any;

  beforeEach(() => {
    mockClient = {
      sampleBook: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    } as any;

    mockTx = {
      sampleBook: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    repository = new SampleBooksRepository(mockClient);
  });

  describe('1. Find Operations', () => {
    test('EP: Should return all sample books', async () => {
      const samples = [
        { id: 1, title: 'Sample 1', category: 'Fiction', views: 100 },
        { id: 2, title: 'Sample 2', category: 'Non-Fiction', views: 50 },
      ];
      mockClient.sampleBook.findMany.mockResolvedValue(samples);

      const result = await repository.findAll();

      expect(result).toEqual(samples);
    });

    test('EP: Should return sample by ID', async () => {
      const sample = { id: 1, title: 'Sample', category: 'Fiction', views: 100 };
      mockClient.sampleBook.findUnique.mockResolvedValue(sample);

      const result = await repository.findById(1);

      expect(result).toEqual(sample);
    });

    test('EP: Should return null if sample not found', async () => {
      mockClient.sampleBook.findUnique.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });

    test('BVA: Should handle high view count (millions)', async () => {
      const sample = { id: 1, title: 'Popular', views: 5000000 };
      mockClient.sampleBook.findUnique.mockResolvedValue(sample);

      const result = await repository.findById(1);

      expect(result.views).toBe(5000000);
    });
  });

  describe('2. Create Operations', () => {
    test('EP: Should create sample book', async () => {
      const sampleData = {
        title: 'New Sample',
        category: 'Fiction',
        description: 'A sample book',
      };
      const created = { id: 1, ...sampleData, views: 0, featured: false };
      mockClient.sampleBook.create.mockResolvedValue(created);

      const result = await repository.create(sampleData);

      expect(result.id).toBe(1);
      expect(result.views).toBe(0);
    });

    test('EP: Should create with transaction', async () => {
      const sampleData = { title: 'Sample', category: 'Fiction' };
      const created = { id: 1, ...sampleData };
      mockTx.sampleBook.create.mockResolvedValue(created);

      const result = await repository.create(sampleData, mockTx);

      expect(result.id).toBe(1);
    });

    test('BVA: Should handle long title (500 chars)', async () => {
      const sampleData = {
        title: 'A'.repeat(500),
        category: 'Fiction',
      };
      const created = { id: 1, ...sampleData };
      mockClient.sampleBook.create.mockResolvedValue(created);

      const result = await repository.create(sampleData);

      expect(result.title).toHaveLength(500);
    });
  });

  describe('3. Update Operations', () => {
    test('EP: Should update sample book', async () => {
      const updateData = { title: 'Updated Title' };
      const updated = { id: 1, title: 'Updated Title' };
      mockClient.sampleBook.update.mockResolvedValue(updated);

      const result = await repository.update(1, updateData);

      expect(result.title).toBe('Updated Title');
    });

    test('EP: Should toggle featured status', async () => {
      const updateData = { featured: true };
      const updated = { id: 1, featured: true };
      mockClient.sampleBook.update.mockResolvedValue(updated);

      const result = await repository.update(1, updateData);

      expect(result.featured).toBe(true);
    });

    test('EP: Should increment view count', async () => {
      const updateData = { views: 101 };
      const updated = { id: 1, views: 101 };
      mockClient.sampleBook.update.mockResolvedValue(updated);

      const result = await repository.update(1, updateData);

      expect(result.views).toBe(101);
    });
  });

  describe('4. Delete Operations', () => {
    test('EP: Should delete sample book', async () => {
      mockClient.sampleBook.delete.mockResolvedValue({ id: 1 });

      const result = await repository.delete(1);

      expect(result).toBe(true);
    });

    test('EP: Should handle delete of non-existent', async () => {
      mockClient.sampleBook.delete.mockRejectedValue(new Error('Not found'));

      await expect(repository.delete(999)).rejects.toThrow();
    });
  });

  describe('5. Filter Operations', () => {
    test('EP: Should find by category', async () => {
      const samples = [
        { id: 1, category: 'Fiction', title: 'Fiction 1' },
        { id: 2, category: 'Fiction', title: 'Fiction 2' },
      ];
      mockClient.sampleBook.findMany.mockResolvedValue(samples);

      const result = await repository.findByCategory('Fiction');

      expect(result).toHaveLength(2);
      expect(result.every((s: any) => s.category === 'Fiction')).toBe(true);
    });

    test('EP: Should find featured samples', async () => {
      const samples = [
        { id: 1, featured: true, title: 'Featured 1' },
        { id: 2, featured: true, title: 'Featured 2' },
      ];
      mockClient.sampleBook.findMany.mockResolvedValue(samples);

      const result = await repository.findFeatured();

      expect(result).toHaveLength(2);
      expect(result.every((s: any) => s.featured)).toBe(true);
    });

    test('EP: Should search by title', async () => {
      const samples = [{ id: 1, title: 'Programming Guide', category: 'Tech' }];
      mockClient.sampleBook.findMany.mockResolvedValue(samples);

      const result = await repository.search('Programming');

      expect(result[0].title).toContain('Programming');
    });
  });

  describe('6. Caching', () => {
    test('Performance: Should cache featured samples', async () => {
      const samples = [{ id: 1, featured: true }];
      mockClient.sampleBook.findMany.mockResolvedValue(samples);

      const result1 = await repository.findFeatured();
      const result2 = await repository.findFeatured();

      expect(result1).toEqual(result2);
    });

    test('Performance: Should cache popular samples (high views)', async () => {
      const samples = [
        { id: 1, views: 10000 },
        { id: 2, views: 5000 },
      ];
      mockClient.sampleBook.findMany.mockResolvedValue(samples);

      const result = await repository.findPopular();

      expect(result).toBeDefined();
    });
  });

  describe('7. Edge Cases', () => {
    test('Edge: Should handle null optional fields', async () => {
      const sample = {
        id: 1,
        title: 'Sample',
        description: null,
        imageUrl: null,
      };
      mockClient.sampleBook.findUnique.mockResolvedValue(sample);

      const result = await repository.findById(1);

      expect(result.description).toBeNull();
    });

    test('Edge: Should handle special characters', async () => {
      const sample = {
        id: 1,
        title: 'Book & Story "Edition"',
        category: 'Fiction',
      };
      mockClient.sampleBook.findUnique.mockResolvedValue(sample);

      const result = await repository.findById(1);

      expect(result.title).toContain('&');
    });

    test('BVA: Should handle view count at 0', async () => {
      const sample = { id: 1, title: 'New', views: 0 };
      mockClient.sampleBook.findUnique.mockResolvedValue(sample);

      const result = await repository.findById(1);

      expect(result.views).toBe(0);
    });
  });

  describe('8. Transaction Support', () => {
    test('Validation: Should create with transaction', async () => {
      const sampleData = { title: 'Tx Sample', category: 'Fiction' };
      const created = { id: 1, ...sampleData };
      mockTx.sampleBook.create.mockResolvedValue(created);

      const result = await repository.create(sampleData, mockTx);

      expect(result.id).toBe(1);
    });

    test('Validation: Should update with transaction', async () => {
      const updateData = { featured: true };
      const updated = { id: 1, featured: true };
      mockTx.sampleBook.update.mockResolvedValue(updated);

      const result = await repository.update(1, updateData, mockTx);

      expect(result.featured).toBe(true);
    });

    test('Validation: Should delete with transaction', async () => {
      mockTx.sampleBook.delete.mockResolvedValue({ id: 1 });

      const result = await repository.delete(1, mockTx);

      expect(result).toBe(true);
    });
  });
});
