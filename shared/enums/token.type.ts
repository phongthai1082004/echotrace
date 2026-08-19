export const TokenType = {
  SESSION: 'session',
  OTP: 'otp',
} as const;

export type TokenType = typeof TokenType[keyof typeof TokenType];