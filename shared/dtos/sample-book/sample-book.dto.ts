export interface SampleBookDTO {
  id: number;
  name: string | null;
  description: string | null;
  type: string;
  category: string | null;
  style: string;
  font: string;
  cover: string;
  pageCount: number;
  coverUrl: string | null;
  paperHeight: number | null;
  paperWidth: number | null;
  isActive: boolean;
  content: any | null;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSampleBookDTO {
  name?: string;
  description?: string | null;
  type?: string;
  category?: string | null;
  style?: string;
  font?: string;
  cover?: string;
  coverUrl?: string | null;
  paperHeight?: number | null;
  paperWidth?: number | null;
  isActive?: boolean;
  content?: any;
}

export interface UpdateSampleBookDTO {
  name?: string;
  description?: string | null;
  type?: string;
  category?: string | null;
  style?: string;
  font?: string;
  cover?: string;
  coverUrl?: string | null;
  paperHeight?: number | null;
  paperWidth?: number | null;
  isActive?: boolean;
  content?: any;
}

export class SampleBookMapper {
  static toDTO(book: any): SampleBookDTO {
    let thumb: string | null = null;
    let pageCount = 0;
    try {
      thumb = book.content?.pages?.[0]?.thumbnailUrl ?? null;
      pageCount = Array.isArray(book.content?.pages) ? book.content.pages.length : (book.pageCount ?? 0);
    } catch {}
    return {
      id: book.id,
      name: book.name ?? null,
      description: book.description ?? null,
      type: book.type,
      category: book.category ?? null,
      style: book.style,
      font: book.font,
      cover: book.cover,
      pageCount,
      coverUrl: book.coverUrl ?? null,
      paperHeight: book.paperHeight ?? null,
      paperWidth: book.paperWidth ?? null,
      isActive: book.isActive ?? true,
      content: book.content ?? null,
      thumbnailUrl: thumb,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    };
  }

  static toDTOList(books: any[]): SampleBookDTO[] {
    return books.map((b) => this.toDTO(b));
  }
}