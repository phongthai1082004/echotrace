import 'reflect-metadata';
import assert from 'node:assert';
import * as crypto from 'crypto';
import { PayOS } from '@payos/node';
import { PayOSGateway } from './payos.service.js';

const KEY = 'test-checksum-key';
const gateway = new PayOSGateway(new PayOS({ clientId: 'x', apiKey: 'y', checksumKey: KEY }));

const data = {
	accountNumber: '12345678',
	amount: 50000,
	code: '00',
	currency: 'VND',
	desc: 'success',
	description: 'DH 1',
	orderCode: 123,
	paymentLinkId: 'plink_1',
	reference: 'FT123',
	transactionDateTime: '2026-08-26 10:00:00',
};

function sign(d: any): string {
	const s = Object.keys(d)
		.sort()
		.map((k) => `${k}=${d[k]}`)
		.join('&');
	return crypto.createHmac('sha256', KEY).update(s).digest('hex');
}

const body = { code: '00', desc: 'success', success: true, data, signature: sign(data) };
const ok = await gateway.handleWebhook(structuredClone(body));
assert.strictEqual(ok.isValidSignature, true);
assert.strictEqual(ok.status, 'success');
assert.strictEqual(ok.gatewayTransactionCode, 'plink_1');
assert.strictEqual(ok.orderCode, '123');

// Chữ ký sai phải bị từ chối
await assert.rejects(
	gateway.handleWebhook({ ...body, signature: '0'.repeat(64) }),
);

// code 01 → cancelled
const cancelled = await gateway.handleWebhook({
	...body,
	code: '01',
	desc: 'cancelled',
	success: false,
	signature: sign(data),
});
assert.strictEqual(cancelled.status, 'cancelled');

console.log('payos handleWebhook: OK');
