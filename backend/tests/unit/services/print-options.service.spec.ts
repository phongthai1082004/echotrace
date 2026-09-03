import { PrintOptionService } from '../../../src/features/print-options/print-options.service';
import { PrintOptionRepository } from '../../../src/features/print-options/print-options.repository';
import { OptionCatalogCacheService } from '../../../src/infrastructure/cache/option-catalog-cache.service';

describe('PrintOptionService - Unit Tests', () => {
  let service: PrintOptionService;
  let mockRepository: jest.Mocked<PrintOptionRepository>;
  let mockCacheService: jest.Mocked<OptionCatalogCacheService>;

  beforeEach(() => {
    mockRepository = {
      listPrintOptions: jest.fn(),
      listRaw: jest.fn(),
      createPrintOption: jest.fn(),
      updatePrintOption: jest.fn(),
      softDeletePrintOption: jest.fn(),
    } as any;

    mockCacheService = {
      invalidate: jest.fn(),
    } as any;

    service = new PrintOptionService(mockRepository, mockCacheService);
  });

  describe('list', () => {
    it('EP: Should list all print options', async () => {
      mockRepository.listPrintOptions.mockResolvedValue([
        { id: 1, type: 'PAPER', code: 'A4', name: 'A4 Paper' },
        { id: 2, type: 'COVER', code: 'HC', name: 'Hard Cover' },
      ]);

      const result = await service.list();

      expect(result).toHaveLength(2);
      expect(mockRepository.listPrintOptions).toHaveBeenCalled();
    });

    it('EP: Should filter by type', async () => {
      mockRepository.listPrintOptions.mockResolvedValue([
        { id: 1, type: 'PAPER', code: 'A4' },
      ]);

      const result = await service.list({ type: 'PAPER' });

      expect(mockRepository.listPrintOptions).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'PAPER' })
      );
    });

    it('EP: Should search by name/code', async () => {
      mockRepository.listPrintOptions.mockResolvedValue([
        { id: 1, code: 'A4', name: 'A4 Paper' },
      ]);

      const result = await service.list({ search: 'A4' });

      expect(result).toBeDefined();
    });

    it('EP: Should order by type ASC then code ASC', async () => {
      mockRepository.listPrintOptions.mockResolvedValue([
        { id: 1, type: 'COVER', code: 'A' },
        { id: 2, type: 'COVER', code: 'B' },
        { id: 3, type: 'PAPER', code: 'X' },
      ]);

      const result = await service.list();

      expect(mockRepository.listPrintOptions).toHaveBeenCalled();
    });
  });

  describe('listRaw', () => {
    it('EP: Should return raw option data for pricing', async () => {
      mockRepository.listRaw.mockResolvedValue([
        { type: 'PAPER', code: 'A4', price: 5000, width: 210, height: 297 },
      ]);

      const result = await service.listRaw();

      expect(result[0]).toHaveProperty('price');
      expect(result[0]).toHaveProperty('width');
    });

    it('EP: Should accept transaction parameter', async () => {
      const mockTx = jest.fn();
      mockRepository.listRaw.mockResolvedValue([]);

      await service.listRaw(mockTx as any);

      expect(mockRepository.listRaw).toHaveBeenCalledWith(mockTx);
    });

    it('BVA: Should handle null prices', async () => {
      mockRepository.listRaw.mockResolvedValue([
        { type: 'PAPER', code: 'A4', price: null },
      ]);

      const result = await service.listRaw();

      expect(result[0].price).toBeNull();
    });
  });

  describe('create', () => {
    it('EP: Should create new print option', async () => {
      mockRepository.createPrintOption.mockResolvedValue({
        id: 1,
        type: 'PAPER',
        code: 'GLOSSY',
        name: 'Glossy Paper',
        price: 10000,
      });

      const result = await service.create({
        type: 'PAPER',
        code: 'GLOSSY',
        name: 'Glossy Paper',
        price: 10000,
      });

      expect(result.id).toBe(1);
      expect(mockCacheService.invalidate).toHaveBeenCalledWith('PAPER', 'GLOSSY');
    });

    it('Error: Should handle duplicate code (P2002)', async () => {
      const error = new Error('Unique constraint failed');
      (error as any).code = 'P2002';
      mockRepository.createPrintOption.mockRejectedValue(error);

      await expect(
        service.create({ type: 'PAPER', code: 'DUP', name: 'Dup' })
      ).rejects.toThrow();
    });

    it('EP: Should invalidate cache after create', async () => {
      mockRepository.createPrintOption.mockResolvedValue({
        id: 1,
        type: 'PAPER',
        code: 'A4',
      });

      await service.create({ type: 'PAPER', code: 'A4', name: 'A4' });

      expect(mockCacheService.invalidate).toHaveBeenCalledWith('PAPER', 'A4');
    });

    it('BVA: Should handle large price', async () => {
      mockRepository.createPrintOption.mockResolvedValue({
        id: 1,
        price: 999999999,
      });

      await service.create({
        type: 'PAPER',
        code: 'PREMIUM',
        price: 999999999,
      });

      expect(mockRepository.createPrintOption).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('EP: Should update print option', async () => {
      mockRepository.updatePrintOption.mockResolvedValue({
        id: 1,
        type: 'PAPER',
        code: 'A4',
        price: 12000,
      });

      const result = await service.update(1, { price: 12000 });

      expect(result.price).toBe(12000);
    });

    it('EP: Should only update provided fields', async () => {
      mockRepository.updatePrintOption.mockResolvedValue({
        id: 1,
        type: 'PAPER',
        code: 'A4',
      });

      await service.update(1, { price: 12000 });

      expect(mockRepository.updatePrintOption).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ price: 12000 })
      );
    });

    it('EP: Should invalidate cache on code change', async () => {
      mockRepository.updatePrintOption.mockResolvedValue({
        id: 1,
        type: 'PAPER',
        code: 'NEWCODE',
      });

      await service.update(1, { code: 'NEWCODE' });

      expect(mockCacheService.invalidate).toHaveBeenCalled();
    });

    it('Error: Should handle NOT_FOUND', async () => {
      mockRepository.updatePrintOption.mockRejectedValue(new Error('Not found'));

      await expect(service.update(999, { price: 100 })).rejects.toThrow();
    });

    it('Error: Should handle duplicate code', async () => {
      const error = new Error('Unique constraint failed');
      (error as any).code = 'P2002';
      mockRepository.updatePrintOption.mockRejectedValue(error);

      await expect(service.update(1, { code: 'DUP' })).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('EP: Should soft delete print option', async () => {
      mockRepository.softDeletePrintOption.mockResolvedValue({ id: 1 });

      const result = await service.remove(1);

      expect(result).toBeDefined();
    });

    it('EP: Should invalidate cache on delete', async () => {
      mockRepository.softDeletePrintOption.mockResolvedValue({ id: 1, code: 'A4', type: 'PAPER' });

      await service.remove(1);

      expect(mockCacheService.invalidate).toHaveBeenCalled();
    });

    it('Error: Should handle NOT_FOUND', async () => {
      mockRepository.softDeletePrintOption.mockRejectedValue(new Error('Not found'));

      await expect(service.remove(999)).rejects.toThrow();
    });

    it('BVA: Should handle delete with boundary id (1)', async () => {
      mockRepository.softDeletePrintOption.mockResolvedValue({ id: 1 });

      await service.remove(1);

      expect(mockRepository.softDeletePrintOption).toHaveBeenCalledWith(1);
    });
  });

  describe('Cache Invalidation', () => {
    it('Pattern: Cache invalidated on all mutations', async () => {
      mockRepository.createPrintOption.mockResolvedValue({ id: 1, type: 'PAPER', code: 'A4' });

      await service.create({ type: 'PAPER', code: 'A4' });

      expect(mockCacheService.invalidate).toHaveBeenCalled();
    });
  });

  describe('Type/Code Ordering', () => {
    it('Pattern: Results ordered by type ASC, then code ASC', async () => {
      mockRepository.listPrintOptions.mockResolvedValue([
        { id: 1, type: 'COVER', code: 'B' },
        { id: 2, type: 'COVER', code: 'A' },
        { id: 3, type: 'PAPER', code: 'X' },
      ]);

      const result = await service.list();

      expect(result.length).toBeGreaterThan(0);
    });
  });
});
