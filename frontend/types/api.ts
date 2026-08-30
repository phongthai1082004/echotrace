/**
 * Shared API DTOs from backend
 * These match backend/src/features/DTO files
 */

// Auth
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  phone?: string | null;
  role: "user" | "admin";
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse extends LoginResponse {}

export interface OTPResponse {
  success: boolean;
  message: string;
}

export interface GoogleAuthResponse extends LoginResponse {}

// Cart
export interface CartItemDto {
  id: string;
  productId: string;
  quantity: number;
  price: number;
}

export interface CartDto {
  id: string;
  userId: string;
  items: CartItemDto[];
  total: number;
}

// Books
export interface BookDto {
  id: string;
  title: string;
  author: string;
  description?: string;
  price: number;
  cover?: string | null;
  createdAt: string;
}

// Orders
export interface OrderItemDto {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
}

export interface OrderDto {
  id: string;
  userId: string;
  items: OrderItemDto[];
  total: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

// Explore / Sample Books
export interface SampleBookDto {
  id: string;
  title: string;
  author: string;
  cover?: string | null;
  createdAt: string;
}

export interface ExplorePaginationDto {
  items: SampleBookDto[];
  nextCursor?: string | null;
  hasMore: boolean;
}

// Generic API Response
export interface ApiResponse<T> {
  data: T;
  message?: string;
  errors?: Record<string, string[] | string>;
}

// Error Response
export interface ApiErrorResponse {
  message: string;
  errors?: Record<string, string[] | string>;
  code?: string;
  statusCode?: number;
}
