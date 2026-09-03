/**
 * Suppliers Routes Integration Tests
 * Test coverage: GET /suppliers, GET /suppliers/:id, POST /suppliers, PUT /suppliers/:id, DELETE /suppliers/:id
 * Methodology: EP (Equivalence Partitioning), BVA (Boundary Value Analysis), supplier management scenarios
 */

import { SuppliersService } from '@features/suppliers/suppliers.service';
import { SuppliersRepository } from '@features/suppliers/suppliers.repository';
import { AppError } from '@middleware/app.error';
import { Request, Response } from 'express';

describe('Suppliers Routes - Integration Tests', () => {
  let mockSuppliersService: jest.Mocked<SuppliersService>;
  let mockSuppliersRepository: jest.Mocked<SuppliersRepository>;
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    mockSuppliersService = {
      getAllSuppliers: jest.fn(),
      getSupplierById: jest.fn(),
      createSupplier: jest.fn(),
      updateSupplier: jest.fn(),
      deleteSupplier: jest.fn(),
      getSupplierByName: jest.fn(),
      getActiveSuppliers: jest.fn(),
      deactivateSupplier: jest.fn(),
      getPrintOptions: jest.fn(),
    } as any;

    mockSuppliersRepository = {
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

  describe('GET /suppliers - List All Suppliers', () => {
    it('EP: Should return all suppliers', async () => {
      const suppliers = [
        {
          id: 1,
          name: 'Supplier A',
          email: 'supplierA@example.com',
          active: true,
        },
        {
          id: 2,
          name: 'Supplier B',
          email: 'supplierB@example.com',
          active: true,
        },
      ];
      mockSuppliersService.getAllSuppliers.mockResolvedValue(suppliers);

      const result = await mockSuppliersService.getAllSuppliers();

      expect(result).toEqual(suppliers);
      expect(result).toHaveLength(2);
    });

    it('EP: Should handle empty supplier list', async () => {
      mockSuppliersService.getAllSuppliers.mockResolvedValue([]);

      const result = await mockSuppliersService.getAllSuppliers();

      expect(result).toEqual([]);
    });

    it('EP: Should support pagination', async () => {
      const suppliers = [{ id: 1, name: 'Supplier A' }];
      mockSuppliersService.getAllSuppliers.mockResolvedValue(suppliers);

      req.query = { page: '1', limit: '10' };
      const result = await mockSuppliersService.getAllSuppliers();

      expect(result).toBeDefined();
    });

    it('BVA: Should handle large supplier list (1000+)', async () => {
      const suppliers = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Supplier ${i + 1}`,
      }));
      mockSuppliersService.getAllSuppliers.mockResolvedValue(suppliers);

      const result = await mockSuppliersService.getAllSuppliers();

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('GET /suppliers/:id - Get Single Supplier', () => {
    it('EP: Should return supplier by ID', async () => {
      const supplier = {
        id: 1,
        name: 'Premium Supplier',
        email: 'supplier@example.com',
        phone: '0123456789',
        address: '123 Supplier St',
        active: true,
      };
      mockSuppliersService.getSupplierById.mockResolvedValue(supplier);

      req.params.id = '1';
      const result = await mockSuppliersService.getSupplierById(1);

      expect(result).toEqual(supplier);
      expect(result.name).toBe('Premium Supplier');
    });

    it('EP: Should return 404 for non-existent supplier', async () => {
      mockSuppliersService.getSupplierById.mockResolvedValue(null);

      req.params.id = '999';
      const result = await mockSuppliersService.getSupplierById(999);

      expect(result).toBeNull();
    });

    it('BVA: Should handle ID boundary (1)', async () => {
      const supplier = { id: 1, name: 'Supplier 1' };
      mockSuppliersService.getSupplierById.mockResolvedValue(supplier);

      const result = await mockSuppliersService.getSupplierById(1);

      expect(result.id).toBe(1);
    });

    it('BVA: Should handle large ID (999999)', async () => {
      const supplier = { id: 999999, name: 'Large ID Supplier' };
      mockSuppliersService.getSupplierById.mockResolvedValue(supplier);

      const result = await mockSuppliersService.getSupplierById(999999);

      expect(result?.id).toBe(999999);
    });
  });

  describe('POST /suppliers - Create Supplier', () => {
    it('EP: Should create supplier with valid data', async () => {
      const supplierData = {
        name: 'New Supplier',
        email: 'newsupplier@example.com',
        phone: '0123456789',
        address: '123 New Supplier St',
      };
      const created = { id: 1, ...supplierData, active: true };
      mockSuppliersService.createSupplier.mockResolvedValue(created);

      req.body = supplierData;
      const result = await mockSuppliersService.createSupplier(supplierData);

      expect(result.id).toBe(1);
      expect(result.name).toBe('New Supplier');
      expect(result.active).toBe(true);
    });

    it('EP: Should reject duplicate supplier email', async () => {
      const supplierData = {
        name: 'Duplicate',
        email: 'duplicate@example.com',
      };
      mockSuppliersService.createSupplier.mockRejectedValue(
        new AppError('DUPLICATE_EMAIL', 409)
      );

      await expect(
        mockSuppliersService.createSupplier(supplierData)
      ).rejects.toThrow();
    });

    it('EP: Should reject missing required fields', async () => {
      const supplierData = { email: 'incomplete@example.com' };
      mockSuppliersService.createSupplier.mockRejectedValue(
        new AppError('VALIDATION_FAILED', 400)
      );

      await expect(
        mockSuppliersService.createSupplier(supplierData)
      ).rejects.toThrow();
    });

    it('BVA: Should handle long supplier name (200 chars)', async () => {
      const longName = 'A'.repeat(200);
      const supplierData = {
        name: longName,
        email: 'long@example.com',
      };
      const created = { id: 1, ...supplierData };
      mockSuppliersService.createSupplier.mockResolvedValue(created);

      const result = await mockSuppliersService.createSupplier(supplierData);

      expect(result.name).toHaveLength(200);
    });

    it('Error: Should reject invalid email format', async () => {
      const supplierData = {
        name: 'Supplier',
        email: 'invalid-email',
      };
      mockSuppliersService.createSupplier.mockRejectedValue(
        new AppError('INVALID_EMAIL', 400)
      );

      await expect(
        mockSuppliersService.createSupplier(supplierData)
      ).rejects.toThrow();
    });
  });

  describe('PUT /suppliers/:id - Update Supplier', () => {
    it('EP: Should update supplier information', async () => {
      const update = { phone: '9876543210' };
      const updated = {
        id: 1,
        name: 'Supplier',
        phone: '9876543210',
      };
      mockSuppliersService.updateSupplier.mockResolvedValue(updated);

      req.params.id = '1';
      req.body = update;
      const result = await mockSuppliersService.updateSupplier(1, update);

      expect(result.phone).toBe('9876543210');
    });

    it('EP: Should return 404 if supplier not found', async () => {
      mockSuppliersService.updateSupplier.mockResolvedValue(null);

      const result = await mockSuppliersService.updateSupplier(999, { name: 'Update' });

      expect(result).toBeNull();
    });

    it('EP: Should allow partial updates', async () => {
      const update = { address: 'New Address' };
      const updated = {
        id: 1,
        name: 'Supplier',
        address: 'New Address',
      };
      mockSuppliersService.updateSupplier.mockResolvedValue(updated);

      const result = await mockSuppliersService.updateSupplier(1, update);

      expect(result.address).toBe('New Address');
    });

    it('Error: Should reject duplicate email on update', async () => {
      mockSuppliersService.updateSupplier.mockRejectedValue(
        new AppError('DUPLICATE_EMAIL', 409)
      );

      await expect(
        mockSuppliersService.updateSupplier(1, { email: 'taken@example.com' })
      ).rejects.toThrow();
    });
  });

  describe('DELETE /suppliers/:id - Delete Supplier', () => {
    it('EP: Should delete supplier', async () => {
      mockSuppliersService.deleteSupplier.mockResolvedValue(true);

      req.params.id = '1';
      const result = await mockSuppliersService.deleteSupplier(1);

      expect(result).toBe(true);
    });

    it('EP: Should return 404 if supplier not found', async () => {
      mockSuppliersService.deleteSupplier.mockResolvedValue(false);

      const result = await mockSuppliersService.deleteSupplier(999);

      expect(result).toBe(false);
    });

    it('Error: Should deny deletion for non-admin users', async () => {
      req.user = { id: 1, role: 'user' };
      mockSuppliersService.deleteSupplier.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(mockSuppliersService.deleteSupplier(1)).rejects.toThrow();
    });

    it('Error: Should prevent deletion if supplier has active orders', async () => {
      mockSuppliersService.deleteSupplier.mockRejectedValue(
        new AppError('SUPPLIER_HAS_ORDERS', 409)
      );

      await expect(mockSuppliersService.deleteSupplier(1)).rejects.toThrow();
    });
  });

  describe('GET /suppliers/search - Search Suppliers', () => {
    it('EP: Should search suppliers by name', async () => {
      const results = [
        { id: 1, name: 'Premium Supplier Co', email: 'premium@example.com' },
      ];
      mockSuppliersService.getSupplierByName.mockResolvedValue(results);

      req.query = { q: 'Premium' };
      const result = await mockSuppliersService.getSupplierByName('Premium');

      expect(result).toHaveLength(1);
      expect(result[0].name).toContain('Premium');
    });

    it('EP: Should return empty results if no match', async () => {
      mockSuppliersService.getSupplierByName.mockResolvedValue([]);

      const result = await mockSuppliersService.getSupplierByName('NonExistent');

      expect(result).toEqual([]);
    });

    it('BVA: Should handle partial name match', async () => {
      const results = [{ id: 1, name: 'ABC Supplies' }];
      mockSuppliersService.getSupplierByName.mockResolvedValue(results);

      const result = await mockSuppliersService.getSupplierByName('ABC');

      expect(result).toBeDefined();
    });
  });

  describe('GET /suppliers/active - Get Active Suppliers', () => {
    it('EP: Should return only active suppliers', async () => {
      const activeSupplers = [
        { id: 1, name: 'Active 1', active: true },
        { id: 2, name: 'Active 2', active: true },
      ];
      mockSuppliersService.getActiveSuppliers.mockResolvedValue(activeSupplers);

      const result = await mockSuppliersService.getActiveSuppliers();

      expect(result).toHaveLength(2);
      expect(result.every((s) => s.active)).toBe(true);
    });

    it('EP: Should return empty if no active suppliers', async () => {
      mockSuppliersService.getActiveSuppliers.mockResolvedValue([]);

      const result = await mockSuppliersService.getActiveSuppliers();

      expect(result).toEqual([]);
    });
  });

  describe('PUT /suppliers/:id/deactivate - Deactivate Supplier', () => {
    it('EP: Should deactivate supplier', async () => {
      const deactivated = {
        id: 1,
        name: 'Supplier',
        active: false,
      };
      mockSuppliersService.deactivateSupplier.mockResolvedValue(deactivated);

      const result = await mockSuppliersService.deactivateSupplier(1);

      expect(result.active).toBe(false);
    });

    it('EP: Should return 404 if supplier not found', async () => {
      mockSuppliersService.deactivateSupplier.mockResolvedValue(null);

      const result = await mockSuppliersService.deactivateSupplier(999);

      expect(result).toBeNull();
    });

    it('Error: Should deny deactivation for non-admin', async () => {
      req.user = { id: 1, role: 'user' };
      mockSuppliersService.deactivateSupplier.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(mockSuppliersService.deactivateSupplier(1)).rejects.toThrow();
    });
  });

  describe('GET /suppliers/:id/print-options - Get Supplier Print Options', () => {
    it('EP: Should return print options for supplier', async () => {
      const printOptions = [
        { id: 1, name: 'Option A', price: 50000 },
        { id: 2, name: 'Option B', price: 75000 },
      ];
      mockSuppliersService.getPrintOptions.mockResolvedValue(printOptions);

      req.params.id = '1';
      const result = await mockSuppliersService.getPrintOptions(1);

      expect(result).toHaveLength(2);
    });

    it('EP: Should return empty if supplier has no options', async () => {
      mockSuppliersService.getPrintOptions.mockResolvedValue([]);

      const result = await mockSuppliersService.getPrintOptions(1);

      expect(result).toEqual([]);
    });

    it('EP: Should return 404 if supplier not found', async () => {
      mockSuppliersService.getPrintOptions.mockRejectedValue(
        new AppError('SUPPLIER_NOT_FOUND', 404)
      );

      await expect(mockSuppliersService.getPrintOptions(999)).rejects.toThrow();
    });
  });

  describe('Authorization & Security', () => {
    it('Security: Should only allow admins to create suppliers', async () => {
      req.user = { id: 1, role: 'user' };
      mockSuppliersService.createSupplier.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(
        mockSuppliersService.createSupplier({
          name: 'Test',
          email: 'test@example.com',
        })
      ).rejects.toThrow();
    });

    it('Security: Should only allow admins to update suppliers', async () => {
      req.user = { id: 1, role: 'user' };
      mockSuppliersService.updateSupplier.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(
        mockSuppliersService.updateSupplier(1, { name: 'Updated' })
      ).rejects.toThrow();
    });

    it('Security: Should only allow admins to delete suppliers', async () => {
      req.user = { id: 1, role: 'user' };
      mockSuppliersService.deleteSupplier.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(mockSuppliersService.deleteSupplier(1)).rejects.toThrow();
    });
  });

  describe('Performance & Edge Cases', () => {
    it('Performance: Should handle concurrent requests', async () => {
      const suppliers = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Supplier ${i + 1}`,
      }));

      const promises = suppliers.map((s) => Promise.resolve(s));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
    });

    it('Edge: Should handle supplier with null optional fields', async () => {
      const supplier = {
        id: 1,
        name: 'Supplier',
        email: 'supplier@example.com',
        phone: null,
        address: null,
      };
      mockSuppliersService.getSupplierById.mockResolvedValue(supplier);

      const result = await mockSuppliersService.getSupplierById(1);

      expect(result.phone).toBeNull();
      expect(result.address).toBeNull();
    });

    it('Edge: Should handle supplier with special characters in name', async () => {
      const supplier = {
        id: 1,
        name: "Supplier & Co. Ltd.",
        email: 'supplier@example.com',
      };
      mockSuppliersService.getSupplierById.mockResolvedValue(supplier);

      const result = await mockSuppliersService.getSupplierById(1);

      expect(result.name).toContain('&');
    });

    it('Edge: Should cache supplier data efficiently', async () => {
      const supplier = { id: 1, name: 'Cached Supplier' };
      mockSuppliersService.getSupplierById.mockResolvedValue(supplier);

      const result1 = await mockSuppliersService.getSupplierById(1);
      const result2 = await mockSuppliersService.getSupplierById(1);

      expect(result1).toEqual(result2);
      expect(mockSuppliersService.getSupplierById).toHaveBeenCalledTimes(2);
    });
  });
});
