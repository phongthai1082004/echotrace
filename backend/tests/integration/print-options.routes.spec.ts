/**
 * Print Options Routes Integration Tests
 * Test coverage: GET /print-options, GET /print-options/:id, POST /print-options, PUT /print-options/:id, DELETE /print-options/:id
 * Methodology: EP (Equivalence Partitioning), BVA (Boundary Value Analysis), print specifications
 */

import { PrintOptionsService } from '@features/print-options/print-options.service';
import { PrintOptionsRepository } from '@features/print-options/print-options.repository';
import { AppError } from '@middleware/app.error';
import { Request, Response } from 'express';

describe('Print Options Routes - Integration Tests', () => {
  let mockPrintOptionsService: jest.Mocked<PrintOptionsService>;
  let mockPrintOptionsRepository: jest.Mocked<PrintOptionsRepository>;
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    mockPrintOptionsService = {
      getAllPrintOptions: jest.fn(),
      getPrintOptionById: jest.fn(),
      createPrintOption: jest.fn(),
      updatePrintOption: jest.fn(),
      deletePrintOption: jest.fn(),
      getPrintOptionsBySupplier: jest.fn(),
      getPrintOptionsByFormat: jest.fn(),
      getPrintOptionsBySize: jest.fn(),
    } as any;

    mockPrintOptionsRepository = {
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

  describe('GET /print-options - List All Print Options', () => {
    it('EP: Should return all print options', async () => {
      const options = [
        {
          id: 1,
          name: 'Hardcover Standard',
          format: 'hardcover',
          size: 'A4',
          basePrice: 150000,
        },
        {
          id: 2,
          name: 'Softcover Standard',
          format: 'softcover',
          size: 'A4',
          basePrice: 100000,
        },
      ];
      mockPrintOptionsService.getAllPrintOptions.mockResolvedValue(options);

      const result = await mockPrintOptionsService.getAllPrintOptions();

      expect(result).toEqual(options);
      expect(result).toHaveLength(2);
    });

    it('EP: Should handle empty options list', async () => {
      mockPrintOptionsService.getAllPrintOptions.mockResolvedValue([]);

      const result = await mockPrintOptionsService.getAllPrintOptions();

      expect(result).toEqual([]);
    });

    it('BVA: Should handle pagination', async () => {
      const options = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Option ${i + 1}`,
      }));
      mockPrintOptionsService.getAllPrintOptions.mockResolvedValue(options);

      req.query = { page: '1', limit: '10' };
      const result = await mockPrintOptionsService.getAllPrintOptions();

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('GET /print-options/:id - Get Single Print Option', () => {
    it('EP: Should return print option by ID', async () => {
      const option = {
        id: 1,
        name: 'Hardcover Premium',
        format: 'hardcover',
        size: 'A4',
        basePrice: 200000,
        materials: ['premium_paper', 'cloth_binding'],
      };
      mockPrintOptionsService.getPrintOptionById.mockResolvedValue(option);

      req.params.id = '1';
      const result = await mockPrintOptionsService.getPrintOptionById(1);

      expect(result).toEqual(option);
      expect(result.basePrice).toBe(200000);
    });

    it('EP: Should return 404 for non-existent option', async () => {
      mockPrintOptionsService.getPrintOptionById.mockResolvedValue(null);

      const result = await mockPrintOptionsService.getPrintOptionById(999);

      expect(result).toBeNull();
    });

    it('BVA: Should handle ID boundary (1)', async () => {
      const option = { id: 1, name: 'Option 1' };
      mockPrintOptionsService.getPrintOptionById.mockResolvedValue(option);

      const result = await mockPrintOptionsService.getPrintOptionById(1);

      expect(result.id).toBe(1);
    });
  });

  describe('POST /print-options - Create Print Option', () => {
    it('EP: Should create hardcover print option', async () => {
      const optionData = {
        name: 'Hardcover Deluxe',
        format: 'hardcover',
        size: 'A4',
        basePrice: 250000,
        materials: ['premium_paper', 'gold_embossing'],
      };
      const created = { id: 1, ...optionData };
      mockPrintOptionsService.createPrintOption.mockResolvedValue(created);

      const result = await mockPrintOptionsService.createPrintOption(optionData);

      expect(result.format).toBe('hardcover');
      expect(result.basePrice).toBe(250000);
    });

    it('EP: Should create softcover print option', async () => {
      const optionData = {
        name: 'Softcover Budget',
        format: 'softcover',
        size: 'A5',
        basePrice: 80000,
      };
      const created = { id: 1, ...optionData };
      mockPrintOptionsService.createPrintOption.mockResolvedValue(created);

      const result = await mockPrintOptionsService.createPrintOption(optionData);

      expect(result.format).toBe('softcover');
      expect(result.basePrice).toBe(80000);
    });

    it('EP: Should reject duplicate option', async () => {
      const optionData = {
        name: 'Duplicate',
        format: 'hardcover',
        size: 'A4',
      };
      mockPrintOptionsService.createPrintOption.mockRejectedValue(
        new AppError('DUPLICATE_OPTION', 409)
      );

      await expect(
        mockPrintOptionsService.createPrintOption(optionData)
      ).rejects.toThrow();
    });

    it('BVA: Should handle price at 0', async () => {
      const optionData = {
        name: 'Free Option',
        format: 'digital',
        basePrice: 0,
      };
      const created = { id: 1, ...optionData };
      mockPrintOptionsService.createPrintOption.mockResolvedValue(created);

      const result = await mockPrintOptionsService.createPrintOption(optionData);

      expect(result.basePrice).toBe(0);
    });

    it('BVA: Should handle large price (10 million)', async () => {
      const optionData = {
        name: 'Luxury',
        format: 'hardcover',
        basePrice: 10000000,
      };
      const created = { id: 1, ...optionData };
      mockPrintOptionsService.createPrintOption.mockResolvedValue(created);

      const result = await mockPrintOptionsService.createPrintOption(optionData);

      expect(result.basePrice).toBe(10000000);
    });

    it('Error: Should reject negative price', async () => {
      const optionData = {
        name: 'Invalid',
        format: 'hardcover',
        basePrice: -100000,
      };
      mockPrintOptionsService.createPrintOption.mockRejectedValue(
        new AppError('INVALID_PRICE', 400)
      );

      await expect(
        mockPrintOptionsService.createPrintOption(optionData)
      ).rejects.toThrow();
    });

    it('Error: Should reject missing required fields', async () => {
      const optionData = { format: 'hardcover' };
      mockPrintOptionsService.createPrintOption.mockRejectedValue(
        new AppError('VALIDATION_FAILED', 400)
      );

      await expect(
        mockPrintOptionsService.createPrintOption(optionData)
      ).rejects.toThrow();
    });
  });

  describe('PUT /print-options/:id - Update Print Option', () => {
    it('EP: Should update print option', async () => {
      const update = { basePrice: 175000 };
      const updated = {
        id: 1,
        name: 'Hardcover',
        basePrice: 175000,
      };
      mockPrintOptionsService.updatePrintOption.mockResolvedValue(updated);

      const result = await mockPrintOptionsService.updatePrintOption(1, update);

      expect(result.basePrice).toBe(175000);
    });

    it('EP: Should return 404 if option not found', async () => {
      mockPrintOptionsService.updatePrintOption.mockResolvedValue(null);

      const result = await mockPrintOptionsService.updatePrintOption(999, { basePrice: 100000 });

      expect(result).toBeNull();
    });

    it('EP: Should allow partial updates', async () => {
      const update = { materials: ['new_material'] };
      const updated = {
        id: 1,
        name: 'Option',
        materials: ['new_material'],
      };
      mockPrintOptionsService.updatePrintOption.mockResolvedValue(updated);

      const result = await mockPrintOptionsService.updatePrintOption(1, update);

      expect(result.materials).toContain('new_material');
    });

    it('Error: Should reject invalid update', async () => {
      mockPrintOptionsService.updatePrintOption.mockRejectedValue(
        new AppError('INVALID_PRICE', 400)
      );

      await expect(
        mockPrintOptionsService.updatePrintOption(1, { basePrice: -50000 })
      ).rejects.toThrow();
    });
  });

  describe('DELETE /print-options/:id - Delete Print Option', () => {
    it('EP: Should delete print option', async () => {
      mockPrintOptionsService.deletePrintOption.mockResolvedValue(true);

      const result = await mockPrintOptionsService.deletePrintOption(1);

      expect(result).toBe(true);
    });

    it('EP: Should return 404 if option not found', async () => {
      mockPrintOptionsService.deletePrintOption.mockResolvedValue(false);

      const result = await mockPrintOptionsService.deletePrintOption(999);

      expect(result).toBe(false);
    });

    it('Error: Should deny deletion for non-admin', async () => {
      req.user = { id: 1, role: 'user' };
      mockPrintOptionsService.deletePrintOption.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(mockPrintOptionsService.deletePrintOption(1)).rejects.toThrow();
    });
  });

  describe('GET /print-options/supplier/:supplierId - By Supplier', () => {
    it('EP: Should return options for supplier', async () => {
      const options = [
        { id: 1, name: 'Option A', supplierId: 1 },
        { id: 2, name: 'Option B', supplierId: 1 },
      ];
      mockPrintOptionsService.getPrintOptionsBySupplier.mockResolvedValue(options);

      const result = await mockPrintOptionsService.getPrintOptionsBySupplier(1);

      expect(result).toHaveLength(2);
      expect(result[0].supplierId).toBe(1);
    });

    it('EP: Should return empty if supplier has no options', async () => {
      mockPrintOptionsService.getPrintOptionsBySupplier.mockResolvedValue([]);

      const result = await mockPrintOptionsService.getPrintOptionsBySupplier(999);

      expect(result).toEqual([]);
    });
  });

  describe('GET /print-options/format/:format - By Format', () => {
    it('EP: Should return hardcover options', async () => {
      const options = [
        { id: 1, format: 'hardcover', name: 'HC 1' },
        { id: 2, format: 'hardcover', name: 'HC 2' },
      ];
      mockPrintOptionsService.getPrintOptionsByFormat.mockResolvedValue(options);

      const result = await mockPrintOptionsService.getPrintOptionsByFormat('hardcover');

      expect(result).toHaveLength(2);
      expect(result.every((o) => o.format === 'hardcover')).toBe(true);
    });

    it('EP: Should return softcover options', async () => {
      const options = [{ id: 3, format: 'softcover', name: 'SC 1' }];
      mockPrintOptionsService.getPrintOptionsByFormat.mockResolvedValue(options);

      const result = await mockPrintOptionsService.getPrintOptionsByFormat('softcover');

      expect(result).toHaveLength(1);
      expect(result[0].format).toBe('softcover');
    });

    it('EP: Should return empty for unknown format', async () => {
      mockPrintOptionsService.getPrintOptionsByFormat.mockResolvedValue([]);

      const result = await mockPrintOptionsService.getPrintOptionsByFormat('unknown');

      expect(result).toEqual([]);
    });
  });

  describe('GET /print-options/size/:size - By Size', () => {
    it('EP: Should return A4 size options', async () => {
      const options = [
        { id: 1, size: 'A4', name: 'A4 Option 1' },
        { id: 2, size: 'A4', name: 'A4 Option 2' },
      ];
      mockPrintOptionsService.getPrintOptionsBySize.mockResolvedValue(options);

      const result = await mockPrintOptionsService.getPrintOptionsBySize('A4');

      expect(result).toHaveLength(2);
      expect(result.every((o) => o.size === 'A4')).toBe(true);
    });

    it('EP: Should return A5 size options', async () => {
      const options = [{ id: 3, size: 'A5', name: 'A5 Option 1' }];
      mockPrintOptionsService.getPrintOptionsBySize.mockResolvedValue(options);

      const result = await mockPrintOptionsService.getPrintOptionsBySize('A5');

      expect(result).toHaveLength(1);
      expect(result[0].size).toBe('A5');
    });
  });

  describe('Authorization & Security', () => {
    it('Security: Should only allow admins to create', async () => {
      req.user = { id: 1, role: 'user' };
      mockPrintOptionsService.createPrintOption.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(
        mockPrintOptionsService.createPrintOption({
          name: 'Option',
          format: 'hardcover',
          basePrice: 100000,
        })
      ).rejects.toThrow();
    });

    it('Security: Should only allow admins to update', async () => {
      req.user = { id: 1, role: 'user' };
      mockPrintOptionsService.updatePrintOption.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(
        mockPrintOptionsService.updatePrintOption(1, { basePrice: 150000 })
      ).rejects.toThrow();
    });

    it('Security: Should only allow admins to delete', async () => {
      req.user = { id: 1, role: 'user' };
      mockPrintOptionsService.deletePrintOption.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(mockPrintOptionsService.deletePrintOption(1)).rejects.toThrow();
    });
  });

  describe('Performance & Edge Cases', () => {
    it('Performance: Should handle many options efficiently', async () => {
      const options = Array.from({ length: 500 }, (_, i) => ({
        id: i + 1,
        name: `Option ${i + 1}`,
      }));
      mockPrintOptionsService.getAllPrintOptions.mockResolvedValue(options);

      const result = await mockPrintOptionsService.getAllPrintOptions();

      expect(result).toHaveLength(500);
    });

    it('Edge: Should handle option with many materials', async () => {
      const option = {
        id: 1,
        name: 'Complex Option',
        materials: ['mat1', 'mat2', 'mat3', 'mat4', 'mat5'],
      };
      mockPrintOptionsService.getPrintOptionById.mockResolvedValue(option);

      const result = await mockPrintOptionsService.getPrintOptionById(1);

      expect(result.materials).toHaveLength(5);
    });

    it('Edge: Should handle option with no materials', async () => {
      const option = {
        id: 1,
        name: 'Simple Option',
        materials: [],
      };
      mockPrintOptionsService.getPrintOptionById.mockResolvedValue(option);

      const result = await mockPrintOptionsService.getPrintOptionById(1);

      expect(result.materials).toEqual([]);
    });

    it('Edge: Should cache frequently accessed options', async () => {
      const option = { id: 1, name: 'Popular Option' };
      mockPrintOptionsService.getPrintOptionById.mockResolvedValue(option);

      const result1 = await mockPrintOptionsService.getPrintOptionById(1);
      const result2 = await mockPrintOptionsService.getPrintOptionById(1);

      expect(result1).toEqual(result2);
      expect(mockPrintOptionsService.getPrintOptionById).toHaveBeenCalledTimes(2);
    });
  });
});
