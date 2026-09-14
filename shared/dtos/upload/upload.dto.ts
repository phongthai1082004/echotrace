export interface UploadSignatureDTO {
  signature: string;
  timestamp: number;
  folder: string;
  public_id: string | undefined;
  api_key: string | undefined;
  cloud_name: string | undefined;
}

import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class SaveImageDTO {
  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsString()
  @IsOptional()
  publicId?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  width?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  height?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  size?: number;

  @IsString()
  @IsOptional()
  thumbUrl?: string;
}

export interface ImageDTO {
  id: number;
  userId: number;
  url: string;
  publicId: string;
  width: number | null;
  height: number | null;
  size: number | null;
  thumbUrl: string | null;
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
      thumbUrl: image.thumbUrl ?? null,
    };
  }

  static toDTOList(images: any[]): ImageDTO[] {
    return images.map((i) => this.toDTO(i));
  }
}
