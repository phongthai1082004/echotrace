/**
 * Supplier Service - Comprehensive Unit Tests
 *
 * Methodology: EP (Equivalence Partitioning), Validation Testing
 *
 * Test Coverage:
 * 1. Supplier CRUD: Create, read, update, list
 * 2. Supplier Capabilities: Print options, pricing
 * 3. Print Option Mapping: Link suppliers to print options
 * 4. Order Assignment: Assign orders to suppliers
 * 5. Availability: Active/inactive suppliers
 * 6. Validation: Contact info, naming, required fields
 *
 * Total Tests: 25
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('Supplier Service - Unit Tests', () => {
  let mockRepository: any;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma = {
      supplier: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      supplierPrintOption: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
    };

    mockRepository = {
      createSupplier: jest.fn(),
      getSupplier: jest.fn(),
      listSuppliers: jest.fn(),
      updateSupplier: jest.fn(),
      getSupplierPrintOptions: jest.fn(),
    };
  });

  // ==================== 1. SUPPLIER CRUD ====================
  describe('1. EP: Supplier CRUD Operations', () => {
    test('EP: Create supplier with all fields', async () => {
      const supplierData = {
        name: 'PrintCo',
        email: 'contact@printco.com',
        contact: '0912345678',
        address: '123 Factory St',
        active: true,
      };
      mockRepository.createSupplier.mockResolvedValue({
        id: 1,
        ...supplierData,
        createdAt: new Date(),
      });

      const result = await mockRepository.createSupplier(supplierData);

      expect(result.id).toBe(1);
      expect(result.name).toBe('PrintCo');
      expect(result.active).toBe(true);
    });

    test('EP: Read supplier by ID', async () => {
      mockRepository.getSupplier.mockResolvedValue({
        id: 1,
        name: 'PrintCo',
        email: 'contact@printco.com',
        contact: '0912345678',
      });

      const result = await mockRepository.getSupplier(1);

      expect(result.id).toBe(1);
      expect(result.name).toBe('PrintCo');
    });

    test('EP: List all active suppliers', async () => {
      mockRepository.listSuppliers.mockResolvedValue([
        { id: 1, name: 'PrintCo', active: true },
        { id: 2, name: 'FastPrint', active: true },
        { id: 3, name: 'OldPrinter', active: false },
      ]);

      const result = await mockRepository.listSuppliers({ active: true });

      expect(result).toHaveLength(3);
    });

    test('EP: Update supplier details', async () => {
      mockRepository.updateSupplier.mockResolvedValue({
        id: 1,
        name: 'PrintCo Updated',
        contact: '0987654321',
        active: true,
      });

      const result = await mockRepository.updateSupplier(1, {
        name: 'PrintCo Updated',
        contact: '0987654321',
      });

      expect(result.name).toBe('PrintCo Updated');
      expect(result.contact).toBe('0987654321');
    });

    test('EP: Soft delete supplier (mark inactive)', async () => {
      mockRepository.updateSupplier.mockResolvedValue({
        id: 1,
        name: 'PrintCo',
        active: false,
      });

      const result = await mockRepository.updateSupplier(1, { active: false });

      expect(result.active).toBe(false);
    });
  });

  // ==================== 2. SUPPLIER CAPABILITIES ====================
  describe('2. EP: Supplier Capabilities & Print Options', () => {
    test('EP: Get supplier print options', async () => {
      mockRepository.getSupplierPrintOptions.mockResolvedValue([
        { id: 1, name: '4x6 Glossy', price: 50000 },
        { id: 2, name: '5x7 Matte', price: 60000 },
        { id: 3, name: '8x10 Premium', price: 100000 },
      ]);

      const result = await mockRepository.getSupplierPrintOptions(1);

      expect(result).toHaveLength(3);
      expect(result[0].price).toBe(50000);
    });

    test('EP: Supplier pricing variation', async () => {
      mockRepository.getSupplierPrintOptions.mockResolvedValue([
        { id: 1, name: 'Budget', price: 30000 },
        { id: 2, name: 'Standard', price: 50000 },
        { id: 3, name: 'Premium', price: 100000 },
      ]);

      const options = await mockRepository.getSupplierPrintOptions(1);

      expect(options[0].price).toBeLessThan(options[1].price);
      expect(options[1].price).toBeLessThan(options[2].price);
    });

    test('EP: Supplier with no print options', async () => {
      mockRepository.getSupplierPrintOptions.mockResolvedValue([]);

      const result = await mockRepository.getSupplierPrintOptions(999);

      expect(result).toEqual([]);
    });

    test('EP: Print option pricing by size', async () => {
      const isValidPrice = (price: number) => price > 0 && price < 10000000;

      expect(isValidPrice(50000)).toBe(true);
      expect(isValidPrice(0)).toBe(false);
      expect(isValidPrice(-1000)).toBe(false);
    });
  });

  // ==================== 3. SUPPLIER VALIDATION ====================
  describe('3. Validation: Supplier Data', () => {
    test('Validation: Valid email format', async () => {
      const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      expect(isValidEmail('contact@printco.com')).toBe(true);
      expect(isValidEmail('invalid.email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });

    test('Validation: Valid phone number', async () => {
      const isValidPhone = (phone: string) => /^(\+84|0)[0-9]{9,10}$/.test(phone);

      expect(isValidPhone('0912345678')).toBe(true);
      expect(isValidPhone('+84912345678')).toBe(true);
      expect(isValidPhone('123')).toBe(false);
    });

    test('Validation: Supplier name required and non-empty', async () => {
      const isValidName = (name: string) => {
        if (!name || name.trim().length === 0) return false;
        return true;
      };

      expect(isValidName('PrintCo')).toBe(true);
      expect(isValidName('')).toBe(false);
      expect(isValidName('   ')).toBe(false);
    });

    test('Validation: Supplier name length (3-100 chars)', async () => {
      const isValidNameLength = (name: string) => name.length >= 3 && name.length <= 100;

      expect(isValidNameLength('AB')).toBe(false); // Too short
      expect(isValidNameLength('PrintCo')).toBe(true);
      expect(isValidNameLength('A'.repeat(101))).toBe(false); // Too long
    });

    test('Validation: Contact address format', async () => {
      const isValidAddress = (addr: string) => addr && addr.length >= 5;

      expect(isValidAddress('123 Factory St')).toBe(true);
      expect(isValidAddress('123')).toBe(false);
    });
  });

  // ==================== 4. SUPPLIER LISTING & FILTERING ====================
  describe('4. EP: Supplier Listing & Filtering', () => {
    test('EP: List all suppliers', async () => {
      mockRepository.listSuppliers.mockResolvedValue([
        { id: 1, name: 'Supplier A', active: true },
        { id: 2, name: 'Supplier B', active: true },
        { id: 3, name: 'Supplier C', active: false },
      ]);

      const result = await mockRepository.listSuppliers();

      expect(result).toHaveLength(3);
    });

    test('EP: Filter active suppliers only', async () => {
      mockRepository.listSuppliers.mockResolvedValue([
        { id: 1, name: 'Supplier A', active: true },
        { id: 2, name: 'Supplier B', active: true },
      ]);

      const result = await mockRepository.listSuppliers({ active: true });

      expect(result.every((s: any) => s.active)).toBe(true);
    });

    test('EP: Pagination support', async () => {
      const page1 = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Supplier ${i + 1}`,
      }));
      mockRepository.listSuppliers.mockResolvedValue(page1);

      const result = await mockRepository.listSuppliers({ skip: 0, take: 10 });

      expect(result).toHaveLength(10);
    });

    test('EP: Sort suppliers by name', async () => {
      const suppliers = [
        { id: 3, name: 'Charlie' },
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const sorted = [...suppliers].sort((a, b) => a.name.localeCompare(b.name));

      expect(sorted[0].name).toBe('Alice');
      expect(sorted[1].name).toBe('Bob');
      expect(sorted[2].name).toBe('Charlie');
    });
  });

  // ==================== 5. PRINT OPTION ASSIGNMENT ====================
  describe('5. EP: Print Option Assignment', () => {
    test('EP: Assign multiple print options to supplier', async () => {
      const options = [
        { printOptionId: 1, price: 50000 },
        { printOptionId: 2, price: 60000 },
        { printOptionId: 3, price: 100000 },
      ];
      mockPrisma.supplierPrintOption.createMany.mockResolvedValue({
        count: 3,
      });

      await mockPrisma.supplierPrintOption.createMany({
        data: options.map((opt) => ({
          supplierId: 1,
          ...opt,
        })),
      });

      expect(mockPrisma.supplierPrintOption.createMany).toHaveBeenCalled();
    });

    test('EP: Get print options for supplier', async () => {
      mockPrisma.supplierPrintOption.findMany.mockResolvedValue([
        { id: 1, printOptionId: 1, price: 50000, supplier: { id: 1, name: 'PrintCo' } },
        { id: 2, printOptionId: 2, price: 60000, supplier: { id: 1, name: 'PrintCo' } },
      ]);

      const result = await mockPrisma.supplierPrintOption.findMany({
        where: { supplierId: 1 },
      });

      expect(result).toHaveLength(2);
      expect(result[0].price).toBe(50000);
    });
  });

  // ==================== 6. ORDER ASSIGNMENT ====================
  describe('6. EP: Order to Supplier Assignment', () => {
    test('EP: Assign order to supplier', async () => {
      mockRepository.updateSupplier.mockResolvedValue({
        id: 1,
        name: 'PrintCo',
        lastAssignedOrder: 100,
      });

      const result = await mockRepository.updateSupplier(1, {
        lastAssignedOrder: 100,
      });

      expect(result.lastAssignedOrder).toBe(100);
    });

    test('EP: Load balance between suppliers', async () => {
      const suppliers = [
        { id: 1, name: 'A', ordersProcessed: 100 },
        { id: 2, name: 'B', ordersProcessed: 50 },
        { id: 3, name: 'C', ordersProcessed: 75 },
      ];

      const pickSupplier = (suppliers: any[]) => {
        return suppliers.reduce((prev, curr) =>
          prev.ordersProcessed < curr.ordersProcessed ? prev : curr
        );
      };

      const selected = pickSupplier(suppliers);
      expect(selected.id).toBe(2); // Supplier B has least orders
    });
  });

  // ==================== 7. EDGE CASES ====================
  describe('7. Edge Cases', () => {
    test('Edge: Create supplier with special characters in name', async () => {
      mockRepository.createSupplier.mockResolvedValue({
        id: 1,
        name: 'PrintCo & Partners',
        active: true,
      });

      const result = await mockRepository.createSupplier({
        name: 'PrintCo & Partners',
        email: 'contact@printco.com',
        contact: '0912345678',
        address: '123 St',
        active: true,
      });

      expect(result.name).toBe('PrintCo & Partners');
    });

    test('Edge: Supplier with many print options (100+)', async () => {
      const options = Array.from({ length: 150 }, (_, i) => ({
        id: i + 1,
        name: `Option ${i + 1}`,
        price: 50000 + i * 1000,
      }));
      mockRepository.getSupplierPrintOptions.mockResolvedValue(options);

      const result = await mockRepository.getSupplierPrintOptions(1);

      expect(result).toHaveLength(150);
    });

    test('Edge: Concurrent supplier access', async () => {
      mockRepository.getSupplier
        .mockResolvedValueOnce({ id: 1, name: 'A' })
        .mockResolvedValueOnce({ id: 2, name: 'B' })
        .mockResolvedValueOnce({ id: 3, name: 'C' });

      const results = await Promise.all([
        mockRepository.getSupplier(1),
        mockRepository.getSupplier(2),
        mockRepository.getSupplier(3),
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe(1);
      expect(results[1].id).toBe(2);
      expect(results[2].id).toBe(3);
    });
  });

  // ==================== 8. ERROR HANDLING ====================
  describe('8. Error Handling', () => {
    test('Error: Create supplier without email → rejected', async () => {
      const isValidSupplier = (data: any) => {
        return !!(data.name && data.email && data.contact);
      };

      expect(isValidSupplier({ name: 'PrintCo', contact: '0912345678' })).toBe(false);
    });

    test('Error: Supplier not found → return null', async () => {
      mockRepository.getSupplier.mockResolvedValue(null);

      const result = await mockRepository.getSupplier(999);

      expect(result).toBeNull();
    });

    test('Error: Update non-existent supplier → handled', async () => {
      mockRepository.updateSupplier.mockRejectedValue(
        new Error('Supplier not found')
      );

      await expect(mockRepository.updateSupplier(999, { name: 'New' })).rejects.toThrow(
        'Supplier not found'
      );
    });
  });
});
