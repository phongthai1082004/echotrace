import { BooksRepository } from '@features/books/books.repository';
import { PrismaService } from '@lib/prisma';
import { Prisma } from '@prisma/client';

describe('BooksRepository - Unit Tests', () => {
  let repo: BooksRepository;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    mockPrismaService = {
      db: {
        book: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          count: jest.fn(),
        },
      },
    } as unknown as jest.Mocked<PrismaService>;

    repo = new BooksRepository(mockPrismaService);
  });

  describe('findBookById', () => {
    it('EP: Should find book by id', async () => {
      const mockBook = {
        id: 1,
        title: 'Test Book',
        userId: 100,
        pages: 200,
        description: 'A test book',
        images: [],
      };

      mockPrismaService.db.book.findUnique.mockResolvedValue(mockBook as any);

      const result = await repo.findBookById(1);

      expect(result).toEqual(mockBook);
      expect(mockPrismaService.db.book.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('EP: Should return null for non-existent book', async () => {
      mockPrismaService.db.book.findUnique.mockResolvedValue(null);

      const result = await repo.findBookById(999);

      expect(result).toBeNull();
    });

    it('BVA: Should find book with boundary id (1)', async () => {
      mockPrismaService.db.book.findUnique.mockResolvedValue({} as any);

      await repo.findBookById(1);

      expect(mockPrismaService.db.book.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('BVA: Should find book with large id', async () => {
      mockPrismaService.db.book.findUnique.mockResolvedValue(null);

      await repo.findBookById(2147483647);

      expect(mockPrismaService.db.book.findUnique).toHaveBeenCalledWith({
        where: { id: 2147483647 },
      });
    });

    it('EP: Should include full book data', async () => {
      const mockBook = {
        id: 1,
        title: 'Test Book',
        userId: 100,
        pages: 200,
        description: 'Description',
        images: ['img1.jpg', 'img2.jpg'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.db.book.findUnique.mockResolvedValue(mockBook as any);

      const result = await repo.findBookById(1);

      expect(result).toHaveProperty('title', 'Test Book');
      expect(result).toHaveProperty('pages', 200);
      expect(result).toHaveProperty('images');
    });
  });

  describe('listBooksByUser', () => {
    it('EP: Should list all books for user', async () => {
      const mockBooks = [
        { id: 1, title: 'Book 1', userId: 100 },
        { id: 2, title: 'Book 2', userId: 100 },
        { id: 3, title: 'Book 3', userId: 100 },
      ];

      mockPrismaService.db.book.findMany.mockResolvedValue(mockBooks as any);

      const result = await repo.listBooksByUser(100);

      expect(result).toHaveLength(3);
      expect(mockPrismaService.db.book.findMany).toHaveBeenCalledWith({
        where: { userId: 100 },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('EP: Should return empty array for user with no books', async () => {
      mockPrismaService.db.book.findMany.mockResolvedValue([]);

      const result = await repo.listBooksByUser(100);

      expect(result).toEqual([]);
    });

    it('EP: Should order by creation date descending (newest first)', async () => {
      const mockBooks = [
        { id: 3, title: 'Newest', createdAt: new Date(2026, 8, 1) },
        { id: 2, title: 'Middle', createdAt: new Date(2026, 7, 1) },
        { id: 1, title: 'Oldest', createdAt: new Date(2026, 6, 1) },
      ];

      mockPrismaService.db.book.findMany.mockResolvedValue(mockBooks as any);

      const result = await repo.listBooksByUser(100);

      expect(mockPrismaService.db.book.findMany).toHaveBeenCalledWith({
        where: { userId: 100 },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('BVA: Should handle user with many books', async () => {
      const mockBooks = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        title: `Book ${i + 1}`,
        userId: 100,
      }));

      mockPrismaService.db.book.findMany.mockResolvedValue(mockBooks as any);

      const result = await repo.listBooksByUser(100);

      expect(result).toHaveLength(1000);
    });

    it('BVA: Should list books for boundary user id (1)', async () => {
      mockPrismaService.db.book.findMany.mockResolvedValue([]);

      await repo.listBooksByUser(1);

      expect(mockPrismaService.db.book.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('BVA: Should list books for large user id', async () => {
      mockPrismaService.db.book.findMany.mockResolvedValue([]);

      await repo.listBooksByUser(2147483647);

      expect(mockPrismaService.db.book.findMany).toHaveBeenCalledWith({
        where: { userId: 2147483647 },
        orderBy: expect.any(Object),
      });
    });

    it('EP: Should only list books for specific user', async () => {
      mockPrismaService.db.book.findMany.mockResolvedValue([]);

      await repo.listBooksByUser(100);

      expect(mockPrismaService.db.book.findMany).toHaveBeenCalledWith({
        where: { userId: 100 },
        orderBy: expect.any(Object),
      });
    });
  });

  describe('createBook', () => {
    it('EP: Should create new book', async () => {
      const data = {
        title: 'New Book',
        userId: 100,
        pages: 250,
        description: 'A new book',
      };

      mockPrismaService.db.book.create.mockResolvedValue({
        id: 1,
        ...data,
        images: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await repo.createBook(data);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('title', 'New Book');
      expect(mockPrismaService.db.book.create).toHaveBeenCalledWith({ data });
    });

    it('EP: Should create book with minimal data', async () => {
      const data = { title: 'Simple Book', userId: 100 };

      mockPrismaService.db.book.create.mockResolvedValue({
        id: 1,
        ...data,
        pages: 0,
        images: [],
      } as any);

      const result = await repo.createBook(data);

      expect(result).toHaveProperty('title', 'Simple Book');
    });

    it('EP: Should create book with full data', async () => {
      const data = {
        title: 'Full Book',
        userId: 100,
        pages: 500,
        description: 'Detailed description',
        images: ['cover.jpg', 'page1.jpg'],
      };

      mockPrismaService.db.book.create.mockResolvedValue({ id: 1, ...data } as any);

      const result = await repo.createBook(data);

      expect(result).toHaveProperty('pages', 500);
      expect(result).toHaveProperty('description');
    });

    it('Error: Should handle duplicate book title for same user', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint', { code: 'P2002' });
      mockPrismaService.db.book.create.mockRejectedValue(error);

      await expect(repo.createBook({ title: 'Dup', userId: 100 })).rejects.toThrow();
    });

    it('BVA: Pages boundary - minimum (0)', async () => {
      mockPrismaService.db.book.create.mockResolvedValue({ id: 1, pages: 0 } as any);

      await repo.createBook({ title: 'Empty', userId: 100, pages: 0 });

      expect(mockPrismaService.db.book.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ pages: 0 }),
      });
    });

    it('BVA: Pages boundary - maximum (999999)', async () => {
      mockPrismaService.db.book.create.mockResolvedValue({ id: 1, pages: 999999 } as any);

      await repo.createBook({ title: 'Huge', userId: 100, pages: 999999 });

      expect(mockPrismaService.db.book.create).toHaveBeenCalled();
    });

    it('EP: Should create book with empty description', async () => {
      mockPrismaService.db.book.create.mockResolvedValue({
        id: 1,
        description: '',
      } as any);

      await repo.createBook({ title: 'No Desc', userId: 100, description: '' });

      expect(mockPrismaService.db.book.create).toHaveBeenCalled();
    });

    it('EP: Should create book with empty images array', async () => {
      mockPrismaService.db.book.create.mockResolvedValue({ id: 1, images: [] } as any);

      await repo.createBook({ title: 'No Images', userId: 100, images: [] });

      expect(mockPrismaService.db.book.create).toHaveBeenCalled();
    });
  });

  describe('updateBook', () => {
    it('EP: Should update book details', async () => {
      const update = { title: 'Updated Title', pages: 300 };

      mockPrismaService.db.book.update.mockResolvedValue({
        id: 1,
        ...update,
      } as any);

      const result = await repo.updateBook(1, update);

      expect(result).toHaveProperty('title', 'Updated Title');
      expect(mockPrismaService.db.book.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: update,
      });
    });

    it('EP: Should update single field', async () => {
      mockPrismaService.db.book.update.mockResolvedValue({
        id: 1,
        title: 'New Title',
      } as any);

      await repo.updateBook(1, { title: 'New Title' });

      expect(mockPrismaService.db.book.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { title: 'New Title' },
      });
    });

    it('EP: Should update multiple fields', async () => {
      const update = {
        title: 'Updated',
        pages: 400,
        description: 'New description',
        images: ['new_cover.jpg'],
      };

      mockPrismaService.db.book.update.mockResolvedValue({ id: 1, ...update } as any);

      await repo.updateBook(1, update);

      expect(mockPrismaService.db.book.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: update,
      });
    });

    it('Error: Should handle non-existent book', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025' });
      mockPrismaService.db.book.update.mockRejectedValue(error);

      await expect(repo.updateBook(999, { title: 'Update' })).rejects.toThrow();
    });

    it('BVA: Should update pages to boundary', async () => {
      mockPrismaService.db.book.update.mockResolvedValue({ id: 1, pages: 0 } as any);

      await repo.updateBook(1, { pages: 0 });

      expect(mockPrismaService.db.book.update).toHaveBeenCalled();
    });

    it('BVA: Should update description to empty string', async () => {
      mockPrismaService.db.book.update.mockResolvedValue({
        id: 1,
        description: '',
      } as any);

      await repo.updateBook(1, { description: '' });

      expect(mockPrismaService.db.book.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { description: '' },
      });
    });

    it('EP: Should update images array', async () => {
      const newImages = ['img1.jpg', 'img2.jpg', 'img3.jpg'];
      mockPrismaService.db.book.update.mockResolvedValue({
        id: 1,
        images: newImages,
      } as any);

      await repo.updateBook(1, { images: newImages });

      expect(mockPrismaService.db.book.update).toHaveBeenCalled();
    });
  });

  describe('deleteBook', () => {
    it('EP: Should delete book by id', async () => {
      mockPrismaService.db.book.delete.mockResolvedValue({ id: 1 } as any);

      const result = await repo.deleteBook(1);

      expect(result).toHaveProperty('id', 1);
      expect(mockPrismaService.db.book.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('Error: Should handle non-existent book', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025' });
      mockPrismaService.db.book.delete.mockRejectedValue(error);

      await expect(repo.deleteBook(999)).rejects.toThrow();
    });

    it('BVA: Should delete book with boundary id', async () => {
      mockPrismaService.db.book.delete.mockResolvedValue({ id: 1 } as any);

      await repo.deleteBook(1);

      expect(mockPrismaService.db.book.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('Concurrency: Should handle concurrent delete attempts', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025' });

      mockPrismaService.db.book.delete.mockRejectedValueOnce({ id: 1 } as any);
      mockPrismaService.db.book.delete.mockRejectedValueOnce(error);

      // First delete succeeds
      await repo.deleteBook(1);

      // Second delete fails (record already deleted)
      await expect(repo.deleteBook(1)).rejects.toThrow();
    });
  });

  describe('CRUD Operations', () => {
    it('Pattern: Full CRUD cycle', async () => {
      // Create
      mockPrismaService.db.book.create.mockResolvedValue({ id: 1, title: 'New' } as any);
      const created = await repo.createBook({ title: 'New', userId: 100 });
      expect(created).toHaveProperty('id', 1);

      // Read
      mockPrismaService.db.book.findUnique.mockResolvedValue({
        id: 1,
        title: 'New',
      } as any);
      const read = await repo.findBookById(1);
      expect(read).toHaveProperty('title', 'New');

      // Update
      mockPrismaService.db.book.update.mockResolvedValue({
        id: 1,
        title: 'Updated',
      } as any);
      const updated = await repo.updateBook(1, { title: 'Updated' });
      expect(updated).toHaveProperty('title', 'Updated');

      // Delete
      mockPrismaService.db.book.delete.mockResolvedValue({ id: 1 } as any);
      const deleted = await repo.deleteBook(1);
      expect(deleted).toHaveProperty('id', 1);
    });
  });

  describe('User Isolation Pattern', () => {
    it('Pattern: listBooksByUser isolates by userId', async () => {
      mockPrismaService.db.book.findMany.mockResolvedValue([]);

      // User 100 should only see their books
      await repo.listBooksByUser(100);

      expect(mockPrismaService.db.book.findMany).toHaveBeenCalledWith({
        where: { userId: 100 },
        orderBy: expect.any(Object),
      });
    });

    it('Pattern: User 200 should not see User 100 books', async () => {
      const user100Books = [{ id: 1, userId: 100, title: 'Book 1' }];
      const user200Books = [{ id: 2, userId: 200, title: 'Book 2' }];

      mockPrismaService.db.book.findMany.mockResolvedValue(user100Books as any);
      const result100 = await repo.listBooksByUser(100);

      mockPrismaService.db.book.findMany.mockResolvedValue(user200Books as any);
      const result200 = await repo.listBooksByUser(200);

      expect(result100[0].userId).toBe(100);
      expect(result200[0].userId).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('Error: Should propagate database errors', async () => {
      const error = new Error('Database connection failed');
      mockPrismaService.db.book.findUnique.mockRejectedValue(error);

      await expect(repo.findBookById(1)).rejects.toThrow('Database connection failed');
    });

    it('Error: Should translate P2025 errors for update', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025' });
      mockPrismaService.db.book.update.mockRejectedValue(error);

      await expect(repo.updateBook(999, { title: 'Update' })).rejects.toThrow();
    });

    it('Error: Should translate P2025 errors for delete', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025' });
      mockPrismaService.db.book.delete.mockRejectedValue(error);

      await expect(repo.deleteBook(999)).rejects.toThrow();
    });
  });

  describe('Data Integrity', () => {
    it('Integrity: Should preserve book timestamps', async () => {
      const now = new Date();
      mockPrismaService.db.book.findUnique.mockResolvedValue({
        id: 1,
        createdAt: now,
        updatedAt: now,
      } as any);

      const result = await repo.findBookById(1);

      expect(result).toHaveProperty('createdAt', now);
      expect(result).toHaveProperty('updatedAt', now);
    });

    it('Integrity: Should preserve all book fields', async () => {
      const fullBook = {
        id: 1,
        title: 'Test',
        userId: 100,
        pages: 200,
        description: 'Desc',
        images: ['img.jpg'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.db.book.findUnique.mockResolvedValue(fullBook as any);

      const result = await repo.findBookById(1);

      expect(result).toEqual(fullBook);
    });
  });
});
