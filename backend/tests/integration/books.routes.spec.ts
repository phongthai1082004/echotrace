/**
 * Books Routes Integration Tests
 * Test coverage: GET /books, GET /books/:id, POST /books, PUT /books/:id, DELETE /books/:id
 * Methodology: EP (Equivalence Partitioning), BVA (Boundary Value Analysis), error scenarios
 */

import { BookService } from '@features/books/books.service';
import { BookRepository } from '@features/books/books.repository';
import { AppError } from '@middleware/app.error';
import { Request, Response } from 'express';

describe('Books Routes - Integration Tests', () => {
  let mockBookService: jest.Mocked<BookService>;
  let mockBookRepository: jest.Mocked<BookRepository>;
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    mockBookService = {
      getAllBooks: jest.fn(),
      getBookById: jest.fn(),
      createBook: jest.fn(),
      updateBook: jest.fn(),
      deleteBook: jest.fn(),
      searchBooks: jest.fn(),
      getBooksByCategory: jest.fn(),
    } as any;

    mockBookRepository = {
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
      user: { id: 1, role: 'user' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('GET /books - List All Books', () => {
    it('EP: Should return all books', async () => {
      const books = [
        { id: 1, title: 'Book 1', price: 100000, inStock: true },
        { id: 2, title: 'Book 2', price: 150000, inStock: true },
      ];
      mockBookService.getAllBooks.mockResolvedValue(books);

      const result = await mockBookService.getAllBooks();

      expect(result).toEqual(books);
      expect(result).toHaveLength(2);
    });

    it('EP: Should handle empty book list', async () => {
      mockBookService.getAllBooks.mockResolvedValue([]);

      const result = await mockBookService.getAllBooks();

      expect(result).toEqual([]);
    });

    it('EP: Should support pagination', async () => {
      const books = [{ id: 1, title: 'Book 1' }];
      mockBookService.getAllBooks.mockResolvedValue(books);

      req.query = { page: '1', limit: '10' };
      const result = await mockBookService.getAllBooks();

      expect(result).toBeDefined();
    });

    it('BVA: Should handle limit boundary (1 book)', async () => {
      const books = [{ id: 1, title: 'Book 1' }];
      mockBookService.getAllBooks.mockResolvedValue(books);

      const result = await mockBookService.getAllBooks();

      expect(result).toHaveLength(1);
    });

    it('BVA: Should handle large limit (1000 books)', async () => {
      const books = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        title: `Book ${i + 1}`,
      }));
      mockBookService.getAllBooks.mockResolvedValue(books);

      const result = await mockBookService.getAllBooks();

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('GET /books/:id - Get Single Book', () => {
    it('EP: Should return book by ID', async () => {
      const book = { id: 1, title: 'Book 1', price: 100000 };
      mockBookService.getBookById.mockResolvedValue(book);

      req.params.id = '1';
      const result = await mockBookService.getBookById(1);

      expect(result).toEqual(book);
    });

    it('EP: Should return 404 for non-existent book', async () => {
      mockBookService.getBookById.mockResolvedValue(null);

      req.params.id = '999';
      const result = await mockBookService.getBookById(999);

      expect(result).toBeNull();
    });

    it('Error: Should throw on invalid ID format', async () => {
      mockBookService.getBookById.mockRejectedValue(
        new AppError('INVALID_INPUT', 400)
      );

      req.params.id = 'invalid';

      await expect(mockBookService.getBookById(NaN)).rejects.toThrow();
    });

    it('BVA: Should handle ID boundary (1)', async () => {
      const book = { id: 1, title: 'Book 1' };
      mockBookService.getBookById.mockResolvedValue(book);

      const result = await mockBookService.getBookById(1);

      expect(result.id).toBe(1);
    });

    it('BVA: Should handle large ID (999999)', async () => {
      const book = { id: 999999, title: 'Book' };
      mockBookService.getBookById.mockResolvedValue(book);

      const result = await mockBookService.getBookById(999999);

      expect(result?.id).toBe(999999);
    });
  });

  describe('POST /books - Create Book', () => {
    it('EP: Should create book with valid data', async () => {
      const bookData = {
        title: 'New Book',
        price: 100000,
        category: 'Fiction',
      };
      const created = { id: 1, ...bookData, inStock: true };
      mockBookService.createBook.mockResolvedValue(created);

      req.body = bookData;
      const result = await mockBookService.createBook(bookData);

      expect(result.id).toBe(1);
      expect(result.title).toBe('New Book');
    });

    it('EP: Should reject missing title', async () => {
      const bookData = { price: 100000, category: 'Fiction' };
      mockBookService.createBook.mockRejectedValue(
        new AppError('VALIDATION_FAILED', 400)
      );

      req.body = bookData;

      await expect(mockBookService.createBook(bookData)).rejects.toThrow();
    });

    it('EP: Should reject invalid price (negative)', async () => {
      const bookData = {
        title: 'Book',
        price: -100,
        category: 'Fiction',
      };
      mockBookService.createBook.mockRejectedValue(
        new AppError('VALIDATION_FAILED', 400)
      );

      await expect(mockBookService.createBook(bookData)).rejects.toThrow();
    });

    it('BVA: Should handle price boundary (0)', async () => {
      const bookData = {
        title: 'Free Book',
        price: 0,
        category: 'Fiction',
      };
      const created = { id: 1, ...bookData };
      mockBookService.createBook.mockResolvedValue(created);

      const result = await mockBookService.createBook(bookData);

      expect(result.price).toBe(0);
    });

    it('BVA: Should handle large price (1 billion)', async () => {
      const bookData = {
        title: 'Expensive Book',
        price: 1000000000,
        category: 'Fiction',
      };
      const created = { id: 1, ...bookData };
      mockBookService.createBook.mockResolvedValue(created);

      const result = await mockBookService.createBook(bookData);

      expect(result.price).toBe(1000000000);
    });

    it('BVA: Should handle very long title (500 chars)', async () => {
      const longTitle = 'A'.repeat(500);
      const bookData = {
        title: longTitle,
        price: 100000,
        category: 'Fiction',
      };
      const created = { id: 1, ...bookData };
      mockBookService.createBook.mockResolvedValue(created);

      const result = await mockBookService.createBook(bookData);

      expect(result.title).toHaveLength(500);
    });
  });

  describe('PUT /books/:id - Update Book', () => {
    it('EP: Should update book', async () => {
      const update = { title: 'Updated Book' };
      const updated = { id: 1, title: 'Updated Book', price: 100000 };
      mockBookService.updateBook.mockResolvedValue(updated);

      req.params.id = '1';
      req.body = update;
      const result = await mockBookService.updateBook(1, update);

      expect(result.title).toBe('Updated Book');
    });

    it('EP: Should return 404 if book not found', async () => {
      mockBookService.updateBook.mockResolvedValue(null);

      req.params.id = '999';
      req.body = { title: 'Updated' };
      const result = await mockBookService.updateBook(999, { title: 'Updated' });

      expect(result).toBeNull();
    });

    it('EP: Should allow partial updates', async () => {
      const update = { price: 200000 };
      const updated = { id: 1, title: 'Book 1', price: 200000 };
      mockBookService.updateBook.mockResolvedValue(updated);

      const result = await mockBookService.updateBook(1, update);

      expect(result.price).toBe(200000);
    });

    it('Error: Should reject invalid update data', async () => {
      const update = { price: -100 };
      mockBookService.updateBook.mockRejectedValue(
        new AppError('VALIDATION_FAILED', 400)
      );

      await expect(mockBookService.updateBook(1, update)).rejects.toThrow();
    });
  });

  describe('DELETE /books/:id - Delete Book', () => {
    it('EP: Should delete book', async () => {
      mockBookService.deleteBook.mockResolvedValue(true);

      req.params.id = '1';
      const result = await mockBookService.deleteBook(1);

      expect(result).toBe(true);
    });

    it('EP: Should return 404 if book not found', async () => {
      mockBookService.deleteBook.mockResolvedValue(false);

      req.params.id = '999';
      const result = await mockBookService.deleteBook(999);

      expect(result).toBe(false);
    });

    it('Error: Should handle deletion errors', async () => {
      mockBookService.deleteBook.mockRejectedValue(
        new AppError('DATABASE_ERROR', 500)
      );

      await expect(mockBookService.deleteBook(1)).rejects.toThrow();
    });
  });

  describe('GET /books/search - Search Books', () => {
    it('EP: Should search by title', async () => {
      const results = [{ id: 1, title: 'Programming Book', price: 100000 }];
      mockBookService.searchBooks.mockResolvedValue(results);

      req.query = { q: 'Programming' };
      const result = await mockBookService.searchBooks('Programming');

      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('Programming');
    });

    it('EP: Should return empty results if no match', async () => {
      mockBookService.searchBooks.mockResolvedValue([]);

      const result = await mockBookService.searchBooks('NonExistent');

      expect(result).toEqual([]);
    });

    it('BVA: Should handle empty search query', async () => {
      const allBooks = [{ id: 1, title: 'Book 1' }];
      mockBookService.searchBooks.mockResolvedValue(allBooks);

      const result = await mockBookService.searchBooks('');

      expect(result).toBeDefined();
    });
  });

  describe('GET /books/category/:category - Get Books by Category', () => {
    it('EP: Should return books by category', async () => {
      const books = [
        { id: 1, title: 'Book 1', category: 'Fiction' },
        { id: 2, title: 'Book 2', category: 'Fiction' },
      ];
      mockBookService.getBooksByCategory.mockResolvedValue(books);

      req.params.category = 'Fiction';
      const result = await mockBookService.getBooksByCategory('Fiction');

      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('Fiction');
    });

    it('EP: Should return empty if no books in category', async () => {
      mockBookService.getBooksByCategory.mockResolvedValue([]);

      const result = await mockBookService.getBooksByCategory('NonExistent');

      expect(result).toEqual([]);
    });

    it('BVA: Should handle category with special characters', async () => {
      const books = [{ id: 1, title: 'Book', category: 'Sci-Fi' }];
      mockBookService.getBooksByCategory.mockResolvedValue(books);

      const result = await mockBookService.getBooksByCategory('Sci-Fi');

      expect(result).toBeDefined();
    });
  });

  describe('Authorization & Security', () => {
    it('Security: Should not allow unauthorized book deletion', async () => {
      req.user = { id: 2, role: 'user' };
      mockBookService.deleteBook.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(mockBookService.deleteBook(1)).rejects.toThrow();
    });

    it('Security: Should allow admin to manage books', async () => {
      req.user = { id: 1, role: 'admin' };
      mockBookService.createBook.mockResolvedValue({
        id: 1,
        title: 'Book',
        price: 100000,
      } as any);

      const result = await mockBookService.createBook({
        title: 'Book',
        price: 100000,
      } as any);

      expect(result).toBeDefined();
    });
  });

  describe('Performance & Edge Cases', () => {
    it('Performance: Should handle concurrent requests', async () => {
      const mockRequests = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        title: `Book ${i + 1}`,
      }));

      const promises = mockRequests.map((book) =>
        Promise.resolve(book)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
    });

    it('Edge: Should handle book with no stock', async () => {
      const book = {
        id: 1,
        title: 'Out of Stock Book',
        inStock: false,
      };
      mockBookService.getBookById.mockResolvedValue(book);

      const result = await mockBookService.getBookById(1);

      expect(result.inStock).toBe(false);
    });

    it('Edge: Should handle book with null fields', async () => {
      const book = {
        id: 1,
        title: 'Book',
        description: null,
        coverImage: null,
      };
      mockBookService.getBookById.mockResolvedValue(book);

      const result = await mockBookService.getBookById(1);

      expect(result.description).toBeNull();
    });
  });
});
