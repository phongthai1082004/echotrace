import { prisma as p } from '../lib/prisma.js';

const r = await p.order.updateMany({ where: { status: 'refunding' }, data: { status: 'pending_refund' } });
console.log('migrated rows:', r.count);
await p.$disconnect();
