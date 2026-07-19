export interface BookDTO {
  id: number;
  title: string;
  pages: number;
  style: string;
  cover: string;
  status: string;
  coverUrl: string | null;
  createdAt: string;
}

export interface CreateBookDTO {
  title?: string;
  content: string;
}

export interface UpdatePagesDTO {
  content?: string;
  title?: string;
}

export class BookMapper {
  static toDTO(book: any): BookDTO {
    return {
      id: book.id,
      title: book.title,
      pages: book.pages,
      style: book.style,
      cover: book.cover,
      status: book.status,
      coverUrl: book.coverUrl,
      createdAt: book.createdAt,
    };
  }

  static toDTOList(books: any[]): BookDTO[] {
    return books.map((b) => this.toDTO(b));
  }
}
