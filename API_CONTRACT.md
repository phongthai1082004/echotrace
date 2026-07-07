# Travel Canvas — API Contract

Base URL: `/api/v1`

All endpoints return JSON.  
Authentication uses `Authorization: Bearer <jwt>` header.

---

## 1. Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register with email + password | ❌ |
| POST | `/auth/login` | Login with email + password | ❌ |
| POST | `/auth/google` | Google OAuth sign-in | ❌ |
| POST | `/auth/refresh` | Refresh access token | ✅ |
| GET | `/auth/me` | Get current user profile | ✅ |

### POST /auth/register

```json
{
  "email": "user@example.com",
  "password": "securePass123",
  "name": "Amara Osei"
}
```

**Response 201**
```json
{
  "user": { "id": "u-001", "email": "user@example.com", "name": "Amara Osei", "role": "MEMBER" },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

### POST /auth/login

```json
{
  "email": "user@example.com",
  "password": "securePass123"
}
```

**Response 200** — same shape as register.

### POST /auth/google

```json
{
  "idToken": "google-id-token-here"
}
```

**Response 200** — same shape.

### POST /auth/refresh

**Header:** `Authorization: Bearer <refreshToken>`

**Response 200**
```json
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

### GET /auth/me

**Response 200**
```json
{ "id": "u-001", "email": "user@example.com", "name": "Amara Osei", "role": "MEMBER", "avatar": null, "createdAt": "2024-07-01T00:00:00Z" }
```

---

## 2. Themes & Templates

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/themes` | List available themes | ❌ |
| GET | `/themes/:id` | Get theme detail + layout templates | ❌ |

### GET /themes

**Response 200**
```json
[
  {
    "id": "t-001",
    "name": "Wanderlust",
    "description": "Bold serif typography with full-bleed imagery",
    "thumbnail": "https://res.cloudinary.com/...",
    "fonts": ["Playfair Display", "Inter", "JetBrains Mono"],
    "templateCount": 6
  }
]
```

### GET /themes/:id

**Response 200**
```json
{
  "id": "t-001",
  "name": "Wanderlust",
  "fonts": ["Playfair Display", "Inter", "JetBrains Mono"],
  "colorPalette": ["#1a1a1a", "#FDFBF7", "#dbdad6"],
  "templates": [
    {
      "id": "lay-001",
      "name": "Full Bleed",
      "thumbnail": "...",
      "schema": { "type": "object", "properties": {} }
    }
  ]
}
```

---

## 3. User Image Gallery

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/uploads/image` | Upload an image (multipart) | ✅ |
| GET | `/uploads/images` | List user's uploaded images | ✅ |
| DELETE | `/uploads/images/:id` | Delete an image | ✅ |

### POST /uploads/image

**Body:** `multipart/form-data` with field `file`.

**Response 201**
```json
{
  "id": "img-001",
  "url": "https://res.cloudinary.com/...",
  "width": 1920,
  "height": 1080,
  "size": 245000,
  "createdAt": "2024-07-01T00:00:00Z"
}
```

### GET /uploads/images

**Query:** `?bookId=book-001` (optional — filter by book).

**Response 200**
```json
[
  { "id": "img-001", "url": "...", "width": 1920, "height": 1080, "createdAt": "..." }
]
```

### DELETE /uploads/images/:id

**Response 204** — no body.

---

## 4. Travel Book (Draft / Canvas)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/books` | Create a new book draft | ✅ |
| GET | `/books` | List user's books | ✅ |
| GET | `/books/:id` | Get book detail + pages | ✅ |
| PATCH | `/books/:id` | Update book metadata (title, theme) | ✅ |
| PATCH | `/books/:id/pages` | Save full canvas state (JSON) | ✅ |
| POST | `/books/:id/submit` | Submit draft → completed order | ✅ |
| DELETE | `/books/:id` | Delete a draft | ✅ |

### POST /books

```json
{
  "title": "West Africa Circuit",
  "themeId": "t-001",
  "templateId": "lay-001"
}
```

**Response 201**
```json
{
  "id": "bk-001",
  "userId": "u-001",
  "title": "West Africa Circuit",
  "status": "DRAFT",
  "themeId": "t-001",
  "pageCount": 1,
  "createdAt": "2024-07-01T00:00:00Z",
  "updatedAt": "2024-07-01T00:00:00Z"
}
```

### GET /books

**Query:** `?status=DRAFT|COMPLETED`

**Response 200**
```json
[
  {
    "id": "bk-001",
    "title": "West Africa Circuit",
    "status": "DRAFT",
    "coverUrl": null,
    "pageCount": 3,
    "updatedAt": "2024-07-01T00:00:00Z"
  }
]
```

### GET /books/:id

