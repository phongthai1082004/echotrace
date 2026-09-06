# Order Status Lifecycle — EchoTrace

> Sources: `backend/src/features/order/order.service.ts` (`OrderService.ALLOWED`, `assertTransition`),
> `backend/src/features/payment/payment.service.ts` (`processWebhook`), enum `shared/enums/order.enum.ts`.

## 1. State machine (arrow direction = allowed transition)

```
pending_payment ──processWebhook(SUCCESS, full)──▶ PAID ──assign──▶ PROCESSING ──ship──▶ SHIPPING ──deliver(all)──▶ DELIVERED ★
       │                                                 ▲                  │
       ├──processWebhook(SUCCESS, 50%)──▶ PARTIALLY_PAID ┘ (assign)          │
       │                                                                     │
       ├──webhook CANCELLED / expiry / cancelOrder──▶ CANCELLED ◀── cancelOrder (customer) ──┘
       │
PAID / PARTIALLY_PAID ──refund (admin) / cancelOrder (paid)──▶ PENDING_REFUND ──reconcile_refund (admin)──▶ REFUNDED ★

★ = terminal states (DELIVERED = success exit; CANCELLED / REFUNDED = exit states)
```

Refund is now a **two-step flow**: the money/ledger write happens only when the admin
reconciles — cancelling a paid order just parks it in `pending_refund`.

## 2. Transition table (from → action → to)

| From (status) | Action | Caller | To (status) | Side effects |
|---|---|---|---|---|
| `pending_payment` | `processWebhook` — SUCCESS, full amount | PayOS webhook / `verifyPayment` poll | `paid` | txn → SUCCESS, **Cashflow IN**, `paidAmount += amount` |
| `pending_payment` | `processWebhook` — SUCCESS, 50% (HALF) | PayOS webhook | `partially_paid` | same, `paidAmount = 50%` |
| `pending_payment` | webhook CANCELLED / expiry cron / `cancelOrder` | PayOS / `order-expiry-cron` / customer | `cancelled` | **restock** albums (atomic with status flip) |
| `paid` | `assign` | admin event | `processing` | per-item `supplierId` + `costPrice` |
| `partially_paid` | `assign` | admin event | `processing` | same |
| `paid` | `refund` / `cancelOrder` | admin / customer | `pending_refund` | status only — nothing paid yet |
| `partially_paid` | `refund` / `cancelOrder` | admin / customer | `pending_refund` | same |
| `processing` | `ship` | admin event | `shipping` | status only |
| `processing` | `cancelOrder` | customer | `cancelled` | no auto refund (already in production) |
| `shipping` | `deliver` — ALL items marked `deliveredAt` | admin event | `delivered` | **Income** recognized once |
| `shipping` | `deliver` — partial | admin event | `shipping` (unchanged) | mark per-item `deliveredAt` |
| `shipping` | `cancelOrder` | customer | `cancelled` | no auto refund |
| `pending_refund` | `reconcile_refund` | admin event | `refunded` | PayOS refund (best-effort) + **Cashflow OUT only** (no Expense — refunds are money movement, not business cost) + txns marked refunded |
| `delivered` | — | — | (end state) | see side actions below |

`assertTransition` rejects any admin PATCH outside the `ALLOWED` map (e.g. `pending_payment → delivered` is impossible).

## 3. Allowed actions per status

| Status \ Action | `processWebhook` | `cancelOrder` | `assign` | `ship` | `deliver` | `reconcile_supplier` | `reconcile_cod` | `refund` | `reconcile_refund` | Return / Defect |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `pending_payment` | ✅ | ✅ (restock) | — | — | — | — | — | — | — | — |
| `paid` | (retry skipped¹) | ✅ → pending_refund | ✅ | — | — | — | — | ✅ | — | — |
| `partially_paid` | (retry skipped¹) | ✅ → pending_refund | ✅ | — | — | — | — | ✅ | — | — |
| `processing` | — | ✅ → cancelled | — | ✅ | — | ✅ | — | — | — | — |
| `shipping` | — | ✅ → cancelled | — | — | ✅ | ✅ | — | — | — | ✅ `requestReturn` |
| `delivered` | — | — | — | — | — | ✅ | ✅ (HALF → Cashflow IN "COD collected") | — | — | ✅ `requestReturn` / `reportDefect` |
| `cancelled` | — | — | — | — | — | — | — | — | — | — |
| `pending_refund` | — | — | — | — | — | — | — | — | ✅ → refunded | — |
| `refunded` | — | — | — | — | — | — | — | — | — | — |

¹ Webhook retries on an already-SUCCESS txn return early (idempotency guard).

## 4. Finance recognition per event

| Event | Ledger row(s) | FinancePeriod counters |
|---|---|---|
| Webhook SUCCESS (real money received) | `Cashflow IN` | `cashInflow` |
| Deliver all items (DELIVERED) | `Income` | `totalRevenue` |
| `reconcile_supplier` | `Expense(SUPPLIER)` + `Cashflow OUT` | `totalSupplierExpense`, `cashOutflow` |
| `reconcile_cod` (HALF, at DELIVERED) | `Cashflow IN` | `cashInflow` |
| `reconcile_refund` (admin confirms refund sent) | `Cashflow OUT` only — no Expense | `cashOutflow` |
| Warranty reship (`markReshipped`, fault=SELF) | `Expense(OTHER)` | `totalExpense` |

Every row above fires the Postgres triggers → `fn_period_upsert` → updates `FinancePeriod` for the month.

## 5. Side actions (no status change)

| Action | Guard | Effect |
|---|---|---|
| `reconcile_supplier` | status ∈ {processing, shipping, delivered}, item `costPrice > 0` | pay supplier per item, mark `reconciledAt` |
| `reconcile_cod` | status = delivered, paymentType = HALF, no `codReconciledAt` | collect remainder, Cashflow IN |
| `requestReturn` | status ∈ {shipping, delivered}, `returnState = none` | report defect, mark item `defective` |
| `approveReturn` | `returnState = requested` | fault = SELF (we pay supplier) / SUPPLIER (printer absorbs, no expense) |
| `markReshipped` | `returnState = reshipping` | reship; SELF → replacement Expense |
| `reportDefect` / `markDefective` | status = delivered, `defectState = none` | admin records Expense category=DEFECTIVE manually |
