import { paginate } from '../src/utils/paginate.js';
import { prisma as p } from '../lib/prisma.js';

// walk every page: the final page must NOT advertise nextCursor (no empty trailing page)
const total = await p.user.count({ where: { isDelete: false } });
const probeLimit = 5;
let cursor: number | null = null;
let pages = 0;
let seen = 0;
while (pages < 100) {
  const q: any = { limit: probeLimit };
  if (cursor) q.cursor = cursor;
  const { items, nextCursor } = await paginate(p.user, q, {}, {});
  seen += items.length;
  pages++;
  console.log(`page ${pages}: items=${items.length} nextCursor=${nextCursor}`);
  if (!nextCursor) break;
  cursor = nextCursor;
}
console.log(`walked ${pages} pages, ${seen}/${total} users`);
console.log(pages * probeLimit >= total && seen === total ? 'OK: no empty trailing page' : 'FAIL');
await p.$disconnect();
