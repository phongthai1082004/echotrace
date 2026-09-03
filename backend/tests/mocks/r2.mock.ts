/**
 * Cloudflare R2 Mock Implementation
 * Simulates S3-compatible R2 file storage for unit tests
 */

export interface UploadedFile {
  key: string;
  buffer: Buffer | string;
  contentType?: string;
  uploadedAt: Date;
  size: number;
}

export class R2Mock {
  private storage: Map<string, UploadedFile> = new Map();
  private shouldFail = false;
  private baseUrl = 'https://test-r2.example.com';

  async uploadBuffer(key: string, buffer: Buffer, contentType?: string): Promise<string> {
    if (this.shouldFail) {
      throw new Error('R2 upload failed');
    }

    const file: UploadedFile = {
      key,
      buffer,
      contentType,
      uploadedAt: new Date(),
      size: buffer.length,
    };

    this.storage.set(key, file);
    return this.generateUrl(key);
  }

  async uploadFile(key: string, filePath: string, contentType?: string): Promise<string> {
    if (this.shouldFail) {
      throw new Error('R2 upload failed');
    }

    // Simulate reading file
    const buffer = Buffer.from(`File content from ${filePath}`);

    const file: UploadedFile = {
      key,
      buffer,
      contentType,
      uploadedAt: new Date(),
      size: buffer.length,
    };

    this.storage.set(key, file);
    return this.generateUrl(key);
  }

  async deleteFile(key: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error('R2 delete failed');
    }

    this.storage.delete(key);
  }

  async getFile(key: string): Promise<UploadedFile | null> {
    if (this.shouldFail) {
      throw new Error('R2 get failed');
    }

    return this.storage.get(key) || null;
  }

  async listFiles(prefix?: string): Promise<UploadedFile[]> {
    if (this.shouldFail) {
      throw new Error('R2 list failed');
    }

    const files = Array.from(this.storage.values());

    if (prefix) {
      return files.filter((f) => f.key.startsWith(prefix));
    }

    return files;
  }

  generateUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }

  // Test utilities
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  setFailure(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  clear(): void {
    this.storage.clear();
  }

  getStorageSize(): number {
    let totalSize = 0;
    for (const file of this.storage.values()) {
      totalSize += file.size;
    }
    return totalSize;
  }

  getFileCount(): number {
    return this.storage.size;
  }

  getAllFiles(): UploadedFile[] {
    return Array.from(this.storage.values());
  }

  fileExists(key: string): boolean {
    return this.storage.has(key);
  }
}

export const createR2Mock = (): R2Mock => {
  return new R2Mock();
};
