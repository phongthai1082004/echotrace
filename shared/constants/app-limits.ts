// App-wide limits used by both backend validation and rate limiting.
export const PASSWORD_MIN_LENGTH = 6;
export const COUPON_CODE_MIN_LENGTH = 3;
export const COUPON_CODE_MAX_LENGTH = 20;

export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const AUTH_RATE_LIMIT_MAX = 10;
