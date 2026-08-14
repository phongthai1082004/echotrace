import { injectable } from "tsyringe";
import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { CartDTO, UpdateCartDTO, CartMapper } from "@echotrace/shared";

export abstract class ICartService {
  abstract getCart(userId: number): Promise<CartDTO>;
  abstract updateCart(userId: number, dto: UpdateCartDTO): Promise<CartDTO>;
}

@injectable()
export class CartService extends ICartService {
  async getCart(userId: number) {
    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }
    return CartMapper.toDTO(cart);
  }

  async updateCart(userId: number, dto: UpdateCartDTO) {
    const items = dto.items as unknown as Prisma.InputJsonValue;
    const cart = await prisma.cart.upsert({
      where: { userId },
      update: { items },
      create: { userId, items },
    });
    return CartMapper.toDTO(cart);
  }
}
