import { injectable } from "tsyringe";
import { prisma } from "../../lib/prisma.js";
import { CartDTO, CreateCartDTO, UpdateCartDTO, CartMapper } from "../dto/cart/cart.dto.js";

export abstract class ICartService {
  abstract getCart(userId: number): Promise<CartDTO | null>;
  abstract createCart(dto: CreateCartDTO): Promise<CartDTO>;
  abstract updateCart(userId: number, dto: UpdateCartDTO): Promise<CartDTO | null>;
  abstract deleteCart(userId: number): Promise<void>;
}

@injectable()
export class CartService extends ICartService {
  async getCart(userId: number) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    return cart ? CartMapper.toDTO(cart) : null;
  }

  async createCart(dto: CreateCartDTO) {
    const cart = await prisma.cart.create({ data: dto });
    return CartMapper.toDTO(cart);
  }

  async updateCart(userId: number, dto: UpdateCartDTO) {
    const cart = await prisma.cart.upsert({
      where: { userId },
      update: { items: dto.items },
      create: { userId, items: dto.items },
    });
    return CartMapper.toDTO(cart);
  }

  async deleteCart(userId: number) {
    await prisma.cart.deleteMany({ where: { userId } });
  }
}
