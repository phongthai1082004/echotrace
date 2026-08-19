export interface BookDTO {
  id: number;
  title: string;
  pages: number;
  style: string;
  cover: string;
  coverUrl: string | null;
  paperHeight: number | null;
  paperWidth: number | null;
  thumbnailUrl: string | null;
  content: any | null;
  createdAt: string;
}

export interface CreateBookDTO {
  title?: string;
  content: any;
  paperHeight?: number | null;
  paperWidth?: number | null;
}

export interface UpdatePagesDTO {
  content?: any;
  title?: string;
  paperHeight?: number | null;
  paperWidth?: number | null;
}

export class BookMapper {
  static toDTO(book: any): BookDTO {
    let thumb: string | null = null;
    let pages = 0;
    try {
      thumb = book.content?.pages?.[0]?.thumbnailUrl ?? null;
      pages = Array.isArray(book.content?.pages) ? book.content.pages.length : (book.pages ?? 0);
    } catch {}
    return {
      id: book.id,
      title: book.title,
      pages,
      style: book.style,
      cover: book.cover,
      coverUrl: book.coverUrl,
      paperHeight: book.paperHeight ?? null,
      paperWidth: book.paperWidth ?? null,
      thumbnailUrl: thumb,
      content: book.content ?? null,
      createdAt: book.createdAt,
    };
  }

  static toDTOList(books: any[]): BookDTO[] {
    return books.map((b) => {
      const dto = this.toDTO(b);
      // ponytail: list only needs the first page (thumbnail) — full content stays on detail/editor.
      if (dto.content?.pages?.length) dto.content = { ...dto.content, pages: dto.content.pages.slice(0, 1) };
      return dto;
    });
  }
}
