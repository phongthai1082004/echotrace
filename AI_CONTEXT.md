# Project Context for AI

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 App Router, NextAuth v4, Tailwind CSS |
| Backend | Express 5 with TypeScript, tsx runner |
| Database | SQLite via Prisma 7 (BetterSQLite3 adapter) |
| Auth | Google OAuth + JWT (access + refresh tokens) |
| Fonts | Playfair Display (headings), Inter (body), JetBrains Mono (labels/meta) |
| Payments | PayOS (planned) |
| Media | Cloudinary (planned) |

## Project Structure

```
echotrace/
├── AI_CONTEXT.md              ← this file
├── package.json               ← workspace root ("pnpm --parallel dev")
├── pnpm-workspace.yaml
├── frontend/
│   ├── .env                   ← NEXT_PUBLIC_BACKEND_URL, NEXTAUTH_URL, GOOGLE_*
│   ├── next.config.ts
│   ├── app/
│   │   ├── layout.tsx         ← root layout (Providers wrapper)
│   │   ├── globals.css        ← font imports, CSS variables, heading resets
│   │   ├── page.tsx           ← redirect to /studio or landing
│   │   ├── api/auth/[...nextauth]/route.ts  ← NextAuth handler
│   │   ├── (public)/
│   │   │   ├── page.tsx       ← landing page
│   │   │   ├── auth/page.tsx  ← sign in / register / Google OAuth
│   │   │   └── layout.tsx
│   │   ├── (customer)/
│   │   │   ├── layout.tsx     ← passes session.user to Nav
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── checkout/page.tsx
│   │   │   └── studio/page.tsx
│   │   └── (admin)/
│   │       ├── layout.tsx
│   │       └── admin/
│   │           ├── orders/page.tsx     ← kanban admin
│   │           └── analytics/page.tsx
│   └── components/
│       ├── nav.tsx            ← main Nav (brand, links, user dropdown)
│       └── ui/                ← shadcn components
└── backend/
    ├── .env                   ← PORT, DATABASE_URL, JWT_*, FRONTEND_URL, GOOGLE_*
    ├── package.json           ← dev: "tsx watch src/server.ts"
    ├── tsconfig.json          ← moduleResolution: "NodeNext", .js extensions
    ├── prisma/
    │   └── schema.prisma      ← source of truth (see full schema below)
    ├── generated/prisma/      ← prisma generate output
    ├── data/echotrace.db      ← SQLite database
    ├── lib/
    │   └── prisma.ts          ← PrismaClient singleton
    └── src/
        ├── server.ts          ← Express 5 app entry
        ├── middleware/
        │   ├── api.response.ts
        │   ├── app.error.ts
        │   └── error.middleware.ts
        ├── routes/
        │   └── auth.routes.ts
        ├── controllers/
        │   └── auth.controller.ts
        └── services/
            └── auth.service.ts
```

## Design System

| Role | Font | Size |
|------|------|------|
| Page headings (h1) | Playfair Display | text-4xl (36px) |
| Section headings (h2) | Playfair Display | text-2xl (24px) |
| Card titles (h3) | Playfair Display | text-xl (20px) |
| Body text | Inter | text-sm (14px) |
| Labels, nav links, buttons | JetBrains Mono | text-[10px] uppercase |
| Metadata (coordinates, dates, IDs) | JetBrains Mono | text-[9px] uppercase |
| Brand name | Playfair Display | text-base (16px) |

- Sharp corners everywhere (no `rounded-*` except avatar circles)
- Hairline borders: `0.5px solid #dbdad6`
- Background: `#FDFBF7` (warm off-white)
- Text: `#1a1a1a` (near-black)
- Hover states usually invert to `bg-[#1a1a1a] text-[#FDFBF7]`

## Prisma Schema (SQLite via BetterSQLite3)

### User
- id: Int @id @default(autoincrement())
- email: String? @unique
- password: String?
- username: String? @unique
- name: String?
- avatar: String?
- phone, address, city: String?
- status: String? ("ACTIVE" | "BANNED")
- role: String @default("MEMBER")
- googleId: String? @unique
- Relations: Token[], Order[], UserImage[], TravelBook[], CouponUsage[]
- Indexes: [status], [role]