**Response 200**
```json
{
  "id": "bk-001",
  "userId": "u-001",
  "title": "West Africa Circuit",
  "status": "DRAFT",
  "themeId": "t-001",
  "pages": [
    {
      "pageNumber": 1,
      "elements": [
        {
          "id": "el-1",
          "type": "text",
          "x": 60, "y": 80, "width": 340, "height": 120,
          "content": "West Africa Circuit",
          "fontSize": 48,
          "fontFamily": "Playfair Display",
          "zIndex": 1
        },
        {
          "id": "el-2",
          "type": "image",
          "x": 420, "y": 40, "width": 360, "height": 480,
          "imageUrl": "https://res.cloudinary.com/...",
          "zIndex": 2
        }
      ]
    }
  ],
  "createdAt": "2024-07-01T00:00:00Z",
  "updatedAt": "2024-07-01T00:00:00Z"
}
```

### PATCH /books/:id

```json
{ "title": "Updated Title", "themeId": "t-002" }
```

**Response 200** — full book object.

### PATCH /books/:id/pages

```json
{
  "pages": [
    {
      "pageNumber": 1,
      "elements": [ /* array of canvas elements */ ]
    }
  ]
}
```

**Response 200** — `{ "ok": true }`.  
Auto-saves every 30s client-side; manual save on explicit action.

### POST /books/:id/submit

**Response 200**
```json
{
  "id": "bk-001",
  "status": "COMPLETED",
  "orderId": "ord-001",
  "message": "Design locked. Proceed to checkout."
}
```

### DELETE /books/:id

**Response 204** — only allowed when `status === DRAFT`.

---

## 5. Orders & Checkout

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/orders` | Create order from a completed book | ✅ |
| GET | `/orders` | List user's orders | ✅ |
| GET | `/orders/:id` | Get order detail + timeline | ✅ |
| POST | `/orders/:id/pay` | Initiate payment (returns PayOS QR) | ✅ |
| POST | `/orders/:id/cancel` | Cancel order (conditional) | ✅ |

### POST /orders

```json
{
  "bookId": "bk-001",
  "paymentMethod": "DEPOSIT",
  "shippingAddress": {
    "name": "Amara Osei",
    "phone": "+84 91 234 5678",
    "address": "12 Nguyễn Huệ",
    "city": "Hà Nội"
  },
  "note": "Gift wrap requested"
}
```

`paymentMethod`: `FULL` | `DEPOSIT`

**Response 201**
```json
{
  "id": "ord-001",
  "bookId": "bk-001",
  "userId": "u-001",
  "status": "PENDING_PAYMENT",
  "paymentMethod": "DEPOSIT",
  "totalAmount": 2400000,
  "depositAmount": 480000,
  "paidAmount": 0,
  "shippingAddress": { "...": "..." },
  "createdAt": "2024-07-01T00:00:00Z"
}
```

**Pricing formula:**
- Softcover: `pages × 50,000 + 200,000`
- Hardcover: `pages × 62,500 + 280,000`
- Deposit: 20% of total

### GET /orders

**Response 200**
```json
[
  {
    "id": "ord-001",
    "status": "PENDING_PAYMENT",
    "totalAmount": 2400000,
    "paidAmount": 0,
    "balance": 2400000,
    "bookTitle": "West Africa Circuit",
    "pageCount": 48,
    "coverUrl": "...",
    "createdAt": "2024-07-01T00:00:00Z"
  }
]
```

### GET /orders/:id

**Response 200**
```json
{
  "id": "ord-001",
  "status": "PRINTING",
  "paymentMethod": "DEPOSIT",
  "totalAmount": 2400000,
  "depositAmount": 480000,
  "paidAmount": 480000,
  "balance": 1920000,
  "shippingAddress": { "...": "..." },
  "book": { "id": "bk-001", "title": "...", "pages": [...] },
  "timeline": [
    { "status": "PENDING_PAYMENT", "label": "Order placed",   "date": "2024-07-01", "done": true },
    { "status": "PAID",            "label": "Payment confirmed","date": "2024-07-01", "done": true },
    { "status": "PROCESSING",      "label": "Processing",     "date": "2024-07-02", "done": true },
    { "status": "PRINTING",        "label": "Printing",       "date": "2024-07-05", "done": true },
    { "status": "QUALITY_CHECK",   "label": "Quality check",  "date": "",            "done": false },
    { "status": "SHIPPED",         "label": "Shipped",        "date": "",            "done": false },
    { "status": "DELIVERED",       "label": "Delivered",      "date": "",            "done": false }
  ],
  "createdAt": "2024-07-01T00:00:00Z"
}
```

**Order statuses:** `PENDING_PAYMENT` → `PAID` / `DEPOSITED` → `PROCESSING` → `PRINTING` → `QUALITY_CHECK` → `SHIPPED` → `DELIVERED`

### POST /orders/:id/pay

**Response 200**
```json
{
  "payosOrderCode": 123456,
  "qrCodeUrl": "https://payos.io/qr/...",
  "amount": 480000,
  "expiresAt": "2024-07-01T00:15:00Z"
}
```

### POST /orders/:id/cancel

**Response 200**
```json
{ "ok": true, "status": "CANCELLED" }
```

Only available when `status` is `PENDING_PAYMENT` or `PROCESSING`.

---

## 6. PayOS Webhook

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/payment/webhook` | PayOS webhook receiver | 🔐 Webhook secret |

