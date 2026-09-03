import { SuppliersRepository } from '@features/suppliers/suppliers.repository';
import { PrismaService } from '@lib/prisma';
import { Prisma } from '@prisma/client';

describe('SuppliersRepository - Unit Tests', () => {
  let repo: SuppliersRepository;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    mockPrismaService = {
      db: {
        supplier: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        supplierPrintOption: {
          findMany: jest.fn(),
        },
        printOption: {
          findMany: jest.fn(),
        },
      },
    } as unknown as jest.Mocked<PrismaService>;

    repo = new SuppliersRepository(mockPrismaService);
  });

  describe('findSupplierById', () => {
    it('EP: Should find supplier by id', async () => {
      const mockSupplier = {
        id: 1,
        name: 'Supplier A',
        email: 'supplier@example.com',
        paymentTerms: 30,
      };

      mockPrismaService.db.supplier.findUnique.mockResolvedValue(mockSupplier as any);

      const result = await repo.findSupplierById(1);

      expect(result).toEqual(mockSupplier);
      expect(mockPrismaService.db.supplier.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('EP: Should return null for non-existent supplier', async () => {
      mockPrismaService.db.supplier.findUnique.mockResolvedValue(null);

      const result = await repo.findSupplierById(999);

      expect(result).toBeNull();
    });

    it('BVA: Should find supplier with boundary id (1)', async () => {
      mockPrismaService.db.supplier.findUnique.mockResolvedValue(null);

      await repo.findSupplierById(1);

      expect(mockPrismaService.db.supplier.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('listSuppliers', () => {
    it('EP: Should list all suppliers', async () => {
      const mockSuppliers = [
        { id: 1, name: 'Supplier A' },
        { id: 2, name: 'Supplier B' },
        { id: 3, name: 'Supplier C' },
      ];

      mockPrismaService.db.supplier.findMany.mockResolvedValue(mockSuppliers as any);

      const result = await repo.listSuppliers();

      expect(result).toHaveLength(3);
      expect(mockPrismaService.db.supplier.findMany).toHaveBeenCalled();
    });

    it('EP: Should return empty array when no suppliers', async () => {
      mockPrismaService.db.supplier.findMany.mockResolvedValue([]);

      const result = await repo.listSuppliers();

      expect(result).toEqual([]);
    });

    it('BVA: Should handle large supplier list', async () => {
      const mockSuppliers = Array.from({ length: 500 }, (_, i) => ({
        id: i + 1,
        name: `Supplier ${i + 1}`,
      }));

      mockPrismaService.db.supplier.findMany.mockResolvedValue(mockSuppliers as any);

      const result = await repo.listSuppliers();

      expect(result).toHaveLength(500);
    });
  });

  describe('createSupplier', () => {
    it('EP: Should create new supplier', async () => {
      const data = {
        name: 'New Supplier',
        email: 'new@supplier.com',
        paymentTerms: 45,
      };

      mockPrismaService.db.supplier.create.mockResolvedValue({
        id: 1,
        ...data,
        isDelete: false,
      } as any);

      const result = await repo.createSupplier(data);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('name', 'New Supplier');
    });

    it('Error: Should handle duplicate supplier', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint', { code: 'P2002' });
      mockPrismaService.db.supplier.create.mockRejectedValue(error);

      await expect(repo.createSupplier({ name: 'Dup', email: 'dup@test.com' })).rejects.toThrow();
    });

    it('BVA: Payment terms boundary - minimum (0)', async () => {
      mockPrismaService.db.supplier.create.mockResolvedValue({ paymentTerms: 0 } as any);

      await repo.createSupplier({ name: 'S1', paymentTerms: 0 });

      expect(mockPrismaService.db.supplier.create).toHaveBeenCalled();
    });

    it('BVA: Payment terms boundary - maximum (180)', async () => {
      mockPrismaService.db.supplier.create.mockResolvedValue({ paymentTerms: 180 } as any);

      await repo.createSupplier({ name: 'S1', paymentTerms: 180 });

      expect(mockPrismaService.db.supplier.create).toHaveBeenCalled();
    });
  });

  describe('updateSupplier', () => {
    it('EP: Should update supplier', async () => {
      const update = { name: 'Updated Supplier', paymentTerms: 60 };

      mockPrismaService.db.supplier.update.mockResolvedValue({
        id: 1,
        ...update,
      } as any);

      const result = await repo.updateSupplier(1, update);

      expect(result).toHaveProperty('name', 'Updated Supplier');
      expect(mockPrismaService.db.supplier.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: update,
      });
    });

    it('Error: Should handle non-existent supplier', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025' });
      mockPrismaService.db.supplier.update.mockRejectedValue(error);

      await expect(repo.updateSupplier(999, { name: 'Update' })).rejects.toThrow();
    });
  });

  describe('deleteSupplier', () => {
    it('EP: Should soft delete supplier', async () => {
      mockPrismaService.db.supplier.update.mockResolvedValue({
        id: 1,
        isDelete: true,
      } as any);

      const result = await repo.deleteSupplier(1);

      expect(mockPrismaService.db.supplier.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isDelete: true },
      });
    });

    it('Error: Should handle non-existent supplier', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025' });
      mockPrismaService.db.supplier.update.mockRejectedValue(error);

      await expect(repo.deleteSupplier(999)).rejects.toThrow();
    });
  });

  describe('listSupplierPrintOptions', () => {
    it('EP: Should list print options for supplier', async () => {
      const mockOptions = [
        { id: 1, supplierId: 1, printOptionId: 1 },
        { id: 2, supplierId: 1, printOptionId: 2 },
      ];

      mockPrismaService.db.supplierPrintOption.findMany.mockResolvedValue(mockOptions as any);

      const result = await repo.listSupplierPrintOptions([1]);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.db.supplierPrintOption.findMany).toHaveBeenCalledWith({
        where: { supplierId: { in: [1] } },
      });
    });

    it('EP: Should return empty array for non-existent supplier', async () => {
      mockPrismaService.db.supplierPrintOption.findMany.mockResolvedValue([]);

      const result = await repo.listSupplierPrintOptions([999]);

      expect(result).toEqual([]);
    });

    it('EP: Should list options for multiple suppliers', async () => {
      mockPrismaService.db.supplierPrintOption.findMany.mockResolvedValue([
        { supplierId: 1 },
        { supplierId: 2 },
        { supplierId: 3 },
      ] as any);

      await repo.listSupplierPrintOptions([1, 2, 3]);

      expect(mockPrismaService.db.supplierPrintOption.findMany).toHaveBeenCalledWith({
        where: { supplierId: { in: [1, 2, 3] } },
      });
    });

    it('BVA: Should handle large supplier list', async () => {
      const supplierIds = Array.from({ length: 100 }, (_, i) => i + 1);
      mockPrismaService.db.supplierPrintOption.findMany.mockResolvedValue([]);

      await repo.listSupplierPrintOptions(supplierIds);

      expect(mockPrismaService.db.supplierPrintOption.findMany).toHaveBeenCalled();
    });
  });

  describe('listPrintOptionsByIds', () => {
    it('EP: Should list print options by ids', async () => {
      const mockOptions = [
        { id: 1, type: 'PAPER_TYPE', code: 'A4' },
        { id: 2, type: 'BINDING', code: 'SPIRAL' },
      ];

      mockPrismaService.db.printOption.findMany.mockResolvedValue(mockOptions as any);

      const result = await repo.listPrintOptionsByIds([1, 2]);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.db.printOption.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
      });
    });

    it('EP: Should return empty array for no ids', async () => {
      mockPrismaService.db.printOption.findMany.mockResolvedValue([]);

      const result = await repo.listPrintOptionsByIds([]);

      expect(result).toEqual([]);
    });

    it('BVA: Should handle large id list', async () => {
      const ids = Array.from({ length: 1000 }, (_, i) => i + 1);
      mockPrismaService.db.printOption.findMany.mockResolvedValue([]);

      await repo.listPrintOptionsByIds(ids);

      expect(mockPrismaService.db.printOption.findMany).toHaveBeenCalled();
    });
  });

  describe('findPrintOptionByTypeCode', () => {
    it('EP: Should find print option by type and code', async () => {
      const mockOption = { id: 1, type: 'PAPER_TYPE', code: 'A4', price: 10 };

      mockPrismaService.db.printOption.findFirst.mockResolvedValue(mockOption as any);

      const result = await repo.findPrintOptionByTypeCode('PAPER_TYPE', 'A4');

      expect(result).toEqual(mockOption);
      expect(mockPrismaService.db.printOption.findFirst).toHaveBeenCalledWith({
        where: { type: 'PAPER_TYPE', code: 'A4' },
      });
    });

    it('EP: Should return null for non-existent option', async () => {
      mockPrismaService.db.printOption.findFirst.mockResolvedValue(null);

      const result = await repo.findPrintOptionByTypeCode('INVALID', 'INVALID');

      expect(result).toBeNull();
    });

    it('BVA: Should handle code case sensitivity', async () => {
      mockPrismaService.db.printOption.findFirst.mockResolvedValue(null);

      await repo.findPrintOptionByTypeCode('PAPER_TYPE', 'a4');

      expect(mockPrismaService.db.printOption.findFirst).toHaveBeenCalledWith({
        where: { type: 'PAPER_TYPE', code: 'a4' },
      });
    });
  });

  describe('Supplier-PrintOption Relationship', () => {
    it('Pattern: Supplier has many print options', async () => {
      const mockOptions = [
        { id: 1, supplierId: 1, printOptionId: 1 },
        { id: 2, supplierId: 1, printOptionId: 2 },
        { id: 3, supplierId: 1, printOptionId: 3 },
      ];

      mockPrismaService.db.supplierPrintOption.findMany.mockResolvedValue(mockOptions as any);

      const result = await repo.listSupplierPrintOptions([1]);

      expect(result.every((o: any) => o.supplierId === 1)).toBe(true);
    });

    it('Pattern: Multiple suppliers can have same print option', async () => {
      const mockOptions = [
        { id: 1, supplierId: 1, printOptionId: 5 },
        { id: 2, supplierId: 2, printOptionId: 5 },
        { id: 3, supplierId: 3, printOptionId: 5 },
      ];

      mockPrismaService.db.supplierPrintOption.findMany.mockResolvedValue(mockOptions as any);

      await repo.listSupplierPrintOptions([1, 2, 3]);

      expect(mockPrismaService.db.supplierPrintOption.findMany).toHaveBeenCalled();
    });
  });

  describe('Soft Delete Pattern', () => {
    it('Pattern: Delete sets isDelete = true', async () => {
      mockPrismaService.db.supplier.update.mockResolvedValue({ isDelete: true } as any);

      await repo.deleteSupplier(1);

      expect(mockPrismaService.db.supplier.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isDelete: true },
      });
    });
  });

  describe('Error Handling', () => {
    it('Error: Should propagate database errors', async () => {
      const error = new Error('Database connection failed');
      mockPrismaService.db.supplier.findUnique.mockRejectedValue(error);

      await expect(repo.findSupplierById(1)).rejects.toThrow('Database connection failed');
    });
  });
});
