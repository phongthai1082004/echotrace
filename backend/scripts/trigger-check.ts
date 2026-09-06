import { prisma as p } from '../lib/prisma.js';

// self-check: expense.create fires trg_expense_aiud -> fn_period_upsert; must not throw
const e = await p.expense.create({
	data: { amount: 123.45, category: 'SUPPLIER', date: new Date(), note: 'trigger-check', supplierName: 'test' },
});
await p.cashflow.deleteMany({ where: { expenseId: e.id } });
await p.expense.delete({ where: { id: e.id } });
const before = await p.$queryRaw`SELECT "totalExpense" FROM "FinancePeriod" WHERE period = to_char(now(),'YYYY-MM')`;
console.log('trigger ok; finance period row:', before);
await p.$disconnect();
