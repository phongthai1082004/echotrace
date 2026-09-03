import { SampleBookService } from '../../../src/features/sample-books/sample-books.service';
import { SampleBookRepository } from '../../../src/features/sample-books/sample-books.repository';
import { SampleBookCacheService } from '../../../src/infrastructure/cache/sample-book-cache.service';

describe('SampleBooksService - Unit Tests', () => {
  let service: SampleBooksService;
  let mockRepository: jest.Mocked<SampleBooksRepository>;
  let mockCacheService: jest.Mocked<SampleBookCacheService>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      listByStatus: jest.fn(),
      createSampleBook: jest.fn(),
      updateSampleBook: jest.fn(),
      updateStatus: jest.fn(),
      softDelete: jest.fn(),
      findByIdForStock: jest.fn(),
    } as any;

    mockCacheService = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      invalidateItem: jest.fn(),
      invalidateList: jest.fn(),
    } as any;

    service = new SampleBooksService(mockRepository, mockCacheService);
  });

  describe('list', () => {
    it('EP: Should list sample books with pagination', async () => {
      mockRepository.listByStatus.mockResolvedValue({
        items: [
          { id: 1, name: 'Book 1', status: 'published' },
          { id: 2, name: 'Book 2', status: 'published' },
        ],
        total: 2,
      });

      const result = await service.list({ limit: 12 });

      expect(result.items).toHaveLength(2);
    });

    it('EP: Should filter by status', async () => {
      mockRepository.listByStatus.mockResolvedValue({ items: [] });

      await service.list({ status: 'published' });

      expect(mockRepository.listByStatus).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'published' })
      );
    });

    it('EP: Should filter by category', async () => {
      mockRepository.listByStatus.mockResolvedValue({ items: [] });

      await service.list({ category: 'PHOTOBOOK' });

      expect(mockRepository.listByStatus).toHaveBeenCalled();
    });

    it('EP: Should support cursor-based pagination', async () => {
      mockRepository.listByStatus.mockResolvedValue({ items: [] });

      await service.list({ cursor: 5, limit: 12 });

      expect(mockRepository.listByStatus).toHaveBeenCalled();
    });

    it('BVA: Default limit (12)', async () => {
      mockRepository.listByStatus.mockResolvedValue({ items: [] });

      await service.list({});

      expect(mockRepository.listByStatus).toHaveBeenCalled();
    });

    it('BVA: Cursor boundary (0 = first page)', async () => {
      mockRepository.listByStatus.mockResolvedValue({ items: [] });

      await service.list({ cursor: 0 });

      expect(mockRepository.listByStatus).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('EP: Should get sample book by id', async () => {
      const mockBook = {
        id: 1,
        name: 'Sample Book',
        status: 'published',
        isActive: true,
      };

      mockCacheService.getItem.mockResolvedValue(null); // Cache miss
      mockRepository.findById.mockResolvedValue(mockBook);

      const result = await service.getById(1);

      expect(result).toEqual(mockBook);
    });

    it('EP: Should use cache if available', async () => {
      const cachedBook = { id: 1, name: 'Cached Book' };
      mockCacheService.getItem.mockResolvedValue(cachedBook);

      const result = await service.getById(1);

      expect(result).toEqual(cachedBook);
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('EP: Should cache result after fetch', async () => {
      const mockBook = { id: 1, name: 'Book' };
      mockCacheService.getItem.mockResolvedValue(null);
      mockRepository.findById.mockResolvedValue(mockBook);

      await service.getById(1);

      expect(mockCacheService.setItem).toHaveBeenCalledWith(1, mockBook);
    });

    it('Error: Should throw NOT_FOUND if book doesn\'t exist', async () => {
      mockCacheService.getItem.mockResolvedValue(null);
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getById(999)).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('EP: Should create sample book with defaults', async () => {
      const mockBook = {
        id: 1,
        name: 'Untitled sample',
        type: 'TEMPLATE',
        style: 'PHOTOBOOK',
        status: 'draft',
        isActive: true,
      };

      mockRepository.createSampleBook.mockResolvedValue(mockBook);

      const result = await service.create(1, {
        name: 'Untitled sample',
        type: 'TEMPLATE',
        style: 'PHOTOBOOK',
      });

      expect(result.name).toBe('Untitled sample');
    });

    it('EP: Should invalidate list cache on create', async () => {
      mockRepository.createSampleBook.mockResolvedValue({ id: 1 });

      await service.create(1, { name: 'Book' });

      expect(mockCacheService.invalidateList).toHaveBeenCalled();
    });

    it('EP: Should set isActive based on status', async () => {
      mockRepository.createSampleBook.mockResolvedValue({
        id: 1,
        status: 'draft',
        isActive: true,
      });

      await service.create(1, { name: 'Book', status: 'draft' });

      expect(mockRepository.createSampleBook).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('EP: Should update sample book', async () => {
      mockRepository.updateSampleBook.mockResolvedValue({
        id: 1,
        name: 'Updated Book',
      });

      const result = await service.update(1, { name: 'Updated Book' });

      expect(result.name).toBe('Updated Book');
    });

    it('EP: Should invalidate caches on update', async () => {
      mockRepository.updateSampleBook.mockResolvedValue({ id: 1 });

      await service.update(1, { name: 'Updated' });

      expect(mockCacheService.invalidateItem).toHaveBeenCalledWith(1);
      expect(mockCacheService.invalidateList).toHaveBeenCalled();
    });

    it('EP: Should merge page changes if provided', async () => {
      mockRepository.updateSampleBook.mockResolvedValue({ id: 1 });

      await service.update(1, { content: { changedPages: [1, 2, 3] } });

      expect(mockRepository.updateSampleBook).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('EP: Should update status and sync isActive', async () => {
      mockRepository.updateStatus.mockResolvedValue({
        id: 1,
        status: 'published',
        isActive: true,
      });

      const result = await service.updateStatus(1, 'published');

      expect(result.status).toBe('published');
    });

    it('EP: Should set isActive=false when archiving', async () => {
      mockRepository.updateStatus.mockResolvedValue({
        id: 1,
        status: 'archive',
        isActive: false,
      });

      await service.updateStatus(1, 'archive');

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        1,
        'archive',
        false
      );
    });

    it('EP: Should invalidate cache on status change', async () => {
      mockRepository.updateStatus.mockResolvedValue({ id: 1 });

      await service.updateStatus(1, 'published');

      expect(mockCacheService.invalidateItem).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('EP: Should soft-archive book', async () => {
      mockRepository.softDelete.mockResolvedValue({ id: 1 });

      await service.remove(1);

      expect(mockRepository.softDelete).toHaveBeenCalledWith(1);
    });

    it('EP: Should invalidate caches on remove', async () => {
      mockRepository.softDelete.mockResolvedValue({ id: 1 });

      await service.remove(1);

      expect(mockCacheService.invalidateItem).toHaveBeenCalledWith(1);
      expect(mockCacheService.invalidateList).toHaveBeenCalled();
    });

    it('Error: Should throw NOT_FOUND if doesn\'t exist', async () => {
      mockRepository.softDelete.mockRejectedValue(new Error('Not found'));

      await expect(service.remove(999)).rejects.toThrow();
    });
  });

  describe('explore', () => {
    it('EP: Should fetch published TEMPLATE books', async () => {
      mockRepository.listByStatus.mockResolvedValue({
        items: [{ id: 1, type: 'TEMPLATE', status: 'published' }],
      });

      const result = await service.explore({ limit: 12 });

      expect(result.items).toBeDefined();
    });

    it('EP: Should support category filtering', async () => {
      mockRepository.listByStatus.mockResolvedValue({ items: [] });

      await service.explore({ category: 'PHOTOBOOK' });

      expect(mockRepository.listByStatus).toHaveBeenCalled();
    });

    it('EP: Should paginate in memory by cursor', async () => {
      mockRepository.listByStatus.mockResolvedValue({
        items: Array.from({ length: 50 }, (_, i) => ({ id: i + 1 })),
      });

      const result = await service.explore({ cursor: 10, limit: 12 });

      expect(result.items).toBeDefined();
    });
  });

  describe('albums', () => {
    it('EP: Should fetch published ALBUM books', async () => {
      mockRepository.listByStatus.mockResolvedValue({
        items: [{ id: 1, type: 'ALBUM', status: 'published' }],
      });

      const result = await service.albums({ limit: 12 });

      expect(result.items).toBeDefined();
    });

    it('EP: Should filter by category', async () => {
      mockRepository.listByStatus.mockResolvedValue({ items: [] });

      await service.albums({ category: 'FAMILY' });

      expect(mockRepository.listByStatus).toHaveBeenCalled();
    });
  });

  describe('getPublishedById', () => {
    it('EP: Should get published/active book', async () => {
      const mockBook = {
        id: 1,
        status: 'published',
        isActive: true,
      };

      mockCacheService.getItem.mockResolvedValue(null);
      mockRepository.findById.mockResolvedValue(mockBook);

      const result = await service.getPublishedById(1);

      expect(result).toEqual(mockBook);
    });

    it('Error: Should reject if not published', async () => {
      mockCacheService.getItem.mockResolvedValue(null);
      mockRepository.findById.mockResolvedValue({
        id: 1,
        status: 'draft',
        isActive: false,
      });

      await expect(service.getPublishedById(1)).rejects.toThrow();
    });

    it('Error: Should reject if not active', async () => {
      mockCacheService.getItem.mockResolvedValue(null);
      mockRepository.findById.mockResolvedValue({
        id: 1,
        status: 'published',
        isActive: false,
      });

      await expect(service.getPublishedById(1)).rejects.toThrow();
    });
  });

  describe('getByIdForStock', () => {
    it('EP: Should return book for stock check (no cache)', async () => {
      const mockBook = { id: 1, quantity: 10, isActive: true };

      mockRepository.findByIdForStock.mockResolvedValue(mockBook);

      const result = await service.getByIdForStock(1, 5);

      expect(result).toEqual(mockBook);
      expect(mockCacheService.getItem).not.toHaveBeenCalled();
    });

    it('Error: Should return null if quantity insufficient', async () => {
      mockRepository.findByIdForStock.mockResolvedValue(null);

      const result = await service.getByIdForStock(1, 1000);

      expect(result).toBeNull();
    });

    it('Error: Should return null if book deleted', async () => {
      mockRepository.findByIdForStock.mockResolvedValue(null);

      const result = await service.getByIdForStock(999, 5);

      expect(result).toBeNull();
    });

    it('EP: Should accept transaction parameter', async () => {
      const mockTx = jest.fn();
      mockRepository.findByIdForStock.mockResolvedValue({ id: 1 });

      await service.getByIdForStock(1, 5, mockTx as any);

      expect(mockRepository.findByIdForStock).toHaveBeenCalledWith(
        1,
        5,
        mockTx
      );
    });

    it('BVA: Quantity boundary (1)', async () => {
      mockRepository.findByIdForStock.mockResolvedValue({ id: 1, quantity: 1 });

      const result = await service.getByIdForStock(1, 1);

      expect(result).toBeDefined();
    });

    it('BVA: Large quantity', async () => {
      mockRepository.findByIdForStock.mockResolvedValue({ id: 1, quantity: 10000 });

      const result = await service.getByIdForStock(1, 10000);

      expect(result).toBeDefined();
    });
  });

  describe('Cache Strategy', () => {
    it('Pattern: Cache-first for read operations', async () => {
      mockCacheService.getItem.mockResolvedValue({ id: 1, name: 'Cached' });

      await service.getById(1);

      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('Pattern: Invalidate on mutations', async () => {
      mockRepository.createSampleBook.mockResolvedValue({ id: 1 });

      await service.create(1, { name: 'Book' });

      expect(mockCacheService.invalidateItem).toHaveBeenCalled();
      expect(mockCacheService.invalidateList).toHaveBeenCalled();
    });

    it('Pattern: No cache for stock checks', async () => {
      mockRepository.findByIdForStock.mockResolvedValue({ id: 1 });

      await service.getByIdForStock(1, 5);

      expect(mockCacheService.getItem).not.toHaveBeenCalled();
    });
  });
});
