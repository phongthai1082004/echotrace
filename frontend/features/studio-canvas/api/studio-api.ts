export interface StudioAPI {
  save(token: string, bookId: number | null, payload: Record<string, unknown>): Promise<{ ok: boolean; error?: string; id?: number }>;
  load(bookId: string): Promise<{ data: Record<string, unknown> } | Record<string, unknown>>;
}
