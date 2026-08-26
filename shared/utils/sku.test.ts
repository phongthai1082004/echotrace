import assert from 'node:assert';
import { makeSku } from './sku.js';

// Đúng 14 option thật trong DB PrintOption.
assert.strictEqual(makeSku('softcover', 'couche200', 'A5'), 'SOFT_COU200_A5');
assert.strictEqual(makeSku('hardcover', 'offset100', '20x20'), 'HARD_OFF100_20X20');
assert.strictEqual(makeSku('leather', 'cotton300', 'A4'), 'LEATHER_COT300_A4');
assert.strictEqual(makeSku('saddleStitch', 'lustre250', '15x15'), 'SADST_LUS250_15X15');
assert.strictEqual(makeSku('softcover', 'matte230', '30x30'), 'SOFT_MAT230_30X30');

// Tên EN ưu tiên khi khác code (case thật trong DB).
assert.strictEqual(
	makeSku('hardcover', 'couche200', 'A5', { cover: 'Hardcover' }),
	'HARD_COU200_A5',
);
assert.strictEqual(
	makeSku('saddleStitch', 'couche200', 'A4', { cover: 'Saddle stitch' }),
	'SADST_COU200_A4',
);

// Size có đơn vị/ngoặc/unicode ×.
assert.strictEqual(makeSku('softcover', 'couche200', 'A5', { paperSize: 'A5 (14.8×21 cm)' }), 'SOFT_COU200_A5');
assert.strictEqual(makeSku('softcover', 'couche200', '30x30', { paperSize: '30×30 cm' }), 'SOFT_COU200_30X30');

// Rác vào → không ném, sanitize.
assert.strictEqual(makeSki_safe('', '', ''), '');
assert.strictEqual(makeSki_safe('bìa mềm', 'giấy', 'kích thước!'), 'BIAMEM_GIAY_KICHTHUOC');

function makeSki_safe(c: string, p: string, s: string): string {
	return makeSku(c, p, s, { cover: c || undefined, paper: p || undefined, paperSize: s || undefined });
}

console.log('makeSku: OK');
