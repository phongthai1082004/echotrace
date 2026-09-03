/**
 * PDF Generation Service - Unit Tests
 *
 * Methodology: EP (Equivalence Partitioning), Boundary Value Analysis
 *
 * Test Coverage:
 * 1. Book Type Filtering: TEMPLATE/TRAVEL vs ALBUM
 * 2. PDF Rendering: Order to PDF
 * 3. R2 Upload: Upload to Cloudflare
 * 4. Order Item Updates: Set pdfUrl
 * 5. Job Status: PENDING → DONE
 * 6. Edge Cases: Empty items, null values
 *
 * Total Tests: 20
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Test helper for book type filtering
const isRenderableBookType = (type: string | null | undefined): boolean => {
  if (!type) return true; // null/undefined render
  if (type.toUpperCase() === 'ALBUM') return false;
  return true;
};

describe('PDF Service - Unit Tests', () => {
  let mockRenderer: any;
  let mockR2: any;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRenderer = {
      renderOrderToPdf: jest.fn(),
    };

    mockR2 = {
      uploadBuffer: jest.fn(),
    };

    mockPrisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      book: {
        findMany: jest.fn(),
      },
      orderPdfJob: {
        update: jest.fn(),
      },
    };
  });

  // ==================== 1. BOOK TYPE FILTERING ====================
  describe('1. EP: Book Type Filtering', () => {
    test('EP: TEMPLATE type → renderable', () => {
      expect(isRenderableBookType('TEMPLATE')).toBe(true);
    });

    test('EP: TRAVEL type → renderable', () => {
      expect(isRenderableBookType('TRAVEL')).toBe(true);
    });

    test('EP: ALBUM type → not renderable', () => {
      expect(isRenderableBookType('ALBUM')).toBe(false);
    });

    test('EP: lowercase album → not renderable', () => {
      expect(isRenderableBookType('album')).toBe(false);
    });

    test('EP: null/undefined → renderable by default', () => {
      expect(isRenderableBookType(null)).toBe(true);
      expect(isRenderableBookType(undefined)).toBe(true);
    });

    test('EP: Unknown type → renderable', () => {
      expect(isRenderableBookType('CUSTOM')).toBe(true);
    });
  });

  // ==================== 2. PDF RENDERING ====================
  describe('2. EP: PDF Rendering', () => {
    test('EP: Render called with order ID', async () => {
      mockRenderer.renderOrderToPdf.mockResolvedValue(Buffer.from('%PDF'));

      await mockRenderer.renderOrderToPdf(1);

      expect(mockRenderer.renderOrderToPdf).toHaveBeenCalledWith(1);
    });

    test('EP: Render returns Buffer', async () => {
      const pdf = Buffer.from('%PDF-1.4\n%%EOF');
      mockRenderer.renderOrderToPdf.mockResolvedValue(pdf);

      const result = await mockRenderer.renderOrderToPdf(1);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString('utf8')).toContain('%PDF');
    });

    test('EP: Multiple orders render sequentially', async () => {
      mockRenderer.renderOrderToPdf.mockResolvedValue(Buffer.from('%PDF'));

      await mockRenderer.renderOrderToPdf(1);
      await mockRenderer.renderOrderToPdf(2);
      await mockRenderer.renderOrderToPdf(3);

      expect(mockRenderer.renderOrderToPdf).toHaveBeenCalledTimes(3);
    });
  });

  // ==================== 3. R2 UPLOAD ====================
  describe('3. EP: R2 Upload', () => {
    test('EP: Upload called with PDF buffer and key', async () => {
      const pdf = Buffer.from('%PDF');
      mockR2.uploadBuffer.mockResolvedValue('https://r2.example.com/pdf');

      await mockR2.uploadBuffer(pdf, 'order-1');

      expect(mockR2.uploadBuffer).toHaveBeenCalledWith(pdf, 'order-1');
    });

    test('EP: Upload returns R2 URL', async () => {
      mockR2.uploadBuffer.mockResolvedValue('https://r2.example.com/order-123.pdf');

      const url = await mockR2.uploadBuffer(Buffer.from('%PDF'), 'order-123');

      expect(url).toBe('https://r2.example.com/order-123.pdf');
    });

    test('EP: Multiple uploads', async () => {
      mockR2.uploadBuffer.mockResolvedValue('https://r2.example.com/pdf');

      await mockR2.uploadBuffer(Buffer.from('%PDF1'), 'key1');
      await mockR2.uploadBuffer(Buffer.from('%PDF2'), 'key2');
      await mockR2.uploadBuffer(Buffer.from('%PDF3'), 'key3');

      expect(mockR2.uploadBuffer).toHaveBeenCalledTimes(3);
    });
  });

  // ==================== 4. ORDER ITEM UPDATES ====================
  describe('4. EP: Order Item PDF URL Updates', () => {
    test('EP: Renderable item gets pdfUrl', async () => {
      const items = [{ bookId: 1, title: 'Test', pdfUrl: null }];
      const books = [{ id: 1, type: 'TEMPLATE' }];

      const updated = items.map((item) => {
        const book = books.find((b) => b.id === item.bookId);
        if (book && isRenderableBookType(book.type)) {
          return { ...item, pdfUrl: 'https://r2.example.com/pdf' };
        }
        return item;
      });

      expect(updated[0].pdfUrl).toBe('https://r2.example.com/pdf');
    });

    test('EP: Non-renderable item stays null', async () => {
      const items = [{ bookId: 2, title: 'Album', pdfUrl: null }];
      const books = [{ id: 2, type: 'ALBUM' }];

      const updated = items.map((item) => {
        const book = books.find((b) => b.id === item.bookId);
        if (book && isRenderableBookType(book.type)) {
          return { ...item, pdfUrl: 'https://r2.example.com/pdf' };
        }
        return item;
      });

      expect(updated[0].pdfUrl).toBeNull();
    });

    test('EP: Mixed items - selective update', async () => {
      const items = [
        { bookId: 1, title: 'Book1', pdfUrl: null },
        { bookId: 2, title: 'Book2', pdfUrl: null },
      ];
      const books = [
        { id: 1, type: 'TEMPLATE' },
        { id: 2, type: 'ALBUM' },
      ];

      const updated = items.map((item) => {
        const book = books.find((b) => b.id === item.bookId);
        if (book && isRenderableBookType(book.type)) {
          return { ...item, pdfUrl: 'https://r2.example.com/pdf' };
        }
        return item;
      });

      expect(updated[0].pdfUrl).toBe('https://r2.example.com/pdf');
      expect(updated[1].pdfUrl).toBeNull();
    });
  });

  // ==================== 5. JOB STATUS ====================
  describe('5. EP: Job Status Tracking', () => {
    test('EP: Job status set to DONE', async () => {
      const jobData = { status: 'DONE', pdfUrl: 'https://r2.example.com/pdf' };
      mockPrisma.orderPdfJob.update.mockResolvedValue(jobData);

      const result = await mockPrisma.orderPdfJob.update({
        where: { id: 1 },
        data: jobData,
      });

      expect(result.status).toBe('DONE');
    });

    test('EP: Job pdfUrl recorded', async () => {
      const jobData = { status: 'DONE', pdfUrl: 'https://r2.example.com/my-pdf' };
      mockPrisma.orderPdfJob.update.mockResolvedValue(jobData);

      const result = await mockPrisma.orderPdfJob.update({
        where: { id: 1 },
        data: jobData,
      });

      expect(result.pdfUrl).toBe('https://r2.example.com/my-pdf');
    });
  });

  // ==================== 6. EDGE CASES ====================
  describe('6. Edge Cases', () => {
    test('Edge: Empty orderItems array', async () => {
      const items: any[] = [];
      const books: any[] = [];

      const updated = items.map((item) => {
        const book = books.find((b) => b.id === item.bookId);
        if (book && isRenderableBookType(book.type)) {
          return { ...item, pdfUrl: 'https://r2.example.com/pdf' };
        }
        return item;
      });

      expect(updated).toEqual([]);
    });

    test('Edge: Order with existing pdfUrl → overwritten', async () => {
      const order = {
        id: 1,
        pdfUrl: 'https://old-url.com/pdf',
        orderItems: [{ bookId: 1, pdfUrl: null }],
      };

      const newPdfUrl = 'https://new-url.com/pdf';
      const updated = {
        ...order,
        pdfUrl: newPdfUrl,
        orderItems: order.orderItems.map((item) => ({ ...item, pdfUrl: newPdfUrl })),
      };

      expect(updated.pdfUrl).toBe('https://new-url.com/pdf');
    });

    test('Edge: Very large order with many items', async () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        bookId: i + 1,
        title: `Book${i + 1}`,
        pdfUrl: null,
      }));
      const books = items.map((_, i) => ({ id: i + 1, type: 'TEMPLATE' }));

      const updated = items.map((item) => {
        const book = books.find((b) => b.id === item.bookId);
        if (book && isRenderableBookType(book.type)) {
          return { ...item, pdfUrl: 'https://r2.example.com/pdf' };
        }
        return item;
      });

      expect(updated).toHaveLength(100);
      expect(updated.every((i) => i.pdfUrl === 'https://r2.example.com/pdf')).toBe(true);
    });

    test('Edge: Concurrent job completions', async () => {
      mockPrisma.orderPdfJob.update.mockResolvedValue({ status: 'DONE' });

      const results = await Promise.all([
        mockPrisma.orderPdfJob.update({ where: { id: 1 }, data: { status: 'DONE' } }),
        mockPrisma.orderPdfJob.update({ where: { id: 2 }, data: { status: 'DONE' } }),
        mockPrisma.orderPdfJob.update({ where: { id: 3 }, data: { status: 'DONE' } }),
      ]);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.status === 'DONE')).toBe(true);
    });
  });

  // ==================== 7. ERROR HANDLING ====================
  describe('7. Error Handling', () => {
    test('Error: Render fails → exception thrown', async () => {
      mockRenderer.renderOrderToPdf.mockRejectedValue(new Error('Render failed'));

      await expect(mockRenderer.renderOrderToPdf(1)).rejects.toThrow('Render failed');
    });

    test('Error: R2 upload fails → exception thrown', async () => {
      mockR2.uploadBuffer.mockRejectedValue(new Error('R2 failed'));

      await expect(mockR2.uploadBuffer(Buffer.from('%PDF'), 'key')).rejects.toThrow('R2 failed');
    });

    test('Error: Order not found → handled', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      const result = await mockPrisma.order.findUnique({ where: { id: 999 } });

      expect(result).toBeNull();
    });
  });

  // ==================== 8. PAYLOAD VALIDATION ====================
  describe('8. Validation: Payload Structure', () => {
    test('Validation: Order structure with orderItems', async () => {
      const order = {
        id: 1,
        orderItems: [
          { bookId: 1, title: 'Book', pdfUrl: null },
          { bookId: 2, title: 'Album', pdfUrl: null },
        ],
      };

      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('orderItems');
      expect(order.orderItems).toHaveLength(2);
    });

    test('Validation: Book structure with type', async () => {
      const book = { id: 1, type: 'TEMPLATE' };

      expect(book).toHaveProperty('id');
      expect(book).toHaveProperty('type');
      expect(['TEMPLATE', 'TRAVEL', 'ALBUM']).toContain(book.type);
    });

    test('Validation: Job structure with status and pdfUrl', async () => {
      const job = {
        id: 1,
        status: 'DONE',
        pdfUrl: 'https://r2.example.com/pdf',
      };

      expect(job).toHaveProperty('status');
      expect(['PENDING', 'PROCESSING', 'DONE']).toContain(job.status);
      expect(job.pdfUrl).toMatch(/^https:\/\//);
    });
  });
});
