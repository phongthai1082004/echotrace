/**
 * V-18: UpdateOrderDTO + AlbumOrderDTO (admin order writes).
 */
import { run } from './helpers.js';
import { UpdateOrderDTO, AlbumOrderDTO, ProcessEventDTO, parseCreateOrderDTO } from '../../../shared/dtos/order/order.dto.js';

describe('V-18: UpdateOrderDTO (all optional, whitelisted)', () => {
	it('empty passes; valid patch passes', async () => {
		expect((await run(UpdateOrderDTO, {})).error).toBeNull();
		const r = await run(UpdateOrderDTO, { status: 'shipping', supplierId: 3, trackingCode: 'TRK1', defectState: 'reported' });
		expect(r.error).toBeNull();
	});

	it('bad status / non-integer supplierId / bad defectState / unknown field fail or stripped', async () => {
		expect((await run(UpdateOrderDTO, { status: 'flying' })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(UpdateOrderDTO, { supplierId: 1.5 })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(UpdateOrderDTO, { defectState: 'nope' })).error?.errorCode).toBe('VALIDATION_FAILED');
		const r = await run(UpdateOrderDTO, { status: 'shipping', evil: 1 });
		expect(r.error).toBeNull();
		expect(r.forwarded).not.toHaveProperty('evil');
	});
});

describe('V-18b: AlbumOrderDTO', () => {
	const good = { customerId: 5, sampleBookId: 3, paymentMethod: 'full-payment' };

	it('minimal valid passes', async () => {
		expect((await run(AlbumOrderDTO, good)).error).toBeNull();
	});

	it('missing ids / bad payment / quantity 0 fail', async () => {
		expect((await run(AlbumOrderDTO, { sampleBookId: 3, paymentMethod: 'full-payment' })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(AlbumOrderDTO, { ...good, paymentMethod: 'bitcoin' })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(AlbumOrderDTO, { ...good, quantity: 0 })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(AlbumOrderDTO, { ...good, utmSource: 'facebook' })).error).toBeNull();
	});
});

describe('V-20: ProcessEventDTO', () => {
	it('each event type passes bare; unknown type fails', async () => {
		for (const type of ['assign', 'ship', 'deliver', 'reconcile_supplier', 'reconcile_cod', 'refund', 'reconcile_refund', 'force_status']) {
			expect((await run(ProcessEventDTO, { type })).error).toBeNull();
		}
		expect((await run(ProcessEventDTO, { type: 'explode' })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(ProcessEventDTO, {})).error?.errorCode).toBe('VALIDATION_FAILED');
	});

	it('assign items validated per element; deliver indices validated', async () => {
		const ok = await run(ProcessEventDTO, {
			type: 'assign',
			items: [{ itemIndex: 0, supplierId: 2, costPrice: 50 }],
		});
		expect(ok.error).toBeNull();
		expect((await run(ProcessEventDTO, { type: 'assign', items: [{ itemIndex: 0, supplierId: 'x', costPrice: 50 }] })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(ProcessEventDTO, { type: 'assign', items: [{ itemIndex: 0, supplierId: 2, costPrice: -1 }] })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(ProcessEventDTO, { type: 'deliver', itemIndices: [0, 2] })).error).toBeNull();
		expect((await run(ProcessEventDTO, { type: 'deliver', itemIndices: [0, 1.5] })).error?.errorCode).toBe('VALIDATION_FAILED');
	});
});

describe('V-22: parseCreateOrderDTO', () => {
	it('parses full body, coerces numbers, defaults coupon null', () => {
		const d = parseCreateOrderDTO(JSON.stringify({
			items: [{ bookId: '1', quantity: '2', cover: 'soft', paper: 'matt', paperSize: 'A4' }],
			name: 'A', phone: '09', address: 'X', city: 'Y', note: 'n',
			paymentMethod: 'full-payment',
		}));
		expect(d).toMatchObject({
			paymentMethod: 'full-payment',
			items: [{ bookId: 1, quantity: 2 }],
			couponCode: null,
		});
	});

	it('missing items → [], invalid JSON throws', () => {
		expect(parseCreateOrderDTO(JSON.stringify({ paymentMethod: 'full-payment' })).items).toEqual([]);
		expect(() => parseCreateOrderDTO('not-json')).toThrow();
	});
});
