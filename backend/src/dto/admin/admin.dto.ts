export interface UpdateUserStatusDTO {
  status: "active" | "banned";
}

export interface UpdateUserStatusResponseDTO {
  id: number;
  name: string;
  email: string;
  status: string;
}

export interface CreateStickerDTO {
  url: string;
  publicId?: string;
  name?: string;
  category?: string;
  type?: string;
}

export interface StickerDTO {
  id: number;
  url: string;
  publicId: string;
  name: string;
  type: string;
  category: string | null;
}

export class AdminMapper {
  static toUserStatusResponse(user: any): UpdateUserStatusResponseDTO {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
    };
  }

  static toStickerDTO(sticker: any): StickerDTO {
    return {
      id: sticker.id,
      url: sticker.url,
      publicId: sticker.publicId,
      name: sticker.name,
      type: sticker.type,
      category: sticker.category,
    };
  }

  static toStickerDTOList(stickers: any[]): StickerDTO[] {
    return stickers.map((s) => this.toStickerDTO(s));
  }
}
