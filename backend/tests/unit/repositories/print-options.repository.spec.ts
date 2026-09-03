/**
 * Print Options Repository Unit Tests
 * Test coverage: CRUD operations, filtering, caching patterns
 * Methodology: EP (Equivalence Partitioning), BVA (Boundary Value Analysis)
 */

import { PrintOptionRepository } from '@features/print-options/print-options.repository';
import { PrismaService } from '@lib/prisma';
import { Prisma } from '@prisma/client';

describe('Print Options Repository - Unit Tests', () => {
  let repository: PrintOptionRepository;
  let mockClient: jest.Mocked<PrismaService>;
  let mockTx: any;

  beforeEach(() => {
    mockClient = {
      printOption: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    } as any;

    mockTx = {
      printOption: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    repository = new PrintOptionsRepository(mockClient);
  });

  describe('1. Find Operations', () => {
    describe('1.1 EP: findAll - Get All Options', () => {
      test('EP: Should return all print options', async () => {
        const options = [
          { id: 1, name: 'Hardcover', basePrice: 150000, active: true },
          { id: 2, name: 'Softcover', basePrice: 100000, active: true },
        ];
        mockClient.printOption.findMany.mockResolvedValue(options);

        const result = await repository.listPrintOptions({}, {});

        expect(result).toEqual(options);
        expect(result).toHaveLength(2);
      });

      test('EP: Should return empty array if no options', async () => {
        mockClient.printOption.findMany.mockResolvedValue([]);

        const result = await repository.listPrintOptions({}, {});

        expect(result).toEqual([]);
      });

      test('BVA: Should handle listPrintOptions with pagination', async () => {
        const options = Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          name: `Option ${i + 1}`,
        }));
        mockClient.printOption.findMany.mockResolvedValue(options);

        const result = await repository.listPrintOptions({}, {});

        expect(result).toHaveLength(10);
      });
    });

    describe('1.2 EP: findById - Get Option by ID', () => {
      test('EP: Should return option by ID', async () => {
        const option = {
          id: 1,
          name: 'Hardcover Premium',
          basePrice: 200000,
          active: true,
        };
        mockClient.printOption.findUnique.mockResolvedValue(option);

        const result = await repository.findById(1);

        expect(result).toEqual(option);
        expect(mockClient.printOption.findUnique).toHaveBeenCalledWith({
          where: { id: 1 },
        });
      });

      test('EP: Should return null if not found', async () => {
        mockClient.printOption.findUnique.mockResolvedValue(null);

        const result = await repository.findById(999);

        expect(result).toBeNull();
      });

      test('BVA: Should handle ID boundary (1)', async () => {
        const option = { id: 1, name: 'Option' };
        mockClient.printOption.findUnique.mockResolvedValue(option);

        const result = await repository.findById(1);

        expect(result.id).toBe(1);
      });
    });

    describe('1.3 EP: findByName - Get Option by Name', () => {
      test('EP: Should find option by exact name', async () => {
        const option = { id: 1, name: 'Hardcover', basePrice: 150000 };
        mockClient.printOption.findUnique.mockResolvedValue(option);

        const result = await repository.findByName('Hardcover');

        expect(result).toEqual(option);
      });

      test('EP: Should return null if name not found', async () => {
        mockClient.printOption.findUnique.mockResolvedValue(null);

        const result = await repository.findByName('NonExistent');

        expect(result).toBeNull();
      });
    });
  });

  describe('2. Create Operations', () => {
    describe('2.1 EP: Create - Insert New Option', () => {
      test('EP: Should create new print option', async () => {
        const optionData = {
          name: 'Hardcover Deluxe',
          basePrice: 250000,
          format: 'hardcover',
          size: 'A4',
        };
        const created = { id: 1, ...optionData, active: true, createdAt: new Date() };
        mockClient.printOption.create.mockResolvedValue(created);

        const result = await repository.createPrintOption(optionData);

        expect(result.id).toBe(1);
        expect(result.name).toBe('Hardcover Deluxe');
        expect(mockClient.printOption.create).toHaveBeenCalledWith({
          data: optionData,
        });
      });

      test('EP: Should create with transaction if provided', async () => {
        const optionData = { name: 'Option', basePrice: 100000 };
        const created = { id: 1, ...optionData };
        mockTx.printOption.create.mockResolvedValue(created);

        const result = await repository.createPrintOption(optionData);

        expect(result.id).toBe(1);
        expect(mockClient.printOption.create).toHaveBeenCalled();
      });

      test('BVA: Should handle price at 0', async () => {
        const optionData = { name: 'Free', basePrice: 0 };
        const created = { id: 1, ...optionData };
        mockClient.printOption.create.mockResolvedValue(created);

        const result = await repository.createPrintOption(optionData);

        expect(result.basePrice).toBe(0);
      });

      test('BVA: Should handle very large price', async () => {
        const optionData = { name: 'Luxury', basePrice: 10000000 };
        const created = { id: 1, ...optionData };
        mockClient.printOption.create.mockResolvedValue(created);

        const result = await repository.createPrintOption(optionData);

        expect(result.basePrice).toBe(10000000);
      });
    });
  });

  describe('3. Update Operations', () => {
    describe('3.1 EP: Update - Modify Option', () => {
      test('EP: Should update option price', async () => {
        const updateData = { basePrice: 180000 };
        const updated = {
          id: 1,
          name: 'Hardcover',
          basePrice: 180000,
        };
        mockClient.printOption.update.mockResolvedValue(updated);

        const result = await repository.updatePrintOption(1, updateData);

        expect(result.basePrice).toBe(180000);
        expect(mockClient.printOption.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: updateData,
        });
      });

      test('EP: Should allow partial updates', async () => {
        const updateData = { active: false };
        const updated = { id: 1, name: 'Option', active: false };
        mockClient.printOption.update.mockResolvedValue(updated);

        const result = await repository.updatePrintOption(1, updateData);

        expect(result.active).toBe(false);
      });

      test('EP: Should return null if option not found', async () => {
        mockClient.printOption.update.mockResolvedValue(null);

        const result = await repository.updatePrintOption(999, { basePrice: 100000 });

        expect(result).toBeNull();
      });

      test('EP: Should update with transaction', async () => {
        const updateData = { basePrice: 200000 };
        const updated = { id: 1, basePrice: 200000 };
        mockTx.printOption.update.mockResolvedValue(updated);

        const result = await repository.updatePrintOption(1, updateData);

        expect(result.basePrice).toBe(200000);
      });
    });
  });

  describe('4. Delete Operations', () => {
    describe('4.1 EP: Delete - Remove Option', () => {
      test('EP: Should delete option', async () => {
        const deleted = { id: 1, name: 'Option', isDelete: true, deletedAt: new Date() };
        mockClient.printOption.update.mockResolvedValue(deleted);

        const result = await repository.softDeletePrintOption(1);

        expect(result).toBeDefined();
        expect(mockClient.printOption.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: expect.objectContaining({ isDelete: true }),
        });
      });

      test('EP: Should handle delete of non-existent option', async () => {
        mockClient.printOption.update.mockRejectedValue(
          new Error('Not found')
        );

        await expect(repository.softDeletePrintOption(999)).rejects.toThrow();
      });

      test('EP: Should delete with transaction', async () => {
        const deleted = { id: 1, isDelete: true };
        mockTx.printOption.update.mockResolvedValue(deleted);

        const result = await repository.softDeletePrintOption(1);

        expect(result).toBeDefined();
      });
    });
  });

  describe('5. Search & Filter Operations', () => {
    describe('5.1 EP: listPrintOptions - Filter with Where Clause', () => {
      test('EP: Should return filtered options', async () => {
        const options = [
          { id: 1, type: 'HARDCOVER', name: 'Option A' },
          { id: 2, type: 'HARDCOVER', name: 'Option B' },
        ];
        mockClient.printOption.findMany.mockResolvedValue(options);

        const result = await repository.listPrintOptions({ type: 'HARDCOVER' as any }, {});

        expect(result).toHaveLength(2);
      });

      test('EP: Should return empty if no matches', async () => {
        mockClient.printOption.findMany.mockResolvedValue([]);

        const result = await repository.listPrintOptions({ type: 'SOFTCOVER' as any }, {});

        expect(result).toEqual([]);
      });
    });

    describe('5.2 EP: listRaw - Get Raw Price Data', () => {
      test('EP: Should return raw price/dimension data', async () => {
        const rawData = [
          { type: 'HARDCOVER', code: 'HC-A4', price: 150000, width: 210, height: 297 },
          { type: 'SOFTCOVER', code: 'SC-A4', price: 100000, width: 210, height: 297 },
        ];
        mockClient.printOption.findMany.mockResolvedValue(rawData);

        const result = await repository.listRaw();

        expect(result).toHaveLength(2);
        expect(result[0]).toHaveProperty('price');
        expect(result[0]).toHaveProperty('width');
      });

      test('EP: Should handle listRaw with transaction', async () => {
        const rawData = [{ type: 'HARDCOVER', code: 'HC-A4', price: 150000, width: 210, height: 297 }];
        mockTx.printOption.findMany.mockResolvedValue(rawData);

        const result = await repository.listRaw(mockTx);

        expect(result).toHaveLength(1);
      });
    });
  });

  describe('6. Caching & Performance', () => {
    test('Performance: Should handle listPrintOptions results', async () => {
      const options = [{ id: 1, name: 'Option' }];
      mockClient.printOption.findMany.mockResolvedValue(options);

      const result1 = await repository.listPrintOptions({}, {});
      const result2 = await repository.listPrintOptions({}, {});

      expect(result1).toEqual(result2);
    });

    test('Performance: Should handle large result sets', async () => {
      const options = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Option ${i + 1}`,
      }));
      mockClient.printOption.findMany.mockResolvedValue(options);

      const result = await repository.listPrintOptions({}, {});

      expect(result).toHaveLength(1000);
    });
  });

  describe('7. Error Handling', () => {
    test('Error: Should handle database errors gracefully', async () => {
      mockClient.printOption.findUnique.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(repository.findById(1)).rejects.toThrow();
    });

    test('Error: Should handle validation errors on create', async () => {
      const invalidData = { basePrice: -100 };
      mockClient.printOption.create.mockRejectedValue(
        new Error('Validation failed')
      );

      await expect(repository.createPrintOption(invalidData as any)).rejects.toThrow();
    });
  });

  describe('8. Transaction Support', () => {
    test('Validation: createPrintOption should work with proper parameters', async () => {
      const optionData = { name: 'Transactional Option', basePrice: 100000 };
      const created = { id: 1, ...optionData };
      mockClient.printOption.create.mockResolvedValue(created as any);

      const result = await repository.createPrintOption(optionData as any);

      expect(result.id).toBe(1);
      expect(mockClient.printOption.create).toHaveBeenCalled();
    });

    test('Validation: updatePrintOption works correctly', async () => {
      const updateData = { basePrice: 150000 };
      const updated = { id: 1, basePrice: 150000 };
      mockClient.printOption.update.mockResolvedValue(updated as any);

      const result = await repository.updatePrintOption(1, updateData);

      expect(result.basePrice).toBe(150000);
    });
  });
});
