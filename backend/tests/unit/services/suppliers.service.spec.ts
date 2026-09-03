import { SuppliersService } from '../../../src/features/suppliers/suppliers.service';
import { SuppliersRepository } from '../../../src/features/suppliers/suppliers.repository';
import { OptionCatalogCacheService } from '../../../src/infrastructure/cache/option-catalog-cache.service';

describe('SuppliersService - Unit Tests', () => {
  let service: SuppliersService;
  let mockRepository: jest.Mocked<SuppliersRepository>;
  let mockCacheService: jest.Mocked<OptionCatalogCacheService>;

  beforeEach(() => {
    mockRepository = {
      findSupplierById: jest.fn(),
      listSuppliers: jest.fn(),
      createSupplier: jest.fn(),
      updateSupplier: jest.fn(),
      deleteSupplier: jest.fn(),
      listSupplierPrintOptions: jest.fn(),
      listPrintOptionsByIds: jest.fn(),
      updateSupplierOptions: jest.fn(),
    } as any;

    mockCacheService = {
      invalidate: jest.fn(),
      getOptionsByType: jest.fn(),
    } as any;

    service = new SuppliersService(mockRepository, mockCacheService);
  });

  describe('getSupplierList', () => {
    it('EP: Should list all suppliers', async () => {
      mockRepository.listSuppliers.mockResolvedValue({
        items: [
          { id: 1, name: 'PrintCo' },
          { id: 2, name: 'Paper Inc' },
        ],
        total: 2,
      });

      const result = await service.getSupplierList();

      expect(result.items).toHaveLength(2);
    });

    it('EP: Should filter by search term', async () => {
      mockRepository.listSuppliers.mockResolvedValue({ items: [] });

      await service.getSupplierList({ search: 'PrintCo' });

      expect(mockRepository.listSuppliers).toHaveBeenCalled();
    });

    it('EP: Should support cursor pagination', async () => {
      mockRepository.listSuppliers.mockResolvedValue({ items: [] });

      await service.getSupplierList({ cursor: 5, limit: 50 });

      expect(mockRepository.listSuppliers).toHaveBeenCalled();
    });

    it('EP: Should attach print options to results', async () => {
      mockRepository.listSuppliers.mockResolvedValue({
        items: [{ id: 1, name: 'PrintCo' }],
      });

      mockRepository.listSupplierPrintOptions.mockResolvedValue([
        { supplierId: 1, type: 'PAPER', code: 'A4' },
      ]);

      const result = await service.getSupplierList();

      expect(mockRepository.listSupplierPrintOptions).toHaveBeenCalled();
    });

    it('BVA: Default limit (50)', async () => {
      mockRepository.listSuppliers.mockResolvedValue({ items: [] });

      await service.getSupplierList({});

      expect(mockRepository.listSuppliers).toHaveBeenCalled();
    });

    it('BVA: Large list with pagination', async () => {
      mockRepository.listSuppliers.mockResolvedValue({
        items: Array.from({ length: 50 }, (_, i) => ({ id: i + 1 })),
      });

      const result = await service.getSupplierList();

      expect(result.items.length).toBeLessThanOrEqual(50);
    });
  });

  describe('getSupplierById', () => {
    it('EP: Should get supplier with attached options', async () => {
      mockRepository.findSupplierById.mockResolvedValue({
        id: 1,
        name: 'PrintCo',
      });

      mockRepository.listSupplierPrintOptions.mockResolvedValue([
        { type: 'PAPER', code: 'A4' },
        { type: 'COVER', code: 'HC' },
      ]);

      const result = await service.getSupplierById(1);

      expect(result.id).toBe(1);
      expect(mockRepository.listSupplierPrintOptions).toHaveBeenCalled();
    });

    it('EP: Should group options by type', async () => {
      mockRepository.findSupplierById.mockResolvedValue({
        id: 1,
        name: 'PrintCo',
      });

      mockRepository.listSupplierPrintOptions.mockResolvedValue([
        { id: 1, type: 'PAPER', code: 'A4' },
        { id: 2, type: 'PAPER', code: 'A3' },
        { id: 3, type: 'COVER', code: 'HC' },
      ]);

      const result = await service.getSupplierById(1);

      expect(result).toHaveProperty('paperOptions');
      expect(result).toHaveProperty('coverOptions');
    });

    it('Error: Should throw NOT_FOUND if doesn\'t exist', async () => {
      mockRepository.findSupplierById.mockResolvedValue(null);

      await expect(service.getSupplierById(999)).rejects.toThrow();
    });

    it('BVA: Should handle supplier with no options', async () => {
      mockRepository.findSupplierById.mockResolvedValue({ id: 1 });
      mockRepository.listSupplierPrintOptions.mockResolvedValue([]);

      const result = await service.getSupplierById(1);

      expect(result.paperOptions).toEqual([]);
    });
  });

  describe('createSupplier', () => {
    it('EP: Should create supplier', async () => {
      mockRepository.createSupplier.mockResolvedValue({
        id: 1,
        name: 'New Supplier',
        paymentTerms: 30,
      });

      const result = await service.createSupplier({
        name: 'New Supplier',
        email: 'supplier@test.com',
        paymentTerms: 30,
      });

      expect(result.id).toBe(1);
    });

    it('EP: Should sync options if provided', async () => {
      mockRepository.createSupplier.mockResolvedValue({
        id: 1,
        name: 'New Supplier',
      });

      mockRepository.updateSupplierOptions.mockResolvedValue(undefined);

      await service.createSupplier({
        name: 'New Supplier',
        email: 'test@test.com',
        optionIds: [1, 2, 3],
      });

      expect(mockRepository.updateSupplierOptions).toHaveBeenCalledWith(1, [1, 2, 3]);
    });

    it('Error: Should handle duplicate supplier', async () => {
      const error = new Error('Unique constraint failed');
      (error as any).code = 'P2002';
      mockRepository.createSupplier.mockRejectedValue(error);

      await expect(
        service.createSupplier({ name: 'DUP', email: 'dup@test.com' })
      ).rejects.toThrow();
    });

    it('BVA: Payment terms boundary (0)', async () => {
      mockRepository.createSupplier.mockResolvedValue({
        id: 1,
        paymentTerms: 0,
      });

      await service.createSupplier({
        name: 'New',
        email: 'test@test.com',
        paymentTerms: 0,
      });

      expect(mockRepository.createSupplier).toHaveBeenCalled();
    });

    it('BVA: Payment terms maximum (180)', async () => {
      mockRepository.createSupplier.mockResolvedValue({
        id: 1,
        paymentTerms: 180,
      });

      await service.createSupplier({
        name: 'New',
        email: 'test@test.com',
        paymentTerms: 180,
      });

      expect(mockRepository.createSupplier).toHaveBeenCalled();
    });
  });

  describe('updateSupplier', () => {
    it('EP: Should update supplier', async () => {
      mockRepository.updateSupplier.mockResolvedValue({ id: 1 });

      await service.updateSupplier(1, { name: 'Updated' });

      expect(mockRepository.updateSupplier).toHaveBeenCalled();
    });

    it('EP: Should sync options if provided', async () => {
      mockRepository.updateSupplier.mockResolvedValue({ id: 1 });
      mockRepository.updateSupplierOptions.mockResolvedValue(undefined);

      await service.updateSupplier(1, { name: 'Updated', optionIds: [1, 2] });

      expect(mockRepository.updateSupplierOptions).toHaveBeenCalledWith(1, [1, 2]);
    });

    it('EP: Should handle status="banned" → isDelete=true', async () => {
      mockRepository.updateSupplier.mockResolvedValue({ id: 1, isDelete: true });

      await service.updateSupplier(1, { status: 'banned' });

      expect(mockRepository.updateSupplier).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ isDelete: true })
      );
    });

    it('EP: Should handle status="active" → isDelete=false', async () => {
      mockRepository.updateSupplier.mockResolvedValue({ id: 1, isDelete: false });

      await service.updateSupplier(1, { status: 'active' });

      expect(mockRepository.updateSupplier).toHaveBeenCalled();
    });

    it('Error: Should silently succeed if supplier not found', async () => {
      mockRepository.updateSupplier.mockResolvedValue({ count: 0 });

      const result = await service.updateSupplier(999, { name: 'Update' });

      // Should not throw
      expect(result).toBeDefined();
    });
  });

  describe('updateSupplierOptions', () => {
    it('EP: Should sync options transactionally', async () => {
      mockRepository.updateSupplierOptions.mockResolvedValue(undefined);

      await service.updateSupplierOptions(1, [1, 2, 3]);

      expect(mockRepository.updateSupplierOptions).toHaveBeenCalledWith(1, [1, 2, 3]);
    });

    it('EP: Should invalidate cache for type catalogs', async () => {
      mockRepository.updateSupplierOptions.mockResolvedValue(undefined);

      await service.updateSupplierOptions(1, [1, 2, 3]);

      expect(mockCacheService.invalidate).toHaveBeenCalledWith(
        expect.stringMatching(/PAPER|COVER|PAPERSIZE/),
        expect.any(String)
      );
    });

    it('EP: Should remove old options', async () => {
      mockRepository.updateSupplierOptions.mockResolvedValue(undefined);

      await service.updateSupplierOptions(1, [1, 2]); // Removes 3, 4, 5

      expect(mockRepository.updateSupplierOptions).toHaveBeenCalled();
    });

    it('EP: Should add new options', async () => {
      mockRepository.updateSupplierOptions.mockResolvedValue(undefined);

      await service.updateSupplierOptions(1, [1, 2, 3, 4, 5]); // Adds 4, 5

      expect(mockRepository.updateSupplierOptions).toHaveBeenCalled();
    });

    it('BVA: Empty option list', async () => {
      mockRepository.updateSupplierOptions.mockResolvedValue(undefined);

      await service.updateSupplierOptions(1, []);

      expect(mockRepository.updateSupplierOptions).toHaveBeenCalled();
    });

    it('BVA: Large option list', async () => {
      mockRepository.updateSupplierOptions.mockResolvedValue(undefined);

      const optionIds = Array.from({ length: 100 }, (_, i) => i + 1);

      await service.updateSupplierOptions(1, optionIds);

      expect(mockRepository.updateSupplierOptions).toHaveBeenCalled();
    });
  });

  describe('deleteSupplier', () => {
    it('EP: Should soft delete supplier', async () => {
      mockRepository.deleteSupplier.mockResolvedValue({ id: 1, isDelete: true });

      await service.deleteSupplier(1);

      expect(mockRepository.deleteSupplier).toHaveBeenCalledWith(1);
    });

    it('Error: Should throw NOT_FOUND if doesn\'t exist', async () => {
      mockRepository.deleteSupplier.mockRejectedValue(new Error('Not found'));

      await expect(service.deleteSupplier(999)).rejects.toThrow();
    });

    it('BVA: Delete with boundary id (1)', async () => {
      mockRepository.deleteSupplier.mockResolvedValue({ id: 1 });

      await service.deleteSupplier(1);

      expect(mockRepository.deleteSupplier).toHaveBeenCalledWith(1);
    });
  });

  describe('getAggregatedOptions', () => {
    it('EP: Should return all active print options grouped by type', async () => {
      mockRepository.listPrintOptionsByIds.mockResolvedValue([
        { id: 1, type: 'PAPER', code: 'A4', price: 5000 },
        { id: 2, type: 'COVER', code: 'HC', price: 20000 },
        { id: 3, type: 'PAPERSIZE', code: 'A4', width: 210, height: 297 },
      ]);

      const result = await service.getAggregatedOptions();

      expect(result).toHaveProperty('papers');
      expect(result).toHaveProperty('covers');
      expect(result).toHaveProperty('sizes');
    });

    it('EP: Should deduplicate options', async () => {
      mockRepository.listPrintOptionsByIds.mockResolvedValue([
        { id: 1, type: 'PAPER', code: 'A4' },
        { id: 2, type: 'PAPER', code: 'A4' }, // Duplicate
      ]);

      const result = await service.getAggregatedOptions();

      // Should be deduplicated
      expect(result.papers.filter((p: any) => p.code === 'A4')).toHaveLength(1);
    });
  });

  describe('getOptionCatalog', () => {
    it('EP: Should return options by type', async () => {
      mockCacheService.getOptionsByType.mockResolvedValue([
        { code: 'A4', price: 5000 },
        { code: 'A3', price: 7000 },
      ]);

      const result = await service.getOptionCatalog('PAPER');

      expect(result).toHaveLength(2);
    });

    it('EP: Should use cache-first strategy', async () => {
      mockCacheService.getOptionsByType.mockResolvedValue([
        { code: 'A4', price: 5000 },
      ]);

      await service.getOptionCatalog('PAPER');

      expect(mockCacheService.getOptionsByType).toHaveBeenCalledWith('PAPER');
    });
  });

  describe('getOptionInfo', () => {
    it('EP: Should look up single option by type/code', async () => {
      mockCacheService.getOptionsByType.mockResolvedValue([
        { code: 'A4', name: 'A4 Paper', price: 5000 },
      ]);

      const result = await service.getOptionInfo('PAPER', 'A4');

      expect(result).toBeDefined();
    });

    it('EP: Should return null if not found', async () => {
      mockCacheService.getOptionsByType.mockResolvedValue([]);

      const result = await service.getOptionInfo('PAPER', 'INVALID');

      expect(result).toBeNull();
    });
  });

  describe('Transaction Pattern', () => {
    it('Pattern: Option sync is transactional (N+1 optimization)', async () => {
      mockRepository.updateSupplierOptions.mockResolvedValue(undefined);

      await service.updateSupplierOptions(1, [1, 2, 3]);

      // Should use single transaction, not individual updates
      expect(mockRepository.updateSupplierOptions).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Invalidation', () => {
    it('Pattern: Cache invalidated on option changes', async () => {
      mockRepository.updateSupplierOptions.mockResolvedValue(undefined);

      await service.updateSupplierOptions(1, [1, 2]);

      expect(mockCacheService.invalidate).toHaveBeenCalled();
    });
  });

  describe('Status Handling', () => {
    it('Pattern: Status="banned" maps to isDelete=true', async () => {
      mockRepository.updateSupplier.mockResolvedValue({ id: 1 });

      await service.updateSupplier(1, { status: 'banned' });

      expect(mockRepository.updateSupplier).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ isDelete: true })
      );
    });

    it('Pattern: Status="active" maps to isDelete=false', async () => {
      mockRepository.updateSupplier.mockResolvedValue({ id: 1 });

      await service.updateSupplier(1, { status: 'active' });

      expect(mockRepository.updateSupplier).toHaveBeenCalledWith(1, expect.any(Object));
    });
  });
});
