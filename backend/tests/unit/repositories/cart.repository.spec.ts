import { CartRepository } from '@features/cart/cart.repository';
import { PrismaService } from '@lib/prisma';
import { Prisma } from '@prisma/client';

describe('CartRepository - Unit Tests', () => {
  let repo: CartRepository;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    mockPrismaService = {
      db: {
        cart: {
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        cartItem: {
          update: jest.fn(),
          delete: jest.fn(),
          findFirst: jest.fn(),
        },
        book: {
          create: jest.fn(),
        },
      },
    } as unknown as jest.Mocked<PrismaService>;

    repo = new CartRepository(mockPrismaService);
  });

  describe('getCartWithItems', () => {
    it('EP: Should return cart with items for valid userId', async () => {
      const mockCart = {
        id: 1,
        userId: 100,
        items: [{ id: 1, bookId: 1, book: { id: 1, title: 'Test Book' } }],
      };

      mockPrismaService.db.cart.findUnique.mockResolvedValue(mockCart as any);

      const result = await repo.getCartWithItems(100);

      expect(result).toEqual(mockCart);
      expect(mockPrismaService.db.cart.findUnique).toHaveBeenCalledWith({
        where: { userId: 100 },
        include: expect.any(Object),
      });
    });

    it('EP: Should return null for non-existent cart', async () => {
      mockPrismaService.db.cart.findUnique.mockResolvedValue(null);

      const result = await repo.getCartWithItems(999);

      expect(result).toBeNull();
    });

    it('EP: Should accept transaction parameter', async () => {
      const mockTx = jest.fn();
      mockCart = { id: 1, userId: 100, items: [] };

      mockPrismaService.db.cart.findUnique.mockResolvedValue(mockCart as any);

      await repo.getCartWithItems(100, mockTx as any);

      expect(mockPrismaService.db.cart.findUnique).toHaveBeenCalled();
    });

    it('BVA: Should handle user IDs at boundary (1)', async () => {
      mockPrismaService.db.cart.findUnique.mockResolvedValue(null);

      await repo.getCartWithItems(1);

      expect(mockPrismaService.db.cart.findUnique).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: expect.any(Object),
      });
    });

    it('BVA: Should handle large user IDs', async () => {
      mockPrismaService.db.cart.findUnique.mockResolvedValue(null);

      await repo.getCartWithItems(2147483647);

      expect(mockPrismaService.db.cart.findUnique).toHaveBeenCalledWith({
        where: { userId: 2147483647 },
        include: expect.any(Object),
      });
    });

    it('EP: Should include items ordered by id', async () => {
      const mockCart = {
        id: 1,
        userId: 100,
        items: [
          { id: 3, bookId: 1 },
          { id: 1, bookId: 2 },
          { id: 2, bookId: 3 },
        ],
      };

      mockPrismaService.db.cart.findUnique.mockResolvedValue(mockCart as any);

      await repo.getCartWithItems(100);

      expect(mockPrismaService.db.cart.findUnique).toHaveBeenCalledWith({
        where: { userId: 100 },
        include: expect.objectContaining({
          items: expect.objectContaining({ orderBy: { id: 'asc' } }),
        }),
      });
    });
  });

  describe('createCart', () => {
    it('EP: Should create cart for user', async () => {
      mockPrismaService.db.cart.create.mockResolvedValue({ id: 1, userId: 100 } as any);

      const result = await repo.createCart(100);

      expect(result).toEqual({ id: 1, userId: 100 });
      expect(mockPrismaService.db.cart.create).toHaveBeenCalledWith({
        data: { userId: 100 },
      });
    });

    it('EP: Should accept transaction parameter', async () => {
      const mockTx = jest.fn();
      mockPrismaService.db.cart.create.mockResolvedValue({ id: 1, userId: 100 } as any);

      await repo.createCart(100, mockTx as any);

      expect(mockPrismaService.db.cart.create).toHaveBeenCalled();
    });

    it('Error: Should propagate unique constraint error', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint', { code: 'P2002' });
      mockPrismaService.db.cart.create.mockRejectedValue(error);

      await expect(repo.createCart(100)).rejects.toThrow();
    });

    it('BVA: Should create cart for various user IDs', async () => {
      mockPrismaService.db.cart.create.mockResolvedValue({ id: 1, userId: 1 } as any);

      await repo.createCart(1);

      expect(mockPrismaService.db.cart.create).toHaveBeenCalledWith({ data: { userId: 1 } });
    });
  });

  describe('updateCartItem', () => {
    it('EP: Should update cart item with patch data', async () => {
      const patch = { quantity: 5, cover: 'HARDCOVER' };
      mockPrismaService.db.cartItem.update.mockResolvedValue({
        id: 1,
        cartId: 1,
        bookId: 1,
        quantity: 5,
        cover: 'HARDCOVER',
      } as any);

      const result = await repo.updateCartItem(1, 1, patch);

      expect(result).toHaveProperty('quantity', 5);
      expect(mockPrismaService.db.cartItem.update).toHaveBeenCalledWith({
        where: { cartId_bookId: { cartId: 1, bookId: 1 } },
        data: patch,
        include: { book: true },
      });
    });

    it('EP: Should accept partial patch', async () => {
      mockPrismaService.db.cartItem.update.mockResolvedValue({} as any);

      await repo.updateCartItem(1, 1, { quantity: 3 });

      expect(mockPrismaService.db.cartItem.update).toHaveBeenCalledWith({
        where: { cartId_bookId: { cartId: 1, bookId: 1 } },
        data: { quantity: 3 },
        include: { book: true },
      });
    });

    it('BVA: Quantity boundary - minimum (1)', async () => {
      mockPrismaService.db.cartItem.update.mockResolvedValue({ quantity: 1 } as any);

      await repo.updateCartItem(1, 1, { quantity: 1 });

      expect(mockPrismaService.db.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantity: 1 } })
      );
    });

    it('BVA: Quantity boundary - maximum (1000)', async () => {
      mockPrismaService.db.cartItem.update.mockResolvedValue({ quantity: 1000 } as any);

      await repo.updateCartItem(1, 1, { quantity: 1000 });

      expect(mockPrismaService.db.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantity: 1000 } })
      );
    });

    it('EP: Should include book relation', async () => {
      mockPrismaService.db.cartItem.update.mockResolvedValue({
        book: { id: 1, title: 'Test' },
      } as any);

      await repo.updateCartItem(1, 1, { quantity: 5 });

      expect(mockPrismaService.db.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ include: { book: true } })
      );
    });

    it('Error: Should handle record not found', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025' });
      mockPrismaService.db.cartItem.update.mockRejectedValue(error);

      await expect(repo.updateCartItem(999, 999, { quantity: 1 })).rejects.toThrow();
    });
  });

  describe('deleteCartItems', () => {
    it('EP: Should delete cart item', async () => {
      mockPrismaService.db.cartItem.delete.mockResolvedValue({ id: 1 } as any);

      await repo.deleteCartItems(1, 1);

      expect(mockPrismaService.db.cartItem.delete).toHaveBeenCalledWith({
        where: { cartId_bookId: { cartId: 1, bookId: 1 } },
      });
    });

    it('EP: Should accept transaction parameter', async () => {
      const mockTx = jest.fn();
      mockPrismaService.db.cartItem.delete.mockResolvedValue({ id: 1 } as any);

      await repo.deleteCartItems(1, 1, mockTx as any);

      expect(mockPrismaService.db.cartItem.delete).toHaveBeenCalled();
    });

    it('Error: Should handle not found', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025' });
      mockPrismaService.db.cartItem.delete.mockRejectedValue(error);

      await expect(repo.deleteCartItems(999, 999)).rejects.toThrow();
    });

    it('BVA: Should delete with boundary IDs', async () => {
      mockPrismaService.db.cartItem.delete.mockResolvedValue({ id: 1 } as any);

      await repo.deleteCartItems(1, 1);

      expect(mockPrismaService.db.cartItem.delete).toHaveBeenCalledWith({
        where: { cartId_bookId: { cartId: 1, bookId: 1 } },
      });
    });
  });

  describe('createBook', () => {
    it('EP: Should create book', async () => {
      const data = { title: 'Test Book', userId: 100, pages: 100 };
      mockPrismaService.db.book.create.mockResolvedValue({ id: 1, ...data } as any);

      const result = await repo.createBook(data);

      expect(result).toHaveProperty('title', 'Test Book');
      expect(mockPrismaService.db.book.create).toHaveBeenCalledWith({ data });
    });

    it('EP: Should accept transaction parameter', async () => {
      const mockTx = jest.fn();
      mockPrismaService.db.book.create.mockResolvedValue({ id: 1 } as any);

      await repo.createBook({ title: 'Book', userId: 1, pages: 50 }, mockTx as any);

      expect(mockPrismaService.db.book.create).toHaveBeenCalled();
    });

    it('EP: Should handle various book data', async () => {
      const data = {
        title: 'Complex Title',
        userId: 100,
        pages: 500,
        description: 'Test description',
      };
      mockPrismaService.db.book.create.mockResolvedValue({ id: 1, ...data } as any);

      await repo.createBook(data);

      expect(mockPrismaService.db.book.create).toHaveBeenCalledWith({ data });
    });
  });
});

let mockCart: any;
