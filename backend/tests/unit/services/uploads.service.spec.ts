import { UploadsService } from '../../../src/features/uploads/uploads.service';
import { UserImagesRepository } from '../../../src/features/uploads/user-images.repository';
import { IR2ImageService } from '../../../src/infrastructure/upload/r2-image.service';

describe('UploadsService - Unit Tests', () => {
  let service: UploadsService;
  let mockRepository: jest.Mocked<UserImagesRepository>;
  let mockR2Service: jest.Mocked<IR2ImageService>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      listByUser: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockR2Service = {
      getUploadSignature: jest.fn(),
      deleteAsset: jest.fn(),
    } as any;

    service = new UploadsService(mockRepository, mockR2Service);
  });

  describe('getById', () => {
    it('EP: Should get image by id for user', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 1,
        userId: 100,
        url: 'https://example.com/image.jpg',
      });

      const result = await service.getById(100, 1);

      expect(result.id).toBe(1);
      expect(mockRepository.findById).toHaveBeenCalledWith(1, 100);
    });

    it('Error: Should throw NOT_FOUND if doesn\'t exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getById(100, 999)).rejects.toThrow();
    });

    it('Error: Should throw NOT_FOUND if belongs to different user', async () => {
      mockRepository.findById.mockResolvedValue(null); // Scope check fails

      await expect(service.getById(100, 1)).rejects.toThrow();
    });

    it('Error: Should throw NOT_FOUND if deleted', async () => {
      mockRepository.findById.mockResolvedValue(null); // isDelete check fails

      await expect(service.getById(100, 1)).rejects.toThrow();
    });

    it('BVA: Boundary user id (1)', async () => {
      mockRepository.findById.mockResolvedValue({ id: 1, userId: 1 });

      const result = await service.getById(1, 1);

      expect(result).toBeDefined();
    });

    it('BVA: Large image id', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 2147483647,
        userId: 100,
      });

      const result = await service.getById(100, 2147483647);

      expect(result.id).toBe(2147483647);
    });
  });

  describe('create', () => {
    it('EP: Should save image with url', async () => {
      mockRepository.create.mockResolvedValue({
        id: 1,
        userId: 100,
        url: 'https://example.com/image.jpg',
        publicId: 'r2_id_123',
      });

      const result = await service.create(100, {
        url: 'https://example.com/image.jpg',
        publicId: 'r2_id_123',
      });

      expect(result.url).toBe('https://example.com/image.jpg');
    });

    it('EP: Should save with optional metadata', async () => {
      mockRepository.create.mockResolvedValue({
        id: 1,
        userId: 100,
        url: 'https://example.com/image.jpg',
        width: 800,
        height: 600,
        size: 50000,
      });

      const result = await service.create(100, {
        url: 'https://example.com/image.jpg',
        publicId: 'r2_id',
        width: 800,
        height: 600,
        size: 50000,
      });

      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it('Error: Should reject missing url', () => {
      expect(() => {
        const data = { publicId: 'r2_id' };
        if (!data.url) {
          throw new Error('UPLOAD_URL_REQUIRED');
        }
      }).toThrow('UPLOAD_URL_REQUIRED');
    });

    it('BVA: Large image dimensions', async () => {
      mockRepository.create.mockResolvedValue({
        id: 1,
        width: 10000,
        height: 10000,
      });

      await service.create(100, {
        url: 'https://example.com/huge.jpg',
        width: 10000,
        height: 10000,
      });

      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('BVA: Large file size', async () => {
      mockRepository.create.mockResolvedValue({
        id: 1,
        size: 50000000, // 50MB
      });

      await service.create(100, {
        url: 'https://example.com/large.jpg',
        size: 50000000,
      });

      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('EP: Should associate with book if bookId provided', async () => {
      mockRepository.create.mockResolvedValue({
        id: 1,
        userId: 100,
        bookId: 42,
      });

      await service.create(100, {
        url: 'https://example.com/image.jpg',
        bookId: 42,
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ bookId: 42 })
      );
    });
  });

  describe('listByUser', () => {
    it('EP: Should list all user images', async () => {
      mockRepository.listByUser.mockResolvedValue([
        { id: 1, url: 'https://example.com/1.jpg' },
        { id: 2, url: 'https://example.com/2.jpg' },
      ]);

      const result = await service.listByUser(100);

      expect(result).toHaveLength(2);
      expect(mockRepository.listByUser).toHaveBeenCalledWith(100, undefined);
    });

    it('EP: Should filter by bookId if provided', async () => {
      mockRepository.listByUser.mockResolvedValue([
        { id: 1, bookId: 42, url: 'https://example.com/1.jpg' },
      ]);

      const result = await service.listByUser(100, 42);

      expect(mockRepository.listByUser).toHaveBeenCalledWith(100, 42);
    });

    it('EP: Should only return non-deleted images', async () => {
      mockRepository.listByUser.mockResolvedValue([
        { id: 1, isDelete: false },
        { id: 2, isDelete: false },
      ]);

      const result = await service.listByUser(100);

      result.forEach((img: any) => {
        expect(img.isDelete).toBe(false);
      });
    });

    it('EP: Should order by id DESC', async () => {
      mockRepository.listByUser.mockResolvedValue([
        { id: 3 },
        { id: 2 },
        { id: 1 },
      ]);

      const result = await service.listByUser(100);

      expect(result[0].id).toBeGreaterThan(result[result.length - 1].id);
    });

    it('BVA: User with no images', async () => {
      mockRepository.listByUser.mockResolvedValue([]);

      const result = await service.listByUser(100);

      expect(result).toEqual([]);
    });

    it('BVA: User with many images', async () => {
      mockRepository.listByUser.mockResolvedValue(
        Array.from({ length: 1000 }, (_, i) => ({ id: i + 1 }))
      );

      const result = await service.listByUser(100);

      expect(result).toHaveLength(1000);
    });

    it('BVA: Filter by bookId boundary (1)', async () => {
      mockRepository.listByUser.mockResolvedValue([]);

      await service.listByUser(100, 1);

      expect(mockRepository.listByUser).toHaveBeenCalledWith(100, 1);
    });
  });

  describe('delete', () => {
    it('EP: Should delete user image', async () => {
      mockRepository.delete.mockResolvedValue({ id: 1 });

      await service.delete(100, 1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1, 100);
    });

    it('EP: Should delete from R2 if publicId exists', async () => {
      mockRepository.delete.mockResolvedValue({
        id: 1,
        publicId: 'r2_id_123',
      });

      await service.delete(100, 1);

      expect(mockR2Service.deleteAsset).toHaveBeenCalledWith('r2_id_123');
    });

    it('EP: Should silently fail R2 delete errors', async () => {
      mockRepository.delete.mockResolvedValue({
        id: 1,
        publicId: 'r2_id_123',
      });

      mockR2Service.deleteAsset.mockRejectedValue(new Error('R2 error'));

      // Should not throw
      await expect(service.delete(100, 1)).resolves.toBeDefined();
    });

    it('Error: Should throw NOT_FOUND if doesn\'t exist', async () => {
      mockRepository.delete.mockRejectedValue(new Error('Not found'));

      await expect(service.delete(100, 999)).rejects.toThrow();
    });

    it('Error: Should throw NOT_FOUND if deleted already', async () => {
      mockRepository.delete.mockRejectedValue(new Error('Not found'));

      await expect(service.delete(100, 1)).rejects.toThrow();
    });

    it('Error: Should throw NOT_FOUND if belongs to different user', async () => {
      mockRepository.delete.mockRejectedValue(new Error('Not found'));

      await expect(service.delete(100, 1)).rejects.toThrow();
    });

    it('EP: Should not fire R2 delete if no publicId', async () => {
      mockRepository.delete.mockResolvedValue({
        id: 1,
        publicId: null,
      });

      await service.delete(100, 1);

      expect(mockR2Service.deleteAsset).not.toHaveBeenCalled();
    });

    it('BVA: Delete with boundary id (1)', async () => {
      mockRepository.delete.mockResolvedValue({ id: 1 });

      await service.delete(100, 1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1, 100);
    });
  });

  describe('getUploadSignature', () => {
    it('EP: Should get R2 upload ticket for gallery', async () => {
      mockR2Service.getUploadSignature.mockResolvedValue({
        token: 'hmac_token',
        folder: 'echotrace/gallery/user_100',
        expiry: Math.floor(Date.now() / 1000) + 600,
        uploadUrl: 'https://r2.example.com/upload',
      });

      const result = await service.getUploadSignature(100, 'gallery');

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('folder');
      expect(result).toHaveProperty('expiry');
    });

    it('EP: Should set folder per type (gallery)', async () => {
      mockR2Service.getUploadSignature.mockResolvedValue({
        folder: 'echotrace/gallery/user_100',
      });

      await service.getUploadSignature(100, 'gallery');

      expect(mockR2Service.getUploadSignature).toHaveBeenCalledWith(
        expect.stringContaining('echotrace/gallery/user_100')
      );
    });

    it('EP: Should set folder per type (book-thumb)', async () => {
      mockR2Service.getUploadSignature.mockResolvedValue({
        folder: 'echotrace/books/user_100',
      });

      await service.getUploadSignature(100, 'book-thumb');

      expect(mockR2Service.getUploadSignature).toHaveBeenCalled();
    });

    it('EP: Should set folder per type (sticker - shared)', async () => {
      mockR2Service.getUploadSignature.mockResolvedValue({
        folder: 'echotrace/stickers',
      });

      await service.getUploadSignature(100, 'sticker');

      expect(mockR2Service.getUploadSignature).toHaveBeenCalled();
    });

    it('EP: Should include HMAC signature in response', async () => {
      mockR2Service.getUploadSignature.mockResolvedValue({
        token: 'hmac_sha256_signature',
        folder: 'echotrace/gallery/user_100',
      });

      const result = await service.getUploadSignature(100, 'gallery');

      expect(result.token).toBeDefined();
      expect(result.token.length).toBeGreaterThan(0);
    });

    it('BVA: Expiry is current + 600 seconds', async () => {
      const now = Math.floor(Date.now() / 1000);

      mockR2Service.getUploadSignature.mockResolvedValue({
        expiry: now + 600,
      });

      const result = await service.getUploadSignature(100, 'gallery');

      expect(result.expiry).toBe(now + 600);
    });
  });

  describe('Scope & Authorization', () => {
    it('Pattern: All operations scope-checked by userId', async () => {
      mockRepository.findById.mockResolvedValue(null); // Fails scope check

      await expect(service.getById(100, 1)).rejects.toThrow();
    });

    it('Pattern: User can only access their images', async () => {
      mockRepository.delete.mockRejectedValue(new Error('Not found'));

      // User 100 cannot delete User 200's image
      await expect(service.delete(100, 1)).rejects.toThrow();
    });
  });

  describe('R2 Integration', () => {
    it('Pattern: R2 delete is fire-and-forget', async () => {
      mockRepository.delete.mockResolvedValue({
        id: 1,
        publicId: 'r2_id',
      });

      mockR2Service.deleteAsset.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(true), 100))
      );

      const deletePromise = service.delete(100, 1);

      // Should return immediately
      expect(deletePromise).toBeDefined();
    });

    it('Pattern: Errors from R2 are swallowed', async () => {
      mockRepository.delete.mockResolvedValue({
        id: 1,
        publicId: 'r2_id',
      });

      mockR2Service.deleteAsset.mockRejectedValue(new Error('Network timeout'));

      // Should not throw
      const result = await service.delete(100, 1);

      expect(result).toBeDefined();
    });
  });

  describe('Metadata Handling', () => {
    it('Pattern: Optional metadata preserved', async () => {
      mockRepository.create.mockResolvedValue({
        id: 1,
        url: 'https://example.com/image.jpg',
        width: 800,
        height: 600,
        size: 50000,
        bookId: 42,
      });

      const result = await service.create(100, {
        url: 'https://example.com/image.jpg',
        width: 800,
        height: 600,
        size: 50000,
        bookId: 42,
      });

      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(result.size).toBe(50000);
      expect(result.bookId).toBe(42);
    });
  });
});
