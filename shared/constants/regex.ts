// Shared validation regexes (used by backend class-validator DTOs + controllers).
export const NAME_NO_DIGITS_REGEX = /^[^\d]+$/;
export const NO_DIGITS_REGEX = /^[^\d]*$/;
export const PHONE_REGEX = /^\d{10,11}$/;
export const DIGITS_ONLY_REGEX = /^\d*$/;
export const COUPON_CODE_REGEX = /^[A-Za-z0-9_-]+$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