### Token (refresh tokens)
- id: Int @id @default(autoincrement())
- userId: Int
- refreshToken: String @unique
- isRevoked: Boolean @default(false)
- expiresAt: DateTime
- Relation: User
- Indexes: [userId], [expiresAt]

### UserImage
- id, userId, url, publicId, width?, height?, size?, bookId?
- createdAt: DateTime @default(now())
- Relation: User
- Indexes: [userId], [bookId]

### Order
- id: Int @id @default(autoincrement())
- orderCode: String? (human-readable "TC-0041")
- userId: Int
- totalAmount: Float
- depositInput: Float @default(0)
- paidAmount: Float @default(0)
- paymentMethod: String @default("FULL")
- payosOrderCode: Int? @unique
- status: String @default("PENDING_PAYMENT")
- name, phone, address, city, note: String?
- couponId: Int?
- discountAmount: Float @default(0)
- createdAt/updatedAt
- Relations: User, Coupon?, Transaction[], OrderItem[], OrderTimeline[]
- Indexes: [userId], [couponId], [status], [orderCode], [createdAt]

### Transaction (PayOS payments)
- id, orderId, payosOrderCode (unique), amount, paymentLinkId, reference?, status, transactionTime
- Relation: Order
- Indexes: [orderId], [status]

### OrderTimeline
- id, orderId, status, label, note?, date
- Relation: Order
- Index: [orderId]

### OrderItem
- id, orderId, travelBookId, quantity (default 1), price
- Relations: Order, TravelBook
- Indexes: [orderId], [travelBookId]

### TravelBook
- id: Int @id @default(autoincrement())
- userId: Int
- themeId: Int?
- title: String
- style, font: String
- cover: String @default("softcover")
- pages: Int @default(0)
- coverUrl: String?
- status: String @default("DRAFT")
- Relations: User, Theme?, BookPage[], OrderItem[]
- Indexes: [userId], [themeId], [status]

### Category
- id, name, code (unique), description?, thumbnailUrl?
- Relations: Theme[], SampleBook[]

### Theme
- id, name, code (unique), description, categoryId?, thumbnailUrl
- Category? relation; TravelBook[], DecorAsset[], SampleBook[]
- Index: [categoryId]

### SampleBook (pre-made template)
- id, name, description?, themeId?, categoryId?, style, font, cover ("softcover"/"hardcover"), pageCount, coverUrl?, price, isActive, createdAt
- Theme? + Category? relations; SampleBookPage[] pages
- Indexes: [themeId], [categoryId], [isActive]

### SampleBookPage
- id, sampleBookId, pageNumber, draftData (JSON pre-designed), thumbnailUrl?
- Relation: SampleBook
- Index: [sampleBookId]

### BookPage
- id, travelBookId, pageNumber, draftData (JSON string for Fabric.js canvas)
- Relations: TravelBook, PageDecor[]
- Index: [travelBookId]

### DecorAsset
- id, themeId?, type, name, url, publicId
- Relations: Theme?, PageDecor[]
- Indexes: [themeId], [type]

### PageDecor
- id, bookPageId, decorAssetId
- coordinateX, coordinateY: Float
- scale: Float @default(1)
- zIndex: Int @default(0)
- rotation: Float @default(0)
- width?, height?: Float?
- Relations: BookPage, DecorAsset
- Indexes: [bookPageId], [decorAssetId]

### Coupon
- id: Int @id @default(autoincrement())
- code: String @unique
- discountType: String ("PERCENTAGE" | "FIXED")
- discountValue: Float
- minOrderAmount: Float @default(0)
- maxDiscountAmount: Float?
- maxUsageCount: Int @default(0)
- usedCount: Int @default(0)
- isActive: Boolean @default(true)
- expiresAt: DateTime?
- createdAt
- Relations: Order[], CouponUsage[]
- Indexes: [isActive], [expiresAt]

### CouponUsage
- id, couponId, userId, usedAt
- Relations: Coupon, User
- @unique([couponId, userId])
- Index: [userId]

