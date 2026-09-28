export interface StudioAPI {
  save(
    token: string,
    bookId: number | null,
    payload: Record<string, unknown>,
  ): Promise<{ ok: boolean; error?: string; id?: number }>;
  load(bookId: string, token?: string): Promise<{ data: Record<string, unknown> } | Record<string, unknown>>;
  // Path + field tên cho sendBeacon lúc đóng tab (beacon chỉ POST, xem alias POST ở backend).
  beaconPath?: (bookId: number) => string;
  beaconTitleField?: "title" | "name";
}