### POST /payment/webhook

```json
{
  "orderCode": 123456,
  "amount": 480000,
  "description": "TC-0041 deposit",
  "reference": "payos-ref-001",
  "status": "PAID"
}
```

**Response 200**
```json
{ "ok": true }
```

The server updates the order's `paidAmount`, then if `paidAmount >= totalAmount` → `PAID`, else → `DEPOSITED`.  
On `PAID` or `DEPOSITED`, pushes a new timeline entry.

---

## 7. Admin — User Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/users` | List all users | Admin |
| GET | `/admin/users/:id` | Get user detail + activity | Admin |
| PATCH | `/admin/users/:id/role` | Change user role | Admin |

### GET /admin/users

**Query:** `?search=&role=&page=1&limit=20`

**Response 200**
```json
{
  "users": [
    {
      "id": "u-001",
      "name": "Amara Osei",
      "email": "amara@gmail.com",
      "role": "MEMBER",
      "totalOrders": 4,
      "totalSpent": 9600000,
      "joinedAt": "2024-01-12T00:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

### PATCH /admin/users/:id/role

```json
{ "role": "ADMIN" }
```

**Response 200** — updated user object.

---

## 8. Admin — Order Management (Kanban)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/orders` | List all orders (with filters) | Admin |
| PATCH | `/admin/orders/:id/status` | Advance order status | Admin |
| PATCH | `/admin/orders/reorder` | Reorder kanban cards | Admin |

### GET /admin/orders

**Query:** `?status=PROCESSING&sort=date&search=`

**Response 200**
```json
{
  "orders": [
    {
      "id": "ord-001",
      "status": "PROCESSING",
      "customer": { "id": "u-001", "name": "Amara Osei", "email": "..." },
      "book": { "title": "West Africa Circuit", "pages": 48 },
      "amount": 2400000,
      "paymentMethod": "DEPOSIT",
      "paidAmount": 480000,
      "balance": 1920000,
      "date": "2024-07-01",
      "timeline": [ "..."]
    }
  ],
  "counts": {
    "PENDING_PAYMENT": 2,
    "PROCESSING": 3,
    "PRINTING": 1,
    "QUALITY_CHECK": 1,
    "SHIPPED": 2,
    "DELIVERED": 5,
    "CANCELLED": 1
  }
}
```

### PATCH /admin/orders/:id/status

```json
{ "status": "PRINTING", "note": "Production started" }
```

**Response 200** — updated order + new timeline entry.

### PATCH /admin/orders/reorder

```json
{
  "status": "PROCESSING",
  "orderIds": ["ord-003", "ord-001", "ord-005"]
}
```

**Response 200** — `{ "ok": true }`

---

## 9. Admin — Analytics

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/analytics/revenue` | Revenue overview | Admin |
| GET | `/admin/analytics/export` | Export CSV/XLSX | Admin |

### GET /admin/analytics/revenue

**Query:** `?from=2024-01-01&to=2024-12-31`

**Response 200**
```json
{
  "summary": {
    "grossRevenue": 184000000,
    "fullPayments": 120000000,
    "deposits": 64000000,
    "outstandingBalance": 32000000,
    "totalOrders": 47,
    "cancelledOrders": 3
  },
  "monthly": [
    { "month": "2024-01", "revenue": 18400000, "orders": 7 }
  ],
  "paymentMethodBreakdown": {
    "full": { "count": 30, "total": 120000000 },
    "deposit": { "count": 17, "total": 64000000 }
  }
}
```

### GET /admin/analytics/export

**Query:** `?type=orders|revenue&format=csv|xlsx`

**Response 200** — file download (`Content-Disposition: attachment`).

---

## 10. Error Format

All errors follow this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [
      { "field": "email", "message": "must be a valid email" }
    ]
  }
}
```

**Common codes:** `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `PAYMENT_REQUIRED`.

---

## Status Code Summary

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | Deleted |
| 400 | Bad request / validation |
| 401 | Unauthenticated |
| 403 | Forbidden (wrong role) |
| 404 | Not found |
| 409 | Conflict (e.g. can't cancel) |
| 422 | Unprocessable (e.g. pay webhook failed) |
| 500 | Server error |

---

## Auth Flow

```
Register/Login ──→ JWT issued (access: 15m, refresh: 7d)
                        │
                   ┌────┴────┐
                   │         │
            Access Token  Refresh Token
            (Bearer)      (stored httpOnly cookie or body)
                   │         │
              ┌────┘         └────┐
              ▼                   ▼
         API requests        POST /auth/refresh
         (verify JWT)        → new access token
```

**JWT payload:**
```json
{
  "sub": "u-001",
  "role": "MEMBER",
  "iat": 1700000000,
  "exp": 1700000900
}
```