## Backend Architecture

### Standard Response Format (`ApiResponse`)

```typescript
class ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;           // response payload on success
  errors: any | null;       // details on error ("Requirement Error!")
  statusCode: number;       // mirrors HTTP status
  timestamp: string;        // ISO string

  static success<T>(data, message?, statusCode?)  → ApiResponse<T>
  static message(message, statusCode?)             → ApiResponse<null>
  static error(message, statusCode?, errors?)      → ApiResponse<null>
}
```

Success shape: `{ success: true, data: {...}, message: "Success", errors: null, statusCode: 200, timestamp: "..." }`
Error shape: `{ success: false, data: null, message: "error message", errors: "Requirement Error!", statusCode: 4xx, timestamp: "..." }`

### Error Handling Pattern

```typescript
// Throw AppError anywhere (service or controller):
throw new AppError("message", statusCode);

// Controller catches via Express asyncHandler → errorMiddleware
// errorMiddleware formats as ApiResponse.error() and sends response
```

### Express Server (`server.ts`)

```typescript
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use(errorMiddleware);
```

### API Routes (`/api/auth`)

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| POST | /google | auth.googleLogin | Google OAuth (idToken) |
| POST | /register | auth.register | Username + password |
| POST | /login | auth.login | Credential + password |
| POST | /logout | auth.logout | Revoke refresh tokens |

All routes wrapped with asyncHandler which calls `next(error)` on rejection.

### Auth Flow

**Register:** Frontend sends `{ username, password }` → backend creates user with auto-generated email (`username.suffix@echotrace.local`) → returns `{ user, accessToken, refreshToken }`.

**Login:** Frontend sends `{ username, password }` → backend matches by email OR username via `OR` query → returns `{ user, accessToken, refreshToken }`.

**Google:** Frontend gets `idToken` from Google OAuth → backend verifies via `google-auth-library` → finds or creates user → returns `{ user, accessToken, refreshToken }`.

**Logout:** Frontend sends `{ userId }` → backend marks all non-revoked tokens as revoked.

## Frontend Architecture

### NextAuth (`[...nextauth]/route.ts`)

- Providers: GoogleProvider (OAuth), CredentialsProvider (username/password)
- CredentialsProvider `authorize` calls `POST /api/auth/login` on backend
- GoogleProvider `signIn` callback calls `POST /api/auth/google` on backend
- Both use `data.data.user` (unwrapping ApiResponse envelope)
- JWT strategy; `accessToken` stored in token/session

### Nav Component (`components/nav.tsx`)

- Fixed top header, `h-15`, `bg-[#FDFBF7]/92 backdrop-blur-sm`
- Brand ("Travel Canvas") on left, nav links next to it
- Right side: user avatar + name (dropdown on hover with 150ms delay) or Sign In
- Mobile: hamburger with dropdown menu
- Avatar: image if available, else first letter of username/email in circle
- Dropdown: transparent 6px padding bridge to prevent gap flicker

### Page Route Groups

| Group | Path | Layout |
|-------|------|--------|
| (public) | /, /auth | PublicLayout |
| (customer) | /studio, /checkout | CustomerLayout (passes user to Nav) |
| (admin) | /admin/orders, /admin/analytics | AdminLayout |

## Important Conventions

1. **Backend imports use .js extension** (moduleResolution: "NodeNext")
2. **Frontend imports omit .js extension** (moduleResolution: "bundler")
3. **Prisma output** at `backend/generated/prisma/`; imported with `../../generated/prisma/client.js`
4. **Prisma v7 + SQLite** → Int autoincrement for IDs; String(user.id) needed for JWT
5. **Tailwind arbitrary values** for font sizes: text-[9px], text-[10px] for precise control
6. **No rounding** except avatar circles (rounded-full)
7. **Hairline borders** via inline `style={{ border: "0.5px solid #dbdad6" }}`

## Environment Variables

### Backend `.env`
```
PORT=4000
DATABASE_URL=file:./data/echotrace.db
GOOGLE_CLIENT_ID=...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
FRONTEND_URL=http://localhost:3000
```

### Frontend `.env`
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```
