// Snapshot of one book in the cart — stored inside Cart.items JSON, like Order.orderItems.
export interface CartItem {
  bookId: number;
  title: string;
  content: string | null;
  style: string;
  font: string;
  cover: string;
  paper: string;
  paperHeight: number;
  paperWidth: number;
  pages: number;
  // Display info
  coverUrl: string | null;
  pdfUrl?: string | null;
  quantity: number;
  thumbnailUrl?: string | null;
}

export interface CartDTO {
  id: number;
  userId: number;
  items: CartItem[] | null;
  parsedItems: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCartDTO {
  userId: number;
  items?: CartItem[];
}

export interface UpdateCartDTO {
  items: CartItem[];
}

export function parseCartItems(raw: any): CartItem[] {
  if (!raw) return [];
  let arr: any;
  try { arr = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return []; }
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => {
    let thumb: string | null = item.coverUrl ?? null;
    if (item.content) {
      try { thumb = JSON.parse(item.content).pages?.[0]?.thumbnailUrl ?? thumb; } catch {}
    }
    return { ...item, thumbnailUrl: thumb };
  });
}

export function serializeCartItems(items: CartItem[]): CartItem[] {
  return items;
}

export class CartMapper {
  static toDTO(cart: any): CartDTO {
    const parsedItems = parseCartItems(cart.items);
    return {
      id: cart.id,
      userId: cart.userId,
      items: parsedItems.length ? parsedItems : null,
      parsedItems,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  static toDTOList(carts: any[]): CartDTO[] {
    return carts.map((c) => this.toDTO(c));
  }
}