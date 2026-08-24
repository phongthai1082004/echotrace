// Snapshot of one book in the cart — stored inside Cart.items JSON, like Order.orderItems.
export interface CartItem {
  bookId: number;
  title: string;
  content: string | null;
  style: string;
  font: string; // ???
  cover: string;
  paper: string;
  paperHeight: number;
  paperWidth: number;
  pages: number;
  paperSize?: string | null;
  price?: number | null;
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

// ponytail: cart list only needs the first page (thumbnail) — never ship all pages' data.
function firstPageContent(content: string | null): string | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (!parsed?.pages) return null;
    return JSON.stringify({ ...parsed, pages: [parsed.pages[0]] });
  } catch {
    return null;
  }
}

export function parseCartItems(raw: any): CartItem[] {
  if (!raw) return [];
  let arr: any;
  try { arr = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return []; }
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => {
    let thumb: string | null = item.coverUrl ?? null;
    const content = firstPageContent(item.content);
    if (content) {
      try { thumb = JSON.parse(content).pages?.[0]?.thumbnailUrl ?? thumb; } catch {}
    }
    // ponytail: response không ship content (chỉ thumbnail phẳng); DB giữ nguyên để tương thích cart cũ.
    return { ...item, content: null, thumbnailUrl: thumb };
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