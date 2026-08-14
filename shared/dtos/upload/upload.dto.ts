export interface UploadSignatureDTO {
  signature: string;
  timestamp: number;
  folder: string;
  public_id: string | undefined;
  api_key: string | undefined;
  cloud_name: string | undefined;
}

export interface SaveImageDTO {
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  size?: number;
}

export interface ImageDTO {
  id: number;
  userId: number;
  url: string;
  publicId: string;
  width: number | null;
  height: number | null;
  size: number | null;
}

export class ImageMapper {
  static toDTO(image: any): ImageDTO {
    return {
      id: image.id,
      userId: image.userId,
      url: image.url,
      publicId: image.publicId,
      width: image.width,
      height: image.height,
      size: image.size,
    };
  }

  static toDTOList(images: any[]): ImageDTO[] {
    return images.map((i) => this.toDTO(i));
  }
}
