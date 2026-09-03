/**
 * @echotrace/shared Mock for Tests
 * Mocks shared types and utilities to avoid ESM loading issues
 */

export enum ErrorCode {
  AUTH_INVALID_GOOGLE_TOKEN = 'AUTH_INVALID_GOOGLE_TOKEN',
  AUTH_ACCOUNT_BANNED = 'AUTH_ACCOUNT_BANNED',
  INTERNAL = 'INTERNAL',
}

export enum TokenType {
  ACCESS = 'ACCESS',
  REFRESH = 'REFRESH',
}

export enum PaymentMethod {
  FULL_PAY = 'FULL_PAY',
  PAY_LATER = 'PAY_LATER',
  HALF = 'HALF',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface AuthResponseDTO {
  user: any;
  accessToken: string;
  refreshToken: string;
}

export interface CartDTO {
  id: string;
  userId: string;
  items: CartItem[];
  createdAt: Date;
}

export interface CartItem {
  id: string;
  cartId: string;
  sampleBookId: number;
  quantity: number;
  printOptionId: number;
}

export const composeCartItem = jest.fn();
export const computeCouponDiscount = jest.fn();
export const AuthMapper = { toAuthResponse: jest.fn() };
export const ProfileMapper = { 
  toDTO: jest.fn((data) => data),
};
export const UserMapper = {
  toDTOList: jest.fn((users) => users),
};
export const BookMapper = {
  toDTO: jest.fn((book) => book),
  toDTOList: jest.fn((books) => books),
};

export {};
