# Middleware & Interceptors

## Global Middlewares (applied in `server.ts`)

| Middleware | Purpose |
|------------|---------|
| `helmet()` | Security headers (X-Content-Type-Options, HSTS, etc.) |
| `cors()` | Cross-origin resource sharing (allow `NEXTAUTH_URL`) |
| `express.json({ limit: '10mb' })` | JSON body parser with size limit |
| `i18next-http-middleware` | Language detection and i18n support |

## Route-Level Middlewares

### Authentication (`auth.middleware.ts`)

- `authMiddleware`: Verifies JWT access token from `Authorization: Bearer <token>`. Attaches `userId` and `userRole` to `req`.
- `adminMiddleware`: Wraps `authMiddleware` and checks `userRole === 'admin'`.

### Validation (`validator.middleware.ts`)

- `validateDto(dtoClass)`: Uses `class-validator` and `class-transformer` to validate request body. On failure, returns a `AppError` with `VALIDATION_FAILED` and formatted field errors.

### Custom Async Handler

Routes use `asyncHandler` to catch promise rejections and forward them to the error middleware.

## Error Middleware (`error.middleware.ts`)

Central error handler catches all errors, converts `AppError` instances to proper HTTP responses, and logs the error. Uses i18n for error messages.

## Request Flow

1. Request → helmet/cors/body-parser/i18n
2. Route-specific middlewares (auth, validation)
3. Controller → Service → Database
4. Response via `ApiResponse`
5. Error middleware catches any thrown errors