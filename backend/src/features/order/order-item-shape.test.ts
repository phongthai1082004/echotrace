import { describe, it, expect } from 'vitest';
import { toOrderItem } from '@echotrace/shared';

// ponytail: U1 — orderItems snapshot must be the slim OrderItem shape, not the
// whole CartItem (style/font/coverUrl/pdfUrl/paperHeight/paperWidth/type leak).
describe('toOrderItem (U1 slim order snapshot)', () => {
  const cart = {
    bookId: 7,
    title: 'My Book',
    thumbnailUrl: 't.jpg',
    pages: 24,
    quantity: 2,
    cover: 'hardcover',
    paper: 'couche200',
    paperSize: 'A5',
    price: 100,
    // cart-only fields that must NOT appear in orderItems:
    style: 'PHOTOBOOK',
    font: 'Inter',
    coverUrl: 'c.jpg',
    pdfUrl: null,
    paperHeight: 210,
    paperWidth: 148,
    type: 'photo',
  } as any;

  const out = toOrderItem(cart);

  it('keeps order-relevant fields', () => {
    expect(out).toMatchObject({
      bookId: 7,
      title: 'My Book',
      thumbnailUrl: 't.jpg',
      pages: 24,
      quantity: 2,
      cover: 'hardcover',
      paper: 'couche200',
      paperSize: 'A5',
      price: 100,
    });
  });

  it('builds sku from cover/paper/size', () => {
    expect(out.sku).toBe('HARD_COU200_A5');
  });

  it('drops cart-only fields', () => {
    for (const k of ['style', 'font', 'coverUrl', 'pdfUrl', 'paperHeight', 'paperWidth', 'type']) {
      expect((out as any)[k]).toBeUndefined();
    }
  });
});
