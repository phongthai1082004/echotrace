import { prisma as p } from '../lib/prisma.js';

const code = process.argv[2] ?? '1788721344778575';
const order = await p.order.findUnique({ where: { orderCode: code }, include: { transactions: true } });
const cashflows = await p.cashflow.findMany({ where: { orderId: (order as any)?.id }, select: { type: true, amount: true, note: true } });
console.log(order && {
	id: order.id,
	status: order.status,
	paidAmount: order.paidAmount,
	totalAmount: order.totalAmount,
	cashflows: (order as any).cashflows?.map((c: any) => ({ type: c.type, amount: c.amount })),
	txns: order.transactions.map((t) => ({ id: t.id, code: t.gatewayTransactionCode, status: t.status, amount: t.amount })),
});
const recent = await p.transaction.findMany({ orderBy: { id: 'desc' }, take: 5, select: { id: true, gatewayTransactionCode: true, status: true, orderId: true, gateway: true } });
console.log(recent);
await p.$disconnect();
