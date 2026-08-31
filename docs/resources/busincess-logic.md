# Echotrace — Tài liệu nghiệp vụ (Business Logic)

> Tự động tổng hợp từ toàn bộ codebase `backend/src/features/*`, `frontend/features/*`, `frontend/app/*`, `shared/*`, `prisma/schema.prisma`. Cập nhật: 2026-08-30.

## Mục lục
1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Auth — Xác thực](#2-auth--xác-thực)
3. [Users — Người dùng](#3-users--người-dùng)
4. [Books — Sách của người dùng](#4-books--sách-của-người-dùng)
5. [Sample Books — Sách mẫu / Album](#5-sample-books--sách-mẫu--album)
6. [Cart — Giỏ hàng & Tính giá](#6-cart--giỏ-hàng--tính-giá)
7. [Coupons — Mã giảm giá](#7-coupons--mã-giảm-giá)
8. [Order — Đơn hàng](#8-order--đơn-hàng)
9. [Payment — Thanh toán & Webhook](#9-payment--thanh-toán--webhook)
10. [Finance — Tài chính](#10-finance--tài-chính)
11. [Suppliers — Nhà cung cấp](#11-suppliers--nhà-cung-cấp)
12. [Print Options — Tùy chọn in](#12-print-options--tùy-chọn-in)
13. [Uploads — Ảnh người dùng (R2)](#13-uploads--ảnh-người-dùng-r2)
14. [PDF — Render & Queue](#14-pdf--render--queue)
15. [Stickers / Decor Assets](#15-stickers--decor-assets)
16. [Email](#16-email)
17. [Hàng đợi & Cron — Order Expiry](#17-hàng-đợi--cron--order-expiry)
18. [Frontend — Các luồng giao diện](#18-frontend--các-luồng-giao-diện)
19. [Shared — Enums, Error Codes, Limits](#19-shared--enums-error-codes-limits)
20. [Mô hình dữ liệu (Prisma)](#20-mô-hình-dữ-liệu-prisma)

---

## 1. Tổng quan hệ thống

**Echotrace** là nền tảng thương mại điện tử in sách ảnh tùy biến (photobook / travel journal / album). Người dùng thiết kế sách trên canvas (Fabric.js), chọn chất liệu in (cover/paper/size), thêm vào giỏ, áp coupon, thanh toán qua PayOS (full hoặc cọc 50%), đơn được giao cho nhà in (supplier), theo dõi vận chuyển, xử lý đổi/trả/bảo hành, và thống kê tài chính.

**Stack:** Next.js 16 (Turbopack) + Express + Prisma 7 + PostgreSQL + Redis + Cloudflare R2 + Resend + PayOS. i18n: `en/vi/es` (`i18next` + `next-intl`). Auth: JWT tự quản (access 1h + refresh 30d) + Google OAuth.

**Routing backend** (`backend/src/server.ts:55`): mọi API qua `/:lang/api` và `/api` → `auth → users → suppliers → print-options → sample-books → books → cart → coupons → stickers → uploads → order → payment → finance`.

---

## 2. Auth — Xác thực

**Files:** `backend/src/features/auth/{auth.service,auth.controller,auth.routes,auth.repository}.ts`

### API

| Method | Path | Guard | Mô tả |
|--------|------|-------|-------|
| POST | `/auth/google` | `authLimiter 10/15m` | Đăng nhập Google |
| POST | `/auth/send-otp` | `authLimiter 10/15m` | Gửi OTP đăng ký |
| POST | `/auth/verify-otp` | `otpLimiter 5/15m` | Xác thực OTP + tạo tài khoản |
| POST | `/auth/login` | `authLimiter` | Đăng nhập email/password |
| POST | `/auth/logout` | `authGuard()` | Đăng xuất |
| POST | `/auth/refresh` | `authLimiter` | Cấp lại access token |

### Nghiệp vụ

- **Google Login** (`auth.service.ts:31`): verify `idToken` qua `OAuth2Client(GOOGLE_CLIENT_ID)`, lấy `payload.email`. Tìm user theo `googleId` hoặc `email`; nếu chưa có → tạo user Google. Nếu `isDelete=true` → `AUTH_ACCOUNT_BANNED 403`. Cấp `accessToken (1h, JWT_ACCESS_SECRET)` + `refreshToken (30d, JWT_REFRESH_SECRET)`.
- **Send OTP** (`auth.service.ts:53`): nếu email đã tồn tại user active → **silent return** (chống enumeration). Tạo OTP 6 số `randomInt(100000,1000000)`, hash bcrypt 10, xóa OTP cũ, lưu `Token{email, refreshToken: hashedOtp, tokenType: OTP, expiresAt: now+24h}`, gửi email plaintext qua `sendOtpEmail`.
- **Verify OTP** (`auth.service.ts:68`): kiểm tra OTP tồn tại → hết hạn → `bcrypt.compare`. **Chống brute-force**: `Map<recordId, count>`, `MAX_OTP_ATTEMPTS=5`; quá 5 lần → revoke token. Thành công → revoke OTP, hash password, tạo `User{email, password}`.
- **Login** (`auth.service.ts:94`): tìm user + password, check `isDelete`, `bcrypt.compare`.
- **Refresh** (`auth.service.ts:109`): `jwt.verify(refreshToken, JWT_REFRESH_SECRET)`, kiểm tra session tồn tại + user chưa bị ban, cấp lại access token.
- **Single-session**: `generateRefreshToken` xóa mọi session cũ trước khi tạo mới (`deleteSessionTokens`).
- Rate limit trả `TOO_MANY_REQUEST`.

---

## 3. Users — Người dùng

**Files:** `backend/src/features/users/*`

### API

| Method | Path | Guard | Mô tả |
|--------|------|-------|-------|
| GET | `/user/profile` | auth | Lấy profile |
| PUT | `/user/profile` | auth | Cập nhật profile |
| PUT | `/user/change-password` | auth | Đổi mật khẩu |
| GET | `/admin/users` | admin | Danh sách user (search, filter, cursor) |
| PATCH | `/admin/users/:id/status` | admin | Ban/unban user |

### Nghiệp vụ

- **getProfile** (`users.service.ts:39`): trả `ProfileDTO` + `hasPassword` (ẩn password).
- **updateProfile** (`users.service.ts:46`): validate phone `clean = phone.replace(/\s+/g,'')`, regex `/^(\+84\|0)[1-9]\d{8,9}$/` → `USER_INVALID_PHONE 400`; check trùng phone → `USER_PHONE_EXISTS 409`.
- **changePassword** (`users.service.ts:70`): nếu user đã có password → yêu cầu `currentPassword`, verify, check `newPassword >=6`, hash bcrypt 10.
- **Admin list** (`users.controller.ts:33`): `status=banned/active` → `isDelete`, `field=name/email/phone` → `searchFields`, default `limit 1000`, cursor pagination.
- **Ban user** (`users.service.ts` + `users.controller.ts:53`): chỉ `active/banned`, chặn `role=admin` → `ADMIN_CANNOT_BAN_ADMIN 403`, set `isDelete/deletedAt`.

---

## 4. Books — Sách của người dùng

**Files:** `backend/src/features/books/*`

### API (toàn bộ `authGuard()`)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/books/:id` | Chi tiết sách |
| GET | `/user/my-books` | Danh sách sách của tôi |
| POST | `/books` | Tạo sách |
| DELETE | `/books/:id` | Xóa sách |
| PATCH | `/books/:id/pages` | Cập nhật trang |

### Nghiệp vụ

- **Ownership**: mọi thao tác check `book.userId === userId` → `BOOK_FORBIDDEN 403`, không thấy → `BOOK_NOT_FOUND 404` (`books.service.ts:20`).
- **Create** (`books.service.ts:32`): defaults `type:TRAVEL, style:PHOTOBOOK, font:Inter, cover:softcover, title:Untitled`; `paperHeight/Width/content` nullable; `content` có thể là JSON string hoặc object; trả về DTO với `content=null` (giảm payload).
- **updatePages** (`books.service.ts:57`): `resolveContent(current, incoming)` deep-merge trang (`lib/merge-book-content.ts`), chỉ update field nào được gửi.

---

## 5. Sample Books — Sách mẫu / Album

**Files:** `backend/src/features/sample-books/*`

### API

| Method | Path | Guard | Mô tả |
|--------|------|-------|-------|
| GET | `/admin/sample-books` | admin | List (filter type/category/status) |
| GET | `/admin/sample-books/:id` | admin | Chi tiết |
| POST | `/admin/sample-books` | admin | Tạo mẫu |
| PATCH | `/admin/sample-books/:id` | admin | Cập nhật |
| PATCH | `/admin/sample-books/:id/status` | admin | Đổi trạng thái |
| DELETE | `/admin/sample-books/:id` | admin | Archive (soft) |
| GET | `/explore/samples` | auth | Khám phá template |
| GET | `/explore/albums` | auth | Khám phá album |
| GET | `/user/sample-books/:id` | auth | Xem mẫu published |

### Nghiệp vụ

- **Model** (`schema.prisma:339`): `SampleBook{createdBy, name, type: ALBUM|TEMPLATE, category, quantity (null=unlimited), style, font, cover, coverUrl, paperHeight/Width, isActive, status: draft|published|archive, content Json}`.
- **Visible**: `['published','active']` mới hiện cho user (`sample-books.service.ts:122`).
- **isActive tự động**: nếu `status !== 'archive'` thì `isActive=true`.
- **Explore/Albums** (`sample-books.service.ts:125`): cache full-list (`getExploreList`/`getAlbumList` theo type), slice in-memory theo `cursor/limit/category` (catalog nhỏ).
- **Cache**: `SampleBookCacheService` (Redis/memory) cho `getSample`, `explore`, `albums`.
- **Stock**: `quantity=null` = không giới hạn; `quantity` là tồn kho album vật lý.

---

## 6. Cart — Giỏ hàng & Tính giá

**Files:** `backend/src/features/cart/*`, `shared/utils/sku.ts`

### API (toàn bộ `authGuard()`)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/cart` | Lấy giỏ |
| POST | `/cart/item` | Thêm/cập nhật item (upsert) |
| POST | `/cart/album` | Thêm album (tạo book từ sample) |
| PATCH | `/cart/item/:bookId` | Sửa số lượng/option |
| DELETE | `/cart/item/:bookId` | Xóa item |
| POST | `/cart/calculate` | Báo giá (quote) |

### Nghiệp vụ tính giá

- **applyItemPrice** (`cart.service.ts:19`): yêu cầu đủ `cover, paper, paperSize` mới có giá, không thì `price:null`. Tra `PrintOption` qua `toOptKeyMap` (`cover:${value}`...), `size.price` hoặc `width*height/(210*297)`.
- **computeItemPrice** (`cart.service.ts:184`): `innerPages = max(0, pages-2)` (trừ bìa), `ceil((inner*perPage*sizeFactor + cover)/1000)*1000` — làm tròn lên 1000 VND.
- **upsertItem** (`cart.service.ts:67`): transaction `cart.upsert`, check `book.userId === userId` (không thêm sách người khác), `quantity = max(1, existing.quantity + input.quantity)`, merge `cover/paper/paperSize`.
- **addAlbumToCart** (`cart.service.ts:121`): check tồn kho `quantity >= need`, tìm hoặc tạo `Book` clone từ `SampleBook`, delegate `upsertItem`.
- **calculateCart** (`cart.service.ts:149`): lọc theo `bookIds` nếu có, báo lỗi `MISSING_BOOK_OPTIONS` nếu thiếu option, `subtotal = sum(price*qty)`, `discount = computeCouponDiscount(coupon, subtotal, items)`, `total = max(0, subtotal-discount)`, `payNow = HALF ? round(total*50/100) : total`, `payLater = total-payNow`, trả `CartQuote`.

---

## 7. Coupons — Mã giảm giá

**Files:** `backend/src/features/coupons/*`

### API (toàn bộ `authGuard('admin')`)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/admin/coupons` | Danh sách |
| POST | `/admin/coupons` | Tạo coupon |
| PATCH | `/admin/coupons/:id/deactivate` | Vô hiệu hóa (1 chiều) |
| DELETE | `/admin/coupons/:id` | Xóa cứng |

### Nghiệp vụ

- **Loại**: `FIXED` (số tiền) hoặc `PERCENT` (%). `FIXED` không được có `maxDiscountAmount` → `VALIDATION_FAILED 400` (`coupons.service.ts:24`).
- **Code**: `code.toUpperCase() + '-' + Date.now()` đảm bảo unique; `P2002 → COUPON_CODE_EXISTS 409`.
- **Fields**: `minOrderAmount, minOrderType (VALUE), maxDiscountAmount, maxUsageCount, isActive, expiresAt`.
- **Deactivate**: một chiều, không có reactivate (`coupons.service.ts:49`).

---

## 8. Order — Đơn hàng

**Files:** `backend/src/features/order/{order.service,order.controller,order.route,order-finance.service,order.repository}.ts`

### Trạng thái & luồng

```
pending_payment → paid / partially_paid → processing → shipping → delivered
                                     ↘ cancelled / refunding → refunded
delivered/shipping → return: none → requested → approved → reshipping → reshipped
                              ↘ refunding → refunded
defectState: none → reported → resolved
```

### API

| Method | Path | Guard | Mô tả |
|--------|------|-------|-------|
| POST | `/orders` | auth + `orderLimiter 20/m` + `Idempotency-Key: UUID` | Tạo đơn |
| GET | `/orders` | auth | Đơn của tôi |
| POST | `/orders/:id/payment-link` | auth | Tạo lại link thanh toán |
| POST | `/orders/:id/verify` | auth | Poll trạng thái PayOS |
| POST | `/orders/:id/cancel` | auth | Hủy đơn |
| POST | `/orders/:id/return` | auth | Yêu cầu đổi/trả |
| POST | `/orders/:id/report-defect` | auth | Báo lỗi |
| POST | `/orders/:id/pdf` | auth (owner/admin) | Enqueue PDF |
| GET | `/admin/orders` | admin | Tất cả đơn |
| GET | `/admin/orders/:id` | admin | Chi tiết |
| POST | `/admin/orders/:id/events` | admin | `assign/ship/deliver/reconcile_*` |
| PATCH | `/admin/orders/:id` | admin | Sửa đơn |
| POST | `/admin/orders/:id/return-approve` | admin | Duyệt đổi |
| POST | `/admin/orders/:id/return-reshipped` | admin | Đánh dấu đã giao lại |
| POST | `/admin/orders/:id/mark-defective` | admin | Đánh dấu lỗi |

### Nghiệp vụ chi tiết

- **createOrder** (`order.service.ts:84`):
  1. Idempotency: check `IdempotencyKey`; `SUCCESS` → trả cache, `PROCESSING` → 409, `FAILED` → xóa để retry, tạo `PROCESSING`.
  2. Validate `name/phone/address/city` (phone chuẩn hóa `+84→0`, regex `/^0\d{8,10}$/`).
  3. `cartService.calculateCart` để lấy giá.
  4. Check tồn kho `sumNeedBySampleBook` theo `sampleBookId`.
  5. Tạo `paymentLink` qua PayOS (`description: DH {orderCode}`, `expiredAt`).
  6. **Transaction Serializable** (5s wait, 10s timeout): trừ kho `WHERE quantity >= need` (race-safe), tạo `Order{orderCode, subTotal, discountAmount, totalAmount, depositAmount, paidAmount:0, status:PENDING_PAYMENT, couponCode, orderItems snapshot, qrCode, checkoutUrl}`, tạo `Transaction{PENDING, amount:payNow}`, xóa cart, mark idempotency SUCCESS.
  7. Post-commit: `scheduleDelayedJob(order_expiry, PAYMENT_LINK_EXPIRY_MS)` + `pdfQueue.enqueue`.

- **createPaymentLink** (`order.service.ts:253`): chỉ `PENDING_PAYMENT`; nếu link cũ còn hạn → trả cache; không thì refund link cũ + tạo mới.

- **verifyPayment** (`order.service.ts:285`): polling fallback khi webhook không tới (localhost); cache `payStatusCache 5s`, nếu `PAID` → `webhookService.processWebhook`.

- **Admin events** (`order.service.ts:367`):
  - `assignOrder`: gán `supplierId/costPrice` từng `itemIndex`, set `supplierId` chung nếu 1 NCC duy nhất, status `PROCESSING`.
  - `ship/deliver`: chuyển `processing→shipping→delivered`; `deliver` hỗ trợ partial `itemIndices`, đánh `deliveredAt`, nếu all delivered → `recognizeIncome`.
  - `reconcileCod`: chỉ `DELIVERED + HALF`, tạo `Cashflow IN Thu COD`.
  - `reconcileSupplier`: chỉ `PROCESSING|SHIPPING|DELIVERED`, validate `costPrice>0`, group theo supplier, `recordOutflow(SUPPLIER)` + stamp `reconciledAt`.
  - `refund/reconcileRefund`: `PAID|PARTIALLY_PAID → REFUNDING → REFUNDED`, `recordOutflow(OTHER)`.

- **cancelOrder** (`order.service.ts:524`): cho phép `pending_payment|paid|partially_paid|processing|shipping`; nếu `paidAmount>0` → refund PayOS + `REFUNDING`; nếu `PENDING_PAYMENT` → restock + `CANCELLED`.

- **Đổi/trả/bảo hành** (`order.service.ts:561`):
  - `requestReturn`: chỉ `DELIVERED|SHIPPING + returnState=NONE`, đánh `returnQty/returnDefect`.
  - `approveReturn`: `REQUESTED→RESHIPPING`, fault `SELF` (lỗi mình) vs `SUPPLIER` (lỗi NCC) → nếu `SUPPLIER` stamp `returnFault='supplier'`.
  - `markReshipped`: `RESHIPPING→RESHIPPED`; nếu `SELF` → `recordOutflow(OTHER, Bảo hành giao lại)`, nếu `SUPPLIER` → không tốn phí.
  - `reportDefect/markDefective`: `DELIVERED + defectState=NONE → REPORTED`; admin tạo `Expense DEFECTIVE` thủ công.

---

## 9. Payment — Thanh toán & Webhook

**Files:** `backend/src/features/payment/*`, `backend/src/infrastructure/payment/*`

### API

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/payments/webhooks/payos` | Webhook PayOS (không auth, HMAC, `webhookLimiter 60/m`) |

### Nghiệp vụ

- **PaymentService** tạo link PayOS (`CreatePaymentLinkDto: orderCode, amount, description, items, buyer, expiredAt`).
- **Webhook** (`payment.service.ts:25`): transaction Serializable:
  - Tìm `Transaction` theo `gatewayTransactionCode` → nếu `SUCCESS` rồi → idempotent return.
  - Nếu `order.status = CANCELLED|REFUNDED` → bỏ qua (không hồi sinh đơn).
  - Nếu `SUCCESS`: dedup `count SUCCESS >0` → return; `paidAmount += amount`, `isFull = paidAmount >= totalAmount`, `status = PAID : PARTIALLY_PAID`; tạo `Cashflow IN` (note `Thanh toán đủ` hoặc `Tiền cọc 50%`).
  - Nếu `CANCELLED`: nếu `PENDING_PAYMENT` → restock album, set `CANCELLED`.
  - Gửi email xác nhận qua `EmailService` (subject `Đã nhận thanh toán/cọc đơn {orderCode}`).
- **Polling**: `verifyPayment` gọi `paymentService.getPaymentStatus` khi webhook không tới.

---

## 10. Finance — Tài chính

**Files:** `backend/src/features/finance/*`, `prisma/triggers/finance_counters.sql`

### API (toàn bộ `authGuard('admin')`)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/admin/financial/summary` | Tổng quan |
| GET | `/admin/financial/suppliers` | Công nợ NCC |
| POST | `/admin/financial/expenses` | Tạo chi phí |
| GET | `/admin/financial/income` | List thu nhập |
| GET | `/admin/financial/expense` | List chi phí |
| GET | `/admin/financial/cashflow` | List dòng tiền |

### Nghiệp vụ

- **FinancePeriod** (`schema.prisma:472`): bảng counter `period='YYYY-MM'` với `totalOrders, totalRevenue, totalExpense, totalSupplierExpense, cashInflow, cashOutflow, totalProfit, cashOnHand, receivables, payables` — **cập nhật bởi DB trigger** (`finance_counters.sql`), backfill `backfill_finance_periods.sql`.
- **getSummary** (`finance.service.ts:46`): `SUM` 10 field từ `FinancePeriod`, sinh 12 tháng gần nhất `YYYY-MM`, fill tháng thiếu `revenue:0`.
- **getSuppliers** (`finance.service.ts:83`): `PAYABLE_TERMS_DAYS` (default 14), raw SQL `getSupplierDebtsRaw(termsDays, monthStart, monthEnd)` → `SupplierDebt{id,name,totalDebt,thisMonth}`.
- **createExpense** (`finance.service.ts:99`): validate `amount>0`, `category in [OPERATING,PAYROLL,MARKETING,DEBT,OTHER,SUPPLIER,DEFECTIVE]`.
- **List** (`finance.service.ts:120`): filter `from/to/category/type`, cursor pagination `limit=20`, `nextCursor`.
- **OrderFinanceService** (`order-finance.service.ts`): `recordOutflow(tx, orderId, amount, category, note)` tạo `Expense + Cashflow OUT` (duy nhất 1 nơi ghi OUT); `recognizeIncome(orderId, amount)` idempotent, tạo `Income` khi `DELIVERED`.

---

## 11. Suppliers — Nhà cung cấp

**Files:** `backend/src/features/suppliers/*`

### API

| Method | Path | Guard | Mô tả |
|--------|------|-------|-------|
| GET | `/admin/suppliers` | admin | List (search, status) |
| GET | `/admin/supplier-options/catalog` | admin | Catalog option cache |
| GET | `/admin/supplier-options/info` | admin | Info 1 option |
| GET | `/admin/suppliers/:id` | admin | Chi tiết |
| PATCH | `/admin/suppliers/:id/info` | admin | Sửa info (whitelist) |
| PATCH | `/admin/suppliers/:id/options` | admin | Gán option |
| PATCH | `/admin/suppliers/:id` | admin | Sửa chung |
| PATCH | `/admin/suppliers/:id/status` | admin | active/banned |
| POST | `/admin/suppliers` | admin | Tạo NCC |
| DELETE | `/admin/suppliers/:id` | admin | Xóa mềm |
| GET | `/user/suppliers/options` | auth | Catalog cho user chọn |

### Nghiệp vụ

- **Supplier** (`schema.prisma:389`): `name, contact, email@unique, taxCode, address, bankName/Bin/AccountNumber/AccountName, contactPerson, totalDebt, monthDebt, banned`.
- **SupplierPrintOption** (`schema.prisma:435`): link `supplier ↔ printOption`, soft delete, unique `[supplierId, printOptionId]`.
- **updateSupplierOptions** (`suppliers.service.ts:96`): `Set(optionIds)`, transaction: `updateMany isDelete:true` cho link thừa, reactivate hoặc create link thiếu; `optionCache.invalidateCatalogForTypes('paperSize','paper','cover')`.
- **attachOptions** (`suppliers.service.ts:130`): bulk fetch để tránh N+1, group theo `type`.
- **getAggregatedOptions** (`suppliers.service.ts:167`): dedup `paper/cover` qua `Map<code>`, lấy `SupplierPrintOption` active.

---

## 12. Print Options — Tùy chọn in

**Files:** `backend/src/features/print-options/*`

### API (toàn bộ `authGuard('admin')`)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/admin/print-options` | List (filter type, search code) |
| POST | `/admin/print-options` | Tạo |
| PATCH | `/admin/print-options/:id` | Sửa |
| DELETE | `/admin/print-options/:id` | Xóa mềm |

### Nghiệp vụ

- **PrintOption** (`schema.prisma:414`): `type (cover/paper/paperSize), code unique [type,code], name Json, description Json, width, height, price`.
- **Create/Update** (`print-options.service.ts:39`): spread chỉ field defined, catch `P2002 → PRINT_OPTION_CODE_EXISTS 409`, invalidate cache `optionCache.invalidateOption(type,code)`.

---

## 13. Uploads — Ảnh người dùng (R2)

**Files:** `backend/src/features/uploads/*`

### API (toàn bộ `authGuard()`)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/get-upload-signature` | Lấy token upload R2 |
| POST | `/uploads/image` | Lưu metadata ảnh sau upload |
| GET | `/uploads/images` | List ảnh của tôi (filter bookId) |
| DELETE | `/uploads/images/:id` | Xóa ảnh |

### Nghiệp vụ

- **getSignature** (`uploads.controller.ts:17`): `type=gallery|sticker|book-thumb` → folder `echotrace/stickers` hoặc `echotrace/books/user_{userId}` hoặc `echotrace/gallery/user_{userId}` → `r2.issueUpload(folder)` trả `{token,expiry,folder,uploadUrl}` (HMAC `${folder}:${expiry}`).
- **saveImage** (`uploads.controller.ts:40`): validate `url` required → `IMAGE_NOT_REQUIRED 400`, tạo `UserImage{userId, url, publicId, width, height, size}` (lưu ý `thumbUrl` không persist).
- **listByUser** (`user-images.service.ts:29`): filter `userId + bookId?`.
- **delete** (`user-images.service.ts:34`): check ownership, `r2.deleteAsset(publicId).catch(()=>{})` (không rollback nếu R2 lỗi).
- **UserImage** (`schema.prisma:71`): `url, publicId, width, height, size, thumbUrl, bookId, isDelete`.

---

## 14. PDF — Render & Queue

**Files:** `backend/src/features/pdf/{pdf.service,pdf.worker,pdf.queue,fabric.renderer,r2-file.service}.ts`

### Nghiệp vụ

- **DbPdfQueue** (`pdf.queue.ts:1`): `enqueue(orderId)` → `upsertPdfJob(orderId)` (`orderId @unique`, reset `PENDING`).
- **PdfWorker** (`pdf.worker.ts:1`): `PDF_MAX_CONCURRENT || 2`, `PDF_POLL_MS || 5000`, `active` counter. `start()` → `poll()` + `setInterval(poll, 5000)`. `poll` claim job khi `active < max`, `run` → `pdf.process`, lỗi → `nextAttempt = attempts+1`, `status = next >= PDF_MAX_ATTEMPTS ? FAILED : PENDING`, `lastError.slice(0,2000)`.
- **PdfService.process** (`pdf.service.ts:1`): `renderer.renderOrderToPdf(orderId)` → `r2.uploadBuffer(pdfBuf, PDF_FOLDER)` → cập nhật `orderItems` chỉ cho `book.type !== ALBUM` (ALBUM không render), `order.pdfUrl = url`, transaction `updateOrderPdf + markPdfJobDone`.
- **FabricRenderer** (`fabric.renderer.ts:1`): `PDFDocument` (pdf-lib), font `PDF_FONT_FAMILY || PDFVi` (`ensureFont` thử `PDF_FONT_PATH` hoặc `C:/Windows/Fonts/arial.ttf` ...), `parseCanvasJson`, `collectImageSrcs` regex `^https?://`, `downloadOne` retry 3 lần `fetch(url) → data:mime;base64`, fail → `GRAY_1X1` fallback. Mỗi page: `StaticCanvas → loadFromJSON → force fontFamily cho text → renderAll → toDataURL png → embedPng → addPage`.

---

## 15. Stickers / Decor Assets

**Files:** `backend/src/features/stickers/*`, `schema.prisma:370`

### API

| Method | Path | Guard | Mô tả |
|--------|------|-------|-------|
| GET | `/admin/stickers` | auth | List (filter category) |
| POST | `/admin/stickers` | admin | Tạo sticker |
| DELETE | `/admin/stickers/:id` | admin | Xóa |

### Nghiệp vụ

- **DecorAsset** (`schema.prisma:370`): `createdBy, type, category, name, url, publicId, isDelete`.
- **list** (`stickers.controller.ts:20`): filter `type='sticker'` + `category` nếu hợp lệ (`AssetCategory`), `isDelete:false`.
- **create** (`stickers.controller.ts:30`): validate `url` + `category ∈ AssetCategory` → `UPLOAD_CATEGORY_INVALID 400`, tạo `DecorAsset`.
- **remove** (`stickers.controller.ts:47`): `findById → NOT_FOUND 404`, `r2.deleteAsset(publicId).catch(()=>{})`.

---

## 16. Email

**Files:** `backend/src/features/email/email.service.ts`

- **EmailService.send** (`email.service.ts:1`): `POST https://api.resend.com/emails` với `RESEND_API_KEY`, `from || MAIL_FROM || onboarding@resend.dev`, `to:[msg.to]`, `subject, html`. **Không throw** — lỗi chỉ `console.error`, caller không biết fail.
- Dùng cho: OTP (`auth.service.ts`), xác nhận thanh toán (`payment.service.ts:113`).

---

## 17. Hàng đợi & Cron — Order Expiry

**Files:** `backend/src/infrastructure/queue/{redis-delayed-queue,order-expiry-cron}.ts`

- **RedisDelayedQueue** (`redis-delayed-queue.ts:1`): `REDIS_URL || redis://localhost:6379`, Sorted Set `echotrace:delayed_jobs` score=`Date.now()+delayMs`. `scheduleDelayedJob(name,payload,delay)` → `zadd`, `processDue` mỗi 5s `zrangebyscore 0 now` → `zrem` (idempotent multi-worker) → `JSON.parse` → nếu `order_expiry` → `handleOrderExpiry(orderId)`. `handleOrderExpiry` (`redis-delayed-queue.ts:44`): nếu `status !== PENDING_PAYMENT` hoặc `expiredAt > now` (link đã refresh) → bỏ qua; không thì transaction `restockOrderAlbums + markCancelled`.
- **OrderExpiryCron** (`order-expiry-cron.ts:1`): backup khi Redis miss. `BATCH_SIZE=200`, cursor `lastId`, `findExpiredForCancellation(lastId, BATCH_SIZE)` order by id, mỗi order `handleOrderExpiry`, chạy ngay khi boot + `setInterval 10 phút`.

---

## 18. Frontend — Các luồng giao diện

### Cấu trúc route (`frontend/app`)

| Route | File | Mô tả |
|-------|------|-------|
| `/` | `(public)/page.tsx` | Landing (hero, how-it-works, materials, pricing, showcase, testimonial, marquee, CTA, footer) |
| `/auth` | `(public)/auth/page.tsx` | Đăng nhập/đăng ký (OTP, Google, email/password) |
| `/explore` | `(customer)/explore/page.tsx` | Khám phá template/album (`explore-client.tsx`, `sample-card.tsx`) |
| `/studio` | `(customer)/studio/page.tsx` | Canvas thiết kế sách (Fabric.js) |
| `/studio/preview` | `(customer)/studio/preview/page.tsx` | Xem trước sách |
| `/my-journals` | `(customer)/my-journals/page.tsx` | Sách của tôi (`journal-card.tsx`, `size-modal.tsx`) |
| `/checkout` | `(customer)/checkout/page.tsx` | 4 bước: cart → delivery → payment → confirm (`cart-step`, `delivery-step`, `payment-step`, `confirm-step`, `order-summary`, `edit-options-modal`) |
| `/orders` | `(customer)/orders/page.tsx` | Đơn của tôi (`order-card.tsx`) |
| `/account` | `(customer)/account/page.tsx` | Profile, đổi mật khẩu |
| `/admin/*` | `(admin)/admin/*` | Layout admin (`admin-sidebar.tsx`): analytics, finance, dispatch, users, suppliers, print-options, sample-books, stickers, coupons, studio, marketing, account |

### Studio Canvas (`frontend/features/studio-canvas`)

- **Context**: `studio-context.tsx` quản lý `CanvasState` (pages, elements, selection).
- **Hooks**: `useStudioEditor` (Fabric operations), `usePageManager` (thêm/xóa/sắp xếp trang), `useElementControls` (di chuyển, resize, rotate, filter), `useCanvasState` (state), `useAutoSave` (debounce lưu).
- **Lib**: `layout-engine.ts` (auto-layout), `shapes.ts` (hình khối), `filters.ts` (bộ lọc ảnh), `spine.ts` (gáy sách), `book-content.ts` (chuyển canvas → `Book.content` JSON).
- **Components**: `StudioLayout` (tổng), `StudioTopbar`, `StudioSidebar` (photos/layouts/frames/stickers/filters), `StudioWorkspace` + `PagesSlider`, `StudioProperties` (thuộc tính phần tử), `FiltersBar`, `ContextMenu`, `BookPreview`.
- **API**: `studio-api.ts` (`save(bookId, payload)`, `load(bookId)`), `sample-book-api.ts`, `customer-api.ts`.

### Landing (`frontend/features/landing`)

- Sections: `hero`, `how-it-works`, `materials`+`material-card`, `pricing`, `showcase`+`showcase-slider`, `testimonial`, `marquee`, `cta`, `footer`; `book-3d.tsx` (3D preview), `use-reveal.ts` (scroll reveal), `landing-css.ts`.

### Book Slider (`frontend/features/book-slider`)

- `book.tsx` (render sách), `experience.tsx`, `render-book-images.ts` (tạo thumbnail), `landing-book-preview.tsx`.

### Admin UI

- **Dispatch** (`dispatch/page.tsx`, `dispatch-table.tsx`): gán NCC, ship, deliver, reconcile COD/supplier, refund.
- **Finance** (`finance/page.tsx`): summary (12 tháng), suppliers debt, tạo expense, list income/expense/cashflow.
- **Stickers/Sample Books/Print Options/Suppliers/Users/Coupons**: CRUD + assign, ban, deactivate.

---

## 19. Shared — Enums, Error Codes, Limits

**Files:** `shared/enums/*`, `shared/constants/*`, `shared/dtos/*`, `shared/utils/*`

### Enums

- **OrderStatus** (`order.enum.ts:1`): `pending_payment, paid, partially_paid, processing, shipping, delivered, cancelled, refunding, refunded`.
- **ReturnState** (`order.enum.ts:16`): `none, requested, approved, reshipping, reshipped, refunding, refunded`.
- **ReturnFault** (`order.enum.ts:29`): `self` (lỗi mình → ghi expense) / `supplier` (lỗi NCC → bỏ qua expense).
- **DefectState** (`order.enum.ts:37`): `none, reported, resolved`.
- **TransactionType** (`payment.enum.ts:3`): `deposit, remaining_payment, full_payment`.
- **PaymentPlan** (`payment.enum.ts:11`): `full-payment, half-payment`.
- **PaymentGateway** (`payment.enum.ts:20`): `PAYOS, SEPAY`.
- **TransactionStatus** (`payment.enum.ts:29`): `pending, success, failed, cancelled, expired, refunded`.
- **ExpenseCategory** (`schema.prisma:10`): `OPERATING, PAYROLL, MARKETING, DEBT, OTHER, SUPPLIER, DEFECTIVE`.
- **SampleBookType** (`schema.prisma:20`): `ALBUM, TEMPLATE`.

### Error Codes (`shared/constants/error-codes.ts`)

`AUTH_*` (id token, email, OTP, password, token), `USER_*` (not found, phone, password), `BOOK_*`, `UPLOAD_*`, `ADMIN_*`, `COUPON_CODE_EXISTS`, `PRINT_OPTION_CODE_EXISTS`, `VALIDATION_FAILED`, `NOT_FOUND`, `INTERNAL`, `CART_NOT_FOUND`, `MISSING_BOOK_OPTIONS`, `TOO_MANY_REQUEST`.

### Limits (`shared/constants/app-limits.ts`)

`PASSWORD_MIN_LENGTH=6`, `COUPON_CODE 3-20`, `AUTH_RATE_LIMIT 10/15m`.

### DTOs (`shared/dtos/*`)

`AuthDTO`, `ProfileDTO`, `BookDTO`, `CartDTO/CartQuote`, `OrderDTO/OrderReadDTO`, `PaymentLinkDTO`, `SupplierDTO`, `PrintOptionDTO`, `SampleBookDTO`, `CouponDTO`, `UploadDTO`, `Income/Expense/CashflowDTO`, `TransactionDTO`, `UserList`, `AdminDTO`.

---

## 20. Mô hình dữ liệu (Prisma)

**File:** `backend/prisma/schema.prisma` (PostgreSQL)

| Model | Khóa chính | Quan hệ chính | Ghi chú |
|-------|-----------|--------------|---------|
| User | id | tokens, orders, books, sampleBooks, decorAssets, cart, userImages | `role=user\|admin`, `isDelete` soft |
| Token | id | user | `refreshToken@unique`, `tokenType=session\|OTP`, `expiresAt` |
| UserImage | id | user | `publicId` R2, `bookId?`, `isDelete` |
| Order | id | user, supplier, transactions, pdfJobs | `orderCode@unique`, `status`, `orderItems Json`, `pdfUrl`, `returnState/Fault`, `defectState` |
| OrderPdfJob | id | order | `orderId@unique`, `status PENDING\|FAILED\|PROCESSING`, `attempts` |
| Transaction | id | order, idempotencyKey, income, expenses | `gatewayTransactionCode@unique`, `type`, `status` |
| Income | id | transaction, cashflow | `orderId`, `amount`, `receivedAt` |
| Expense | id | transaction, cashflow | `category ExpenseCategory`, `taxCode`, `supplierInfo Json` |
| Cashflow | id | income, expense | `type IN\|OUT`, `orderId`, `transactionId` |
| Book | id | user, sampleBook, cartItems | `content Json`, `cover/paper/size`, `isDelete` |
| Cart | id | user, items | `userId@unique` |
| CartItem | id | cart, book | `quantity`, `cover/paper/paperSize`, unique `[cartId,bookId]` |
| IdempotencyKey | key | transaction | `status PROCESSING\|SUCCESS\|FAILED`, `responseBody Json` |
| SampleBook | id | creator, books | `type ALBUM\|TEMPLATE`, `quantity`, `isActive`, `status` |
| DecorAsset | id | creator | `type, category, publicId` |
| Supplier | id | orders, supplierOptions | `email@unique`, `banned`, `totalDebt` |
| PrintOption | id | supplierOptions | `type, code` unique `[type,code]`, `name/description Json`, `price` |
| SupplierPrintOption | id | supplier, printOption | unique `[supplierId,printOptionId]`, soft |
| Coupon | id | — | `code@unique`, `discountType`, `isActive` |
| FinancePeriod | period `YYYY-MM` | — | Counter trigger, 10 số liệu |

**Indexes chính:** `User[role,isDelete]`, `Order[userId,supplierId,status,orderCode,trackingCode]`, `Transaction[orderId,status,gateway]`, `Book[userId,type,sampleBookId]`, `SampleBook[createdBy,type,category,isActive]`, v.v.

---

## Luồng tổng hợp (End-to-end)

1. **Khám phá** → user xem `explore/samples|albums` (published only).
2. **Thiết kế** → mở `studio` (Fabric canvas), thêm ảnh (R2 presigned), sticker, text, layout; `useAutoSave` lưu `Book.content`.
3. **Giỏ hàng** → thêm book/album (check tồn kho), chọn `cover/paper/size` (từ `SupplierPrintOption`), `calculateCart` tính giá + coupon.
4. **Checkout** → nhập `name/phone/address/city`, chọn `paymentPlan (full/half)`, tạo `Order + Transaction PENDING`, PayOS link, `scheduleDelayedJob` + `pdfQueue`.
5. **Thanh toán** → PayOS webhook hoặc `verifyPayment` polling → `PAID|PARTIALLY_PAID`, tạo `Cashflow IN`, gửi email.
6. **Vận hành** → admin `assign` NCC + `costPrice`, `ship` (trackingCode), `deliver` (recognizeIncome), `reconcileCod` (COD), `reconcileSupplier` (OUT SUPPLIER).
7. **Hậu mãi** → user `requestReturn/reportDefect`, admin `approveReturn/markReshipped/markDefective`, ghi `Expense` tương ứng.
8. **Tài chính** → trigger cập nhật `FinancePeriod`, admin xem `summary/suppliers/income/expense/cashflow`.
9. **PDF** → worker render từng trang Fabric → PNG → PDF → upload R2 → cập nhật `order.pdfUrl`.

---

*Tài liệu này được sinh tự động — khi thêm feature mới, cập nhật file này hoặc chạy lại script tổng hợp.*
