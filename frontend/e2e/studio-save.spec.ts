import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

// Delta autosave end-to-end (DB thật, không mock):
// - T1: sửa → Save tay (flush) → reload → còn chữ (flush đã ghi DB).
// - T2: sửa → đóng tab ngay (beacon, chưa kịp autosave) → mở lại → còn chữ (read-through).
// - T3: sửa → bấm đặt hàng luôn (không save) → đơn tạo từ content đã flush.
// Dùng marker chữ khác nhau mỗi test vì DB seed 1 lần cho cả file.

async function bookHasText(page: any, bookId: number, text: string): Promise<boolean> {
  return page.evaluate(
    async ({ bookId, text }: { bookId: number; text: string }) => {
      try {
        const r = await fetch('/api/proxy?path=' + encodeURIComponent(`/vi/api/books/${bookId}`));
        const j = await r.json();
        const pages = j?.data?.content?.pages ?? [];
        // canvasJson lúc là object (JSONB parse) lúc là string double-encode —
        // chuẩn hóa về chuỗi trần rồi tìm.
        return pages.some((p: any) => {
          const raw = p?.canvasJson ?? p;
          const s = typeof raw === 'string' ? raw : JSON.stringify(raw);
          return s.replace(/\\/g, '').includes(`"text":"${text}"`);
        });
      } catch {
        return false;
      }
    },
    { bookId, text },
  );
}

async function openSeededStudio(page: any): Promise<number> {
  await page.goto('/vi/my-journals');
  const card = page.locator('a[href*="/studio?id="]').first();
  await expect(card).toBeVisible({ timeout: 20000 });
  const href = await card.getAttribute('href');
  const id = Number(new URL(href!, 'http://x').searchParams.get('id'));
  await page.goto(`/vi/studio?id=${id}`);
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('button', { name: /Lưu Journal/ })).toBeVisible({ timeout: 30000 });
  // canvas <canvas> mount trước fabric init — chờ fabric sẵn sàng nhận object.
  await page.waitForTimeout(2500);
  return id;
}

async function addHeading(page: any, marker: string) {
  // Preset nằm trong dropdown hover (pointer-events:none lúc ẩn) nên click
  // trực tiếp qua JS — vẫn kích hoạt onClick React như bấm tay.
  // Text được chọn ngay sau khi thêm → panel thuộc tính hiện mục cỡ chữ.
  for (let i = 0; i < 3; i++) {
    await page.getByText(marker).first().evaluate((el: HTMLElement) => el.click());
    try {
      await expect(page.getByText('Kích thước').first()).toBeVisible({ timeout: 4000 });
      return;
    } catch {}
  }
  throw new Error(`preset ${marker} never selected text on canvas`);
}

test('T1: sửa + Save tay → reload vẫn còn (flush đã ghi DB)', async ({ page }) => {
  await loginAs(page);
  await expect(page).toHaveURL(/\/explore/, { timeout: 20000 });
  const id = await openSeededStudio(page);
  // Toast success không chứng minh text đã lên canvas (save no-op vẫn báo ok),
  // nên thử lại add+save tới khi toast hiện sau 1 lần add chắc chắn muộn.
  for (let i = 0; i < 3; i++) {
    await addHeading(page, 'Tiêu đề');
    await page.getByRole('button', { name: /Lưu Journal/ }).click();
    try {
      await expect(page.getByText('Đã lưu thành công')).toBeVisible({ timeout: 15000 });
      break;
    } catch {
      if (i === 2) throw new Error('save toast never appeared');
    }
  }
  await page.reload();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30000 });
  await expect.poll(() => bookHasText(page, id, 'Tiêu đề'), { timeout: 20000 }).toBe(true);
});

test('T2: sửa + đóng tab ngay (beacon) → mở lại còn chữ', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAs(page);
  await expect(page).toHaveURL(/\/explore/, { timeout: 20000 });
  const id = await openSeededStudio(page);
  await addHeading(page, 'Đầu mục');
  // Đóng trong ~3s: debounce autosave 8s chưa kịp chạy, chỉ beacon cứu.
  await page.waitForTimeout(3000);
  await page.close();
  const page2 = await context.newPage();
  await page2.goto(`/vi/studio?id=${id}`);
  await expect(page2.locator('canvas').first()).toBeVisible({ timeout: 30000 });
  await expect.poll(() => bookHasText(page2, id, 'Đầu mục'), { timeout: 20000 }).toBe(true);
  await context.close();
});

test('T3: sửa + đặt hàng luôn (không save) → giỏ có sách', async ({ page }) => {
  await loginAs(page);
  await expect(page).toHaveURL(/\/explore/, { timeout: 20000 });
  await openSeededStudio(page);
  await addHeading(page, 'Nội dung');
  // Không bấm save: nút order tự saveFull rồi mới tạo cart (flush ở upsertItem).
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng' }).click();
  await expect(page.getByText('Đã thêm vào giỏ hàng!')).toBeVisible({ timeout: 20000 });
  const cartHas = await page.evaluate(async () => {
    try {
      const r = await fetch('/api/proxy?path=' + encodeURIComponent('/vi/api/cart'));
      const j = await r.json();
      const items = j?.data?.parsedItems ?? j?.data?.items ?? [];
      return items.length > 0;
    } catch {
      return false;
    }
  });
  expect(cartHas).toBe(true);
});
