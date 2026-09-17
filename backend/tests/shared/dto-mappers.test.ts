/**
 * U-30: mappers — 1 case full row + 1 case fallback mỗi Mapper có logic.
 * Mapper thuần copy 1-1 không có nhánh thì chỉ assert pass-through.
 */
import { BookMapper } from '../../../shared/dtos/book/book.dto.js';
import { SampleBookMapper } from '../../../shared/dtos/sample-book/sample-book.dto.js';
import { CouponMapper } from '../../../shared/dtos/coupon/coupon.dto.js';
import { toOrderItem } from '../../../shared/dtos/cart/cart.dto.js';
import { IncomeMapper } from '../../../shared/dtos/income/income.dto.js';
import { ExpenseMapper } from '../../../shared/dtos/expense/expense.dto.js';
import { CashflowMapper } from '../../../shared/dtos/cashflow/cashflow.dto.js';
import { TransactionMapper } from '../../../shared/dtos/transaction/transaction.dto.js';
import { ProfileMapper } from '../../../shared/dtos/user/profile.dto.js';
import { UserMapper } from '../../../shared/dtos/user/user.list.js';
import { AuthMapper } from '../../../shared/dtos/auth/auth.dto.js';
import { AdminMapper } from '../../../shared/dtos/admin/admin.dto.js';
import { ImageMapper } from '../../../shared/dtos/upload/upload.dto.js';
import { PrintOptionMapper, SupplierMapper } from '../../../shared/dtos/supplier/supplier.dto.js';

describe('U-30: book/sample mappers (thumb + count fallback)', () => {
	it('pages/thumb from content; corrupt content → 0/null; list nulls content', () => {
		const d = BookMapper.toDTO({ id: 1, content: { pages: [{ thumbnailUrl: 't' }, {}] } });
		expect(d).toMatchObject({ pages: 2, thumbnailUrl: 't' });
		const bad = BookMapper.toDTO({ id: 1, content: '{oops', pages: 7 });
		expect(bad).toMatchObject({ pages: 7, thumbnailUrl: null });
		const list = BookMapper.toDTOList([{ id: 1, content: { pages: [] } }]);
		expect(list[0].content).toBeNull();
	});

	it('sample defaults TEMPLATE/draft/active-true; list nulls content', () => {
		const d = SampleBookMapper.toDTO({ id: 2, style: 'S', font: 'F', cover: 'C' });
		expect(d).toMatchObject({ type: 'TEMPLATE', status: 'draft', isActive: true, pageCount: 0 });
		const list = SampleBookMapper.toDTOList([{ id: 2 }]);
		expect(list[0].content).toBeNull();
	});
});

describe('U-31: coupon/transaction/order-item mapping', () => {
	it('coupon expiresAt Date → ISO, null → null', () => {
		expect(CouponMapper.toDTO({ id: 1, expiresAt: new Date('2026-01-02T00:00:00.000Z') }).expiresAt).toBe('2026-01-02T00:00:00.000Z');
		expect(CouponMapper.toDTO({ id: 1, expiresAt: null }).expiresAt).toBeNull();
	});

	it('transaction type defaults FULL_PAYMENT', () => {
		expect(TransactionMapper.toDTO({ id: 1 }).type).toBe('FULL_PAYMENT');
		expect(TransactionMapper.toDTO({ id: 1, type: 'DEPOSIT' }).type).toBe('DEPOSIT');
	});

	it('toOrderItem: quantity||1, sku built, nulls kept', () => {
		const d = toOrderItem({ bookId: 1, title: 'B', pages: 10, quantity: 0, cover: 'soft', paper: 'matt', paperSize: 'A4' });
		expect(d).toMatchObject({ bookId: 1, quantity: 1, cover: 'soft' });
		expect(typeof d.sku).toBe('string');
	});
});

describe('U-32: finance/user/auth/admin/upload mappers (?? fallbacks)', () => {
	it('income/expense/cashflow nulls', () => {
		expect(IncomeMapper.toDTO({ id: 1 }).note).toBeNull();
		const e = ExpenseMapper.toDTO({ id: 1 });
		expect(e).toMatchObject({ description: null, supplierInfo: {}, taxCode: null });
		const c = CashflowMapper.toDTO({ id: 1 });
		expect(c).toMatchObject({ incomeId: null, expenseId: null, note: null });
	});

	it('profile/user banned flag; auth shapes; admin shapes', () => {
		expect(ProfileMapper.toDTO({ id: 1, isDelete: true }).banned).toBe(true);
		expect(ProfileMapper.toDTO({ id: 1 }).banned).toBe(false);
		expect(UserMapper.toDTO({ id: 1 }).banned).toBe(false);
		const a = AuthMapper.toAuthResponse({ id: 1, email: 'e' }, 'AT', 'RT');
		expect(a).toMatchObject({ accessToken: 'AT', refreshToken: 'RT', user: expect.objectContaining({ id: 1 }) });
		expect(AdminMapper.toUserStatusResponse({ id: 1, isDelete: true }).banned).toBe(true);
		expect(AdminMapper.toStickerDTO({ id: 2, url: 'u' })).toMatchObject({ id: 2, url: 'u' });
	});

	it('print/supplier/image fallbacks', () => {
		const p = PrintOptionMapper.toDTO({ id: 1, code: 'P' });
		expect(p).toMatchObject({ name: { vi: 'P', en: 'P', es: 'P' }, width: null });
		const s = SupplierMapper.toDTO({ id: 1 });
		expect(s).toMatchObject({ banned: false, paperOptions: [], coverOptions: [] });
		expect(ImageMapper.toDTO({ id: 1, url: 'u' }).thumbUrl).toBeNull();
	});
});
