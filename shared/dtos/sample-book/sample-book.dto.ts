import { IsString, IsOptional, IsIn, IsInt, IsBoolean, Min } from 'class-validator';

const SAMPLE_BOOK_TYPES = ['TEMPLATE', 'ALBUM'] as const;
const SAMPLE_BOOK_STATUSES = ['draft', 'published', 'archive'] as const;

export interface SampleBookDTO {
  id: number;
  name: string | null;
  description: string | null;
  type: "ALBUM" | "TEMPLATE";
  category: string | null;
  quantity: number | null;
  style: string;
  font: string;
  cover: string;
  pageCount: number;
  coverUrl: string | null;
  paperHeight: number | null;
  paperWidth: number | null;
  isActive: boolean;
  status: string;
  content: any | null;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export class CreateSampleBookDTO {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsIn(SAMPLE_BOOK_TYPES, { message: 'Loại sample book không hợp lệ' })
  @IsOptional()
  type?: (typeof SAMPLE_BOOK_TYPES)[number];

  @IsString()
  @IsOptional()
  category?: string | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  quantity?: number | null;

  @IsString()
  @IsOptional()
  style?: string;

  @IsString()
  @IsOptional()
  font?: string;

  @IsString()
  @IsOptional()
  cover?: string;

  @IsString()
  @IsOptional()
  coverUrl?: string | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  paperHeight?: number | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  paperWidth?: number | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsIn(SAMPLE_BOOK_STATUSES, { message: 'Trạng thái sample book không hợp lệ' })
  @IsOptional()
  status?: (typeof SAMPLE_BOOK_STATUSES)[number];

  @IsOptional()
  content?: any;
}

export class UpdateSampleBookDTO {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsIn(SAMPLE_BOOK_TYPES, { message: 'Loại sample book không hợp lệ' })
  @IsOptional()
  type?: (typeof SAMPLE_BOOK_TYPES)[number];

  @IsString()
  @IsOptional()
  category?: string | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  quantity?: number | null;

  @IsIn(SAMPLE_BOOK_STATUSES, { message: 'Trạng thái sample book không hợp lệ' })
  @IsOptional()
  status?: (typeof SAMPLE_BOOK_STATUSES)[number];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  content?: any;
}

export class UpdateSampleBookStatusDTO {
  @IsIn(SAMPLE_BOOK_STATUSES, { message: 'Trạng thái sample book không hợp lệ' })
  status!: (typeof SAMPLE_BOOK_STATUSES)[number];
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
      type: book.type ?? "TEMPLATE",
      category: book.category ?? null,
      quantity: book.quantity ?? null,
      style: book.style,
      font: book.font,
      cover: book.cover,
      pageCount,
      coverUrl: book.coverUrl ?? null,
      paperHeight: book.paperHeight ?? null,
      paperWidth: book.paperWidth ?? null,
      isActive: book.isActive ?? true,
      status: book.status ?? "draft",
      content: book.content ?? null,
      thumbnailUrl: thumb,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    };
  }

  static toDTOList(books: any[]): SampleBookDTO[] {
    return books.map((b) => {
      const dto = this.toDTO(b);
      dto.content = null;
      return dto;
    });
  }
}
