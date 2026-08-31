# Error Handling Mechanism

## Custom Error Class: `AppError`

Defined in `backend/src/middleware/app.error.ts`. Extends `Error` and adds:

- `errorCode`: string (e.g., `'AUTH_TOKEN_EXPIRED'`)
- `statusCode`: number (HTTP status)
- `details`: optional additional data

All errors thrown in the application should be instances of `AppError`.

## Error Codes

Defined in `shared/constants/error-codes.ts`. Categories include:

- **Auth**: `AUTH_MISSING_TOKEN`, `AUTH_TOKEN_EXPIRED`, `AUTH_INVALID_CREDENTIALS`, etc.
- **User**: `USER_NOT_FOUND`, `USER_PHONE_EXISTS`, etc.
- **Book**: `BOOK_NOT_FOUND`, `BOOK_FORBIDDEN`, etc.
- **General**: `VALIDATION_FAILED`, `NOT_FOUND`, `INTERNAL`

## Throwing Errors

Services and controllers throw `AppError` with appropriate code:

```ts
throw new AppError(ErrorCode.BOOK_NOT_FOUND, 404);
throw new AppError(ErrorCode.VALIDATION_FAILED, 400, { field: 'email' });
```

## Global Exception Filter

`error.middleware.ts` catches all errors:

- If `error instanceof AppError` → uses its `statusCode` and `errorCode`.
- Otherwise → defaults to 500 with `INTERNAL`.
- The message is localized via i18n (lookup `errors.${errorCode}`).
- Logs the error stack to console.
- Returns `ApiResponse.error(message, statusCode, details)`.

## Validation Errors

`validateDto` middleware catches validation failures and throws `AppError` with `ErrorCode.VALIDATION_FAILED` and a `details` object mapping field names to error messages (localized via i18n).