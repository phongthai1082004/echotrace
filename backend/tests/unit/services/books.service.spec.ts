/**
 * Books Service - Comprehensive Unit Tests
 *
 * Methodology: EP (Equivalence Partitioning), BVA (Boundary Value Analysis), Validation Testing
 *
 * Test Coverage:
 * 1. getById() - Get book by ID with ownership check
 * 2. getMyBooks() - List user's books
 * 3. create() - Create new book with defaults
 * 4. delete() - Delete book with authorization
 * 5. updatePages() - Update book content/pages
 * 6. Authorization checks (403 Forbidden)
 * 7. Book ownership validation
 * 8. Content merging and updates
 * 9. Paper size handling (height/width)
 * 10. Error cases (404, 403, validation errors)
 *
 * Total Tests: 38+
 */

import { BookService } from '../../../src/features/books/books.service';
import { BookRepository } from '../../../src/features/books/books.repository';
import { AppError } from '../../../src/middleware/app.error';
import { ErrorCode } from '@echotrace/shared';

describe('BookService - Unit Tests', () => {
  let service: BookService;
  let mockBookRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockBookRepo = {
      findBookById: jest.fn(),
      listBooksByUser: jest.fn(),
      createBook: jest.fn(),
      deleteBook: jest.fn(),
      updateBook: jest.fn(),
    };

    service = new BookService(mockBookRepo);
  });

  // ==================== 1. GET BY ID ====================
  describe('1. EP: getById()', () => {
    test('EP: Valid book ID and user → return book', async () => {
      const book = {
        id: 1,
        userId: 100,
        title: 'My Travel Book',
        type: 'TRAVEL',
        style: 'PHOTOBOOK',
        createdAt: new Date(),
      };

      mockBookRepo.findBookById.mockResolvedValue(book);

      const result = await service.getById(1, 100);

      expect(result).toBeDefined();
      expect(result.title).toBe('My Travel Book');
      expect(mockBookRepo.findBookById).toHaveBeenCalledWith(1);
    });

    test('EP: Book not found → throw 404', async () => {
      mockBookRepo.findBookById.mockResolvedValue(null);

      await expect(service.getById(999, 100)).rejects.toThrow(
        expect.objectContaining({ statusCode: 404 }),
      );
    });

    test('Authorization: Book belongs to different user → throw 403', async () => {
      const book = { id: 1, userId: 100, title: 'Book' };
      mockBookRepo.findBookById.mockResolvedValue(book);

      await expect(service.getById(1, 999)).rejects.toThrow(
        expect.objectContaining({ statusCode: 403 }),
      );
    });

    test('EP: Book with same userId → allow access', async () => {
      const book = { id: 1, userId: 100, title: 'Book' };
      mockBookRepo.findBookById.mockResolvedValue(book);

      const result = await service.getById(1, 100);

      expect(result).toBeDefined();
    });

    test('BVA: Book ID = 1 (minimum)', async () => {
      const book = { id: 1, userId: 100 };
      mockBookRepo.findBookById.mockResolvedValue(book);

      const result = await service.getById(1, 100);

      expect(result).toBeDefined();
    });

    test('BVA: Book ID = 999999 (large)', async () => {
      mockBookRepo.findBookById.mockResolvedValue(null);

      await expect(service.getById(999999, 100)).rejects.toThrow();
    });

    test('BVA: User ID = 1 (minimum)', async () => {
      const book = { id: 1, userId: 1 };
      mockBookRepo.findBookById.mockResolvedValue(book);

      const result = await service.getById(1, 1);

      expect(result).toBeDefined();
    });
  });

  // ==================== 2. GET MY BOOKS ====================
  describe('2. EP: getMyBooks()', () => {
    test('EP: User with books → return list', async () => {
      const books = [
        { id: 1, userId: 100, title: 'Book 1' },
        { id: 2, userId: 100, title: 'Book 2' },
        { id: 3, userId: 100, title: 'Book 3' },
      ];

      mockBookRepo.listBooksByUser.mockResolvedValue(books);

      const result = await service.getMyBooks(100);

      expect(result).toHaveLength(3);
      expect(mockBookRepo.listBooksByUser).toHaveBeenCalledWith(100);
    });

    test('EP: User with no books → return empty array', async () => {
      mockBookRepo.listBooksByUser.mockResolvedValue([]);

      const result = await service.getMyBooks(100);

      expect(result).toEqual([]);
    });

    test('EP: User with many books (100+) → return all', async () => {
      const books = Array.from({ length: 150 }, (_, i) => ({
        id: i + 1,
        userId: 100,
        title: `Book ${i + 1}`,
      }));

      mockBookRepo.listBooksByUser.mockResolvedValue(books);

      const result = await service.getMyBooks(100);

      expect(result).toHaveLength(150);
    });

    test('BVA: User ID = 1', async () => {
      mockBookRepo.listBooksByUser.mockResolvedValue([]);

      const result = await service.getMyBooks(1);

      expect(result).toEqual([]);
    });
  });

  // ==================== 3. CREATE BOOK ====================
  describe('3. EP: create()', () => {
    describe('3.1 Basic Creation', () => {
      test('EP: Valid data → create book with defaults', async () => {
        const newBook = {
          id: 10,
          userId: 100,
          title: 'My New Book',
          type: 'TRAVEL',
          style: 'PHOTOBOOK',
          font: 'Inter',
          cover: 'softcover',
          paperHeight: null,
          paperWidth: null,
          content: null,
          createdAt: new Date(),
        };

        mockBookRepo.createBook.mockResolvedValue(newBook);

        const result = await service.create(100, { 
          title: 'My New Book',
          content: null as any,
        });

        expect(result.id).toBe(10);
        expect(result.title).toBe('My New Book');
        expect(mockBookRepo.createBook).toHaveBeenCalledWith(
          expect.objectContaining({
            user: { connect: { id: 100 } },
            type: 'TRAVEL',
            style: 'PHOTOBOOK',
            font: 'Inter',
            cover: 'softcover',
          }),
        );
      });

      test('EP: No title provided → use "Untitled"', async () => {
        const newBook = {
          id: 10,
          userId: 100,
          title: 'Untitled',
          type: 'TRAVEL',
        };

        mockBookRepo.createBook.mockResolvedValue(newBook);

        const result = await service.create(100, {
          content: null as any,
        });

        expect(result.title).toBe('Untitled');
        expect(mockBookRepo.createBook).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Untitled' }),
        );
      });
    });

    describe('3.2 Paper Size Handling', () => {
      test('EP: Paper height provided', async () => {
        const newBook = {
          id: 10,
          userId: 100,
          paperHeight: 300,
          paperWidth: null,
        };

        mockBookRepo.createBook.mockResolvedValue(newBook);

        const result = await service.create(100, { 
          paperHeight: 300,
          content: null as any,
        });

        expect(mockBookRepo.createBook).toHaveBeenCalledWith(
          expect.objectContaining({ paperHeight: 300 }),
        );
      });

      test('EP: Paper width provided', async () => {
        const newBook = {
          id: 10,
          userId: 100,
          paperHeight: null,
          paperWidth: 200,
        };

        mockBookRepo.createBook.mockResolvedValue(newBook);

        const result = await service.create(100, { 
          paperWidth: 200,
          content: null as any,
        });

        expect(mockBookRepo.createBook).toHaveBeenCalledWith(
          expect.objectContaining({ paperWidth: 200 }),
        );
      });

      test('BVA: Paper height = 1 (minimum)', async () => {
        const newBook = { id: 10, userId: 100, paperHeight: 1, paperWidth: null };
        mockBookRepo.createBook.mockResolvedValue(newBook);

        const result = await service.create(100, { 
          paperHeight: 1,
          content: null as any,
        });

        expect(result.paperHeight).toBe(1);
      });

      test('BVA: Paper height = 10000 (large)', async () => {
        const newBook = { id: 10, userId: 100, paperHeight: 10000, paperWidth: null };
        mockBookRepo.createBook.mockResolvedValue(newBook);

        const result = await service.create(100, { 
          paperHeight: 10000,
          content: null as any,
        });

        expect(result.paperHeight).toBe(10000);
      });
    });

    describe('3.3 Content Handling', () => {
      test('EP: Content provided → passed to repo but not returned', async () => {
        const content = JSON.stringify({ pages: [{ id: 1 }] });
        const newBook = {
          id: 10,
          userId: 100,
          content: content,
        };

        mockBookRepo.createBook.mockResolvedValue(newBook);

        const result = await service.create(100, { content });

        expect(mockBookRepo.createBook).toHaveBeenCalledWith(
          expect.objectContaining({ content }),
        );
        // Content should be nulled in response
        expect(result.content).toBeNull();
      });

      test('EP: No content → defaults to null', async () => {
        const newBook = {
          id: 10,
          userId: 100,
          content: null,
        };

        mockBookRepo.createBook.mockResolvedValue(newBook);

        const result = await service.create(100, { content: null as any });

        expect(result.content).toBeNull();
      });
    });
  });

  // ==================== 4. DELETE BOOK ====================
  describe('4. EP: delete()', () => {
    test('EP: Valid book and user → delete success', async () => {
      const book = { id: 1, userId: 100 };
      mockBookRepo.findBookById.mockResolvedValue(book);
      mockBookRepo.deleteBook.mockResolvedValue({});

      await service.delete(1, 100);

      expect(mockBookRepo.deleteBook).toHaveBeenCalledWith(1);
    });

    test('EP: Book not found → throw 404', async () => {
      mockBookRepo.findBookById.mockResolvedValue(null);

      await expect(service.delete(999, 100)).rejects.toThrow(
        expect.objectContaining({ statusCode: 404 }),
      );
    });

    test('Authorization: Different user → throw 403', async () => {
      const book = { id: 1, userId: 100 };
      mockBookRepo.findBookById.mockResolvedValue(book);

      await expect(service.delete(1, 999)).rejects.toThrow(
        expect.objectContaining({ statusCode: 403 }),
      );
    });

    test('EP: Delete should call repo with correct ID', async () => {
      const book = { id: 1, userId: 100 };
      mockBookRepo.findBookById.mockResolvedValue(book);
      mockBookRepo.deleteBook.mockResolvedValue({});

      await service.delete(1, 100);

      expect(mockBookRepo.findBookById).toHaveBeenCalledWith(1);
      expect(mockBookRepo.deleteBook).toHaveBeenCalledWith(1);
    });

    test('BVA: Delete with ID = 1', async () => {
      const book = { id: 1, userId: 100 };
      mockBookRepo.findBookById.mockResolvedValue(book);
      mockBookRepo.deleteBook.mockResolvedValue({});

      await service.delete(1, 100);

      expect(mockBookRepo.deleteBook).toHaveBeenCalledWith(1);
    });
  });

  // ==================== 5. UPDATE PAGES ====================
  describe('5. EP: updatePages()', () => {
    describe('5.1 Content Update', () => {
      test('EP: Valid content update → merge with existing', async () => {
        const currentBook = {
          id: 1,
          userId: 100,
          content: JSON.stringify({ pages: [{ id: 1, text: 'Page 1' }] }),
          title: 'My Book',
        };

        mockBookRepo.findBookById.mockResolvedValue(currentBook);
        mockBookRepo.updateBook.mockResolvedValue({});

        const newContent = JSON.stringify({ pages: [{ id: 1, text: 'Updated' }] });

        await service.updatePages(1, 100, { content: newContent });

        expect(mockBookRepo.updateBook).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ content: expect.any(String) }),
        );
      });

      test('EP: Book not found → throw 404', async () => {
        mockBookRepo.findBookById.mockResolvedValue(null);

        await expect(
          service.updatePages(999, 100, { content: '{}' }),
        ).rejects.toThrow(expect.objectContaining({ statusCode: 404 }));
      });

      test('Authorization: Different user → throw 403', async () => {
        const book = { id: 1, userId: 100, content: null };
        mockBookRepo.findBookById.mockResolvedValue(book);

        await expect(
          service.updatePages(1, 999, { content: '{}' }),
        ).rejects.toThrow(expect.objectContaining({ statusCode: 403 }));
      });
    });

    describe('5.2 Title Update', () => {
      test('EP: Update title', async () => {
        const book = {
          id: 1,
          userId: 100,
          title: 'Old Title',
          content: null,
        };

        mockBookRepo.findBookById.mockResolvedValue(book);
        mockBookRepo.updateBook.mockResolvedValue({});

        await service.updatePages(1, 100, { title: 'New Title' });

        expect(mockBookRepo.updateBook).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ title: 'New Title' }),
        );
      });

      test('EP: Title = undefined → skip update', async () => {
        const book = {
          id: 1,
          userId: 100,
          title: 'Old Title',
          content: null,
        };

        mockBookRepo.findBookById.mockResolvedValue(book);
        mockBookRepo.updateBook.mockResolvedValue({});

        await service.updatePages(1, 100, { content: null });

        const callArgs = mockBookRepo.updateBook.mock.calls[0][1];
        expect(callArgs.title).toBeUndefined();
      });

      test('BVA: Very long title (500+ chars)', async () => {
        const book = { id: 1, userId: 100, content: null };
        const longTitle = 'A'.repeat(500);

        mockBookRepo.findBookById.mockResolvedValue(book);
        mockBookRepo.updateBook.mockResolvedValue({});

        await service.updatePages(1, 100, { title: longTitle });

        expect(mockBookRepo.updateBook).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ title: longTitle }),
        );
      });
    });

    describe('5.3 Paper Size Update', () => {
      test('EP: Update paper height', async () => {
        const book = {
          id: 1,
          userId: 100,
          paperHeight: 200,
          content: null,
        };

        mockBookRepo.findBookById.mockResolvedValue(book);
        mockBookRepo.updateBook.mockResolvedValue({});

        await service.updatePages(1, 100, { paperHeight: 300 });

        expect(mockBookRepo.updateBook).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ paperHeight: 300 }),
        );
      });

      test('EP: Update paper width', async () => {
        const book = {
          id: 1,
          userId: 100,
          paperWidth: 200,
          content: null,
        };

        mockBookRepo.findBookById.mockResolvedValue(book);
        mockBookRepo.updateBook.mockResolvedValue({});

        await service.updatePages(1, 100, { paperWidth: 250 });

        expect(mockBookRepo.updateBook).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ paperWidth: 250 }),
        );
      });

      test('EP: Update both height and width', async () => {
        const book = {
          id: 1,
          userId: 100,
          paperHeight: 200,
          paperWidth: 150,
          content: null,
        };

        mockBookRepo.findBookById.mockResolvedValue(book);
        mockBookRepo.updateBook.mockResolvedValue({});

        await service.updatePages(1, 100, {
          paperHeight: 300,
          paperWidth: 250,
        });

        expect(mockBookRepo.updateBook).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            paperHeight: 300,
            paperWidth: 250,
          }),
        );
      });

      test('BVA: Paper height = 0 (boundary)', async () => {
        const book = { id: 1, userId: 100, content: null };
        mockBookRepo.findBookById.mockResolvedValue(book);
        mockBookRepo.updateBook.mockResolvedValue({});

        await service.updatePages(1, 100, { paperHeight: 0 });

        expect(mockBookRepo.updateBook).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ paperHeight: 0 }),
        );
      });
    });

    describe('5.4 Multiple Field Updates', () => {
      test('EP: Update title + paperHeight', async () => {
        const book = {
          id: 1,
          userId: 100,
          title: 'Old',
          paperHeight: 200,
          content: null,
        };

        mockBookRepo.findBookById.mockResolvedValue(book);
        mockBookRepo.updateBook.mockResolvedValue({});

        await service.updatePages(1, 100, {
          title: 'New Title',
          paperHeight: 300,
        });

        expect(mockBookRepo.updateBook).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            title: 'New Title',
            paperHeight: 300,
          }),
        );
      });

      test('EP: Update all fields', async () => {
        const book = {
          id: 1,
          userId: 100,
          title: 'Old',
          paperHeight: 200,
          paperWidth: 150,
          content: '{}',
        };

        mockBookRepo.findBookById.mockResolvedValue(book);
        mockBookRepo.updateBook.mockResolvedValue({});

        await service.updatePages(1, 100, {
          title: 'Updated',
          paperHeight: 300,
          paperWidth: 250,
          content: '{"pages":[]}',
        });

        expect(mockBookRepo.updateBook).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            title: 'Updated',
            paperHeight: 300,
            paperWidth: 250,
            content: expect.any(String),
          }),
        );
      });
    });
  });

  // ==================== 6. EDGE CASES ====================
  describe('6. Edge Cases', () => {
    test('Edge: Book with null content → handle gracefully', async () => {
      const book = {
        id: 1,
        userId: 100,
        content: null,
      };

      mockBookRepo.findBookById.mockResolvedValue(book);
      mockBookRepo.updateBook.mockResolvedValue({});

      await service.updatePages(1, 100, { title: 'Updated' });

      expect(mockBookRepo.updateBook).toHaveBeenCalled();
    });

    test('Edge: Multiple users accessing different books', async () => {
      const book1 = { id: 1, userId: 100 };
      const book2 = { id: 2, userId: 101 };

      mockBookRepo.findBookById
        .mockResolvedValueOnce(book1)
        .mockResolvedValueOnce(book2);

      const result1 = await service.getById(1, 100);
      expect(result1).toBeDefined();

      await expect(service.getById(2, 100)).rejects.toThrow();

      expect(mockBookRepo.findBookById).toHaveBeenCalledTimes(2);
    });

    test('Edge: Create + immediately update sequence', async () => {
      const newBook = {
        id: 10,
        userId: 100,
        title: 'New',
        content: null,
      };

      mockBookRepo.createBook.mockResolvedValue(newBook);
      mockBookRepo.findBookById.mockResolvedValue(newBook);
      mockBookRepo.updateBook.mockResolvedValue({});

      const created = await service.create(100, { 
        title: 'New',
        content: null as any,
      });

      await service.updatePages(10, 100, { title: 'Updated' });

      expect(mockBookRepo.createBook).toHaveBeenCalled();
      expect(mockBookRepo.updateBook).toHaveBeenCalled();
    });

    test('Edge: Empty string title', async () => {
      const newBook = {
        id: 10,
        userId: 100,
        title: '',
        content: null,
      };

      mockBookRepo.createBook.mockResolvedValue(newBook);

      const result = await service.create(100, { 
        title: '',
        content: null as any,
      });

      expect(result.title).toBe('');
    });

    test('Edge: Concurrent updates to same book', async () => {
      const book = {
        id: 1,
        userId: 100,
        content: null,
        title: 'Original',
      };

      mockBookRepo.findBookById.mockResolvedValue(book);
      mockBookRepo.updateBook.mockResolvedValue({});

      const updates = [
        service.updatePages(1, 100, { title: 'Update 1' }),
        service.updatePages(1, 100, { title: 'Update 2' }),
        service.updatePages(1, 100, { title: 'Update 3' }),
      ];

      await Promise.all(updates);

      expect(mockBookRepo.updateBook).toHaveBeenCalledTimes(3);
    });
  });
});
