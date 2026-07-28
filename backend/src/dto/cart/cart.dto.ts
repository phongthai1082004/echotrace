export interface CartDTO {
  id: number;
  userId: number;
  items: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCartDTO {
  userId: number;
  items?: string;
}

export interface UpdateCartDTO {
  items: string;
}

export class CartMapper {
  static toDTO(cart: any): CartDTO {
    return {
      id: cart.id,
      userId: cart.userId,
      items: cart.items,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }
  
  static toDTOList(carts: any[]): CartDTO[] {
    return carts.map((c) => this.toDTO(c));
  }
}
