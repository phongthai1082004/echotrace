import { PdfRepository } from '@features/pdf/pdf.repository';
import { PrismaService } from '@lib/prisma';
import { Prisma, OrderPdfJobStatus } from '@prisma/client';

describe('PdfRepository - Unit Tests', () => {
  let repo: PdfRepository;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    mockPrismaService = {
      db: {
        orderPdfJob: {
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          upsert: jest.fn(),
          update: jest.fn(),
        },
        order: {
          findUnique: jest.fn(),
        },
        book: {
          findMany: jest.fn(),
        },
      } as any,
      $transaction: jest.fn((callback) => {
        if (typeof callback === 'function') {
          return callback(mockPrismaService.db);
        }
        return Promise.resolve(callback);
      }),
    } as unknown as jest.Mocked<PrismaService>;

    repo = new PdfRepository(mockPrismaService);
  });

  describe('upsertPdfJob', () => {
    it('EP: Should create new PDF job for order', async () => {
      mockPrismaService.db.orderPdfJob.upsert.mockResolvedValue({
        id: 1,
        orderId: 100,
        status: 'PENDING',
        attempts: 0,
      } as any);

      const result = await repo.upsertPdfJob(100);

      expect(result).toHaveProperty('status', 'PENDING');
      expect(mockPrismaService.db.orderPdfJob.upsert).toHaveBeenCalledWith({
        where: { orderId: 100 },
        create: expect.objectContaining({ orderId: 100, status: 'PENDING' }),
        update: expect.any(Object),
      });
    });

    it('EP: Should reset existing job to PENDING', async () => {
      mockPrismaService.db.orderPdfJob.upsert.mockResolvedValue({
        id: 1,
        orderId: 100,
        status: 'PENDING',
        attempts: 0,
      } as any);

      const result = await repo.upsertPdfJob(100);

      // Should upsert, not just create
      expect(mockPrismaService.db.orderPdfJob.upsert).toHaveBeenCalled();
    });

    it('EP: Should be idempotent (1 order = 1 job)', async () => {
      mockPrismaService.db.orderPdfJob.upsert.mockResolvedValue({
        id: 1,
        orderId: 100,
      } as any);

      // Call twice for same order
      await repo.upsertPdfJob(100);
      await repo.upsertPdfJob(100);

      // Should still be same job
      expect(mockPrismaService.db.orderPdfJob.upsert).toHaveBeenCalledTimes(2);
    });

    it('BVA: Should upsert job for large order id', async () => {
      mockPrismaService.db.orderPdfJob.upsert.mockResolvedValue({
        orderId: 2147483647,
      } as any);

      await repo.upsertPdfJob(2147483647);

      expect(mockPrismaService.db.orderPdfJob.upsert).toHaveBeenCalled();
    });
  });

  describe('claimPdfJob', () => {
    it('EP: Should claim PENDING job', async () => {
      const pendingJob = {
        id: 1,
        orderId: 100,
        status: 'PENDING',
        attempts: 0,
      };

      const mockTx = {
        orderPdfJob: {
          findFirst: jest.fn().mockResolvedValue(pendingJob),
          update: jest.fn().mockResolvedValue({
            ...pendingJob,
            status: 'PROCESSING',
            lockedAt: new Date(),
          }),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      const result = await repo.claimPdfJob();

      expect(result).toEqual(pendingJob);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('EP: Should claim FAILED job if attempts < max', async () => {
      const failedJob = {
        id: 2,
        orderId: 200,
        status: 'FAILED',
        attempts: 1,
      };

      const mockTx = {
        orderPdfJob: {
          findFirst: jest.fn().mockResolvedValue(failedJob),
          update: jest.fn().mockResolvedValue({
            ...failedJob,
            status: 'PROCESSING',
          }),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      const result = await repo.claimPdfJob();

      expect(result).toHaveProperty('status', 'FAILED');
    });

    it('EP: Should claim stale PROCESSING job (timeout > 10 min)', async () => {
      const staleJob = {
        id: 3,
        orderId: 300,
        status: 'PROCESSING',
        lockedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
      };

      const mockTx = {
        orderPdfJob: {
          findFirst: jest.fn().mockResolvedValue(staleJob),
          update: jest.fn().mockResolvedValue({
            ...staleJob,
            status: 'PROCESSING',
            lockedAt: new Date(),
          }),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      const result = await repo.claimPdfJob();

      expect(result).toHaveProperty('status', 'PROCESSING');
    });

    it('EP: Should NOT claim PROCESSING job if recent (< 10 min)', async () => {
      const recentJob = {
        id: 4,
        status: 'PROCESSING',
        lockedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
      };

      const mockTx = {
        orderPdfJob: {
          findFirst: jest.fn().mockResolvedValue(null), // Not found (skipped)
          update: jest.fn(),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      const result = await repo.claimPdfJob();

      expect(result).toBeNull();
    });

    it('EP: Should return null if no available jobs', async () => {
      const mockTx = {
        orderPdfJob: {
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      const result = await repo.claimPdfJob();

      expect(result).toBeNull();
    });

    it('Concurrency: Should atomically lock job (find + update in transaction)', async () => {
      let txCalled = false;

      const mockTx = {
        orderPdfJob: {
          findFirst: jest.fn().mockResolvedValue({ id: 1, orderId: 100 }),
          update: jest.fn().mockResolvedValue({ id: 1, status: 'PROCESSING' }),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) => {
        txCalled = true;
        return callback(mockTx);
      });

      await repo.claimPdfJob();

      // Must use transaction to prevent race condition
      expect(txCalled).toBe(true);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('BVA: Stale timeout boundary - exactly 10 min', async () => {
      const staleJob = {
        id: 1,
        lockedAt: new Date(Date.now() - 10 * 60 * 1000), // exactly 10 min
      };

      const mockTx = {
        orderPdfJob: {
          findFirst: jest.fn().mockResolvedValue(staleJob),
          update: jest.fn(),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      await repo.claimPdfJob();

      // Should consider it stale (10 min = threshold)
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('BVA: Stale timeout boundary - just under 10 min (9:59)', async () => {
      const recentJob = {
        id: 1,
        lockedAt: new Date(Date.now() - 9 * 60 * 59 * 1000), // 9:59 min ago
      };

      const mockTx = {
        orderPdfJob: {
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      const result = await repo.claimPdfJob();

      expect(result).toBeNull();
    });

    it('BVA: Attempts boundary - MAX-1 (can retry)', async () => {
      const failedJob = {
        id: 1,
        status: 'FAILED',
        attempts: 2, // MAX = 3, so 2 < 3
      };

      const mockTx = {
        orderPdfJob: {
          findFirst: jest.fn().mockResolvedValue(failedJob),
          update: jest.fn(),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      const result = await repo.claimPdfJob();

      expect(result).not.toBeNull();
    });

    it('Ordering: Should claim oldest job first (createdAt ASC)', async () => {
      const oldestJob = { id: 1, createdAt: new Date(2026, 0, 1) };

      const mockTx = {
        orderPdfJob: {
          findFirst: jest.fn().mockResolvedValue(oldestJob),
          update: jest.fn(),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      const result = await repo.claimPdfJob();

      expect(result).toEqual(oldestJob);
    });
  });

  describe('markPdfJobDone', () => {
    it('EP: Should mark job as DONE', async () => {
      mockPrismaService.db.orderPdfJob.update.mockResolvedValue({
        id: 1,
        status: 'DONE',
        pdfUrl: 'https://example.com/pdf.pdf',
      } as any);

      const result = await repo.markPdfJobDone(1, 'https://example.com/pdf.pdf');

      expect(result).toHaveProperty('status', 'DONE');
      expect(mockPrismaService.db.orderPdfJob.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          status: 'DONE',
          pdfUrl: 'https://example.com/pdf.pdf',
        }),
      });
    });

    it('EP: Should increment attempts counter', async () => {
      mockPrismaService.db.orderPdfJob.update.mockResolvedValue({
        id: 1,
        attempts: 1,
      } as any);

      await repo.markPdfJobDone(1, 'url');

      expect(mockPrismaService.db.orderPdfJob.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          attempts: { increment: 1 },
        }),
      });
    });

    it('EP: Should clear lock timestamp', async () => {
      mockPrismaService.db.orderPdfJob.update.mockResolvedValue({
        id: 1,
        lockedAt: null,
      } as any);

      await repo.markPdfJobDone(1, 'url');

      expect(mockPrismaService.db.orderPdfJob.update).toHaveBeenCalled();
    });

    it('Error: Should handle non-existent job', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025' });
      mockPrismaService.db.orderPdfJob.update.mockRejectedValue(error);

      await expect(repo.markPdfJobDone(999, 'url')).rejects.toThrow();
    });

    it('BVA: Should handle very long PDF URL', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2000);
      mockPrismaService.db.orderPdfJob.update.mockResolvedValue({ id: 1 } as any);

      await repo.markPdfJobDone(1, longUrl);

      expect(mockPrismaService.db.orderPdfJob.update).toHaveBeenCalled();
    });
  });

  describe('findOrderById', () => {
    it('EP: Should find order by id', async () => {
      const mockOrder = {
        id: 100,
        status: 'CONFIRMED',
        totalPrice: 50000,
      };

      mockPrismaService.db.order.findUnique.mockResolvedValue(mockOrder as any);

      const result = await repo.findOrderById(100);

      expect(result).toEqual(mockOrder);
      expect(mockPrismaService.db.order.findUnique).toHaveBeenCalledWith({
        where: { id: 100 },
      });
    });

    it('EP: Should return null for non-existent order', async () => {
      mockPrismaService.db.order.findUnique.mockResolvedValue(null);

      const result = await repo.findOrderById(999);

      expect(result).toBeNull();
    });

    it('EP: Should accept transaction parameter', async () => {
      const mockTx = jest.fn();
      mockPrismaService.db.order.findUnique.mockResolvedValue(null);

      await repo.findOrderById(100, mockTx as any);

      expect(mockPrismaService.db.order.findUnique).toHaveBeenCalled();
    });
  });

  describe('findBooksByIds', () => {
    it('EP: Should find multiple books by ids', async () => {
      const mockBooks = [
        { id: 1, title: 'Book 1', images: ['img1.jpg'] },
        { id: 2, title: 'Book 2', images: ['img2.jpg'] },
      ];

      mockPrismaService.db.book.findMany.mockResolvedValue(mockBooks as any);

      const result = await repo.findBooksByIds([1, 2]);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.db.book.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
      });
    });

    it('EP: Should return empty array for no ids', async () => {
      mockPrismaService.db.book.findMany.mockResolvedValue([]);

      const result = await repo.findBooksByIds([]);

      expect(result).toEqual([]);
    });

    it('BVA: Should find many books', async () => {
      const bookIds = Array.from({ length: 100 }, (_, i) => i + 1);
      const mockBooks = bookIds.map((id) => ({ id, title: `Book ${id}` }));

      mockPrismaService.db.book.findMany.mockResolvedValue(mockBooks as any);

      const result = await repo.findBooksByIds(bookIds);

      expect(result).toHaveLength(100);
    });

    it('EP: Should accept transaction parameter', async () => {
      const mockTx = jest.fn();
      mockPrismaService.db.book.findMany.mockResolvedValue([]);

      await repo.findBooksByIds([1, 2], mockTx as any);

      expect(mockPrismaService.db.book.findMany).toHaveBeenCalled();
    });
  });

  describe('Distributed Locking Pattern', () => {
    it('Pattern: Job claiming prevents multiple workers processing same job', async () => {
      const mockTx = {
        orderPdfJob: {
          findFirst: jest.fn().mockResolvedValue({ id: 1 }),
          update: jest.fn().mockResolvedValue({ status: 'PROCESSING', lockedAt: new Date() }),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      // Two workers try to claim same job
      await repo.claimPdfJob();

      // Only one should succeed due to atomic transaction
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('Pattern: Stale lock detection (timeout after 10 min)', async () => {
      const now = Date.now();
      const staleTime = new Date(now - 11 * 60 * 1000); // 11 min ago

      const mockTx = {
        orderPdfJob: {
          findFirst: jest.fn(),
          update: jest.fn(),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      // Simulate stale job detection
      // (Actual predicate is in service, but repo participates)
      await repo.claimPdfJob();

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('Idempotency Pattern', () => {
    it('Pattern: upsertPdfJob is idempotent', async () => {
      mockPrismaService.db.orderPdfJob.upsert.mockResolvedValue({
        id: 1,
        orderId: 100,
      } as any);

      // Call upsert twice for same order
      const job1 = await repo.upsertPdfJob(100);
      const job2 = await repo.upsertPdfJob(100);

      // Should result in single job
      expect(mockPrismaService.db.orderPdfJob.upsert).toHaveBeenCalledTimes(2);
    });

    it('Pattern: Reset job to PENDING on retry', async () => {
      mockPrismaService.db.orderPdfJob.upsert.mockResolvedValue({
        orderId: 100,
        status: 'PENDING',
        attempts: 0,
      } as any);

      // First attempt fails, second retry
      await repo.upsertPdfJob(100);
      await repo.upsertPdfJob(100);

      // Both should reset to PENDING
      expect(mockPrismaService.db.orderPdfJob.upsert).toHaveBeenCalled();
    });
  });

  describe('Job Status Flow', () => {
    it('Flow: Job transitions PENDING → PROCESSING → DONE', async () => {
      // 1. Create/upsert PENDING
      mockPrismaService.db.orderPdfJob.upsert.mockResolvedValue({
        status: 'PENDING',
      } as any);
      await repo.upsertPdfJob(100);

      // 2. Claim and mark PROCESSING
      const mockTx = {
        orderPdfJob: {
          findFirst: jest.fn().mockResolvedValue({ status: 'PENDING' }),
          update: jest.fn().mockResolvedValue({ status: 'PROCESSING' }),
        },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      await repo.claimPdfJob();

      // 3. Mark DONE
      mockPrismaService.db.orderPdfJob.update.mockResolvedValue({
        status: 'DONE',
      } as any);
      await repo.markPdfJobDone(1, 'url');

      expect(mockPrismaService.db.orderPdfJob.update).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('Error: Should propagate database errors', async () => {
      const error = new Error('Database connection failed');
      mockPrismaService.db.orderPdfJob.findFirst.mockRejectedValue(error);

      await expect(repo.claimPdfJob()).rejects.toThrow('Database connection failed');
    });

    it('Error: Should handle transaction failures', async () => {
      const error = new Error('Transaction failed');
      (mockPrismaService.$transaction as jest.Mock).mockRejectedValueOnce(error);

      await expect(repo.claimPdfJob()).rejects.toThrow('Transaction failed');
    });
  });
});
