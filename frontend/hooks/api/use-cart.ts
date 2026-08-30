"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api.fetch";
import { useErrorHandler } from "@/lib/error-context";
import { useSession } from "next-auth/react";

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
}

// Query key factory
const cartKeys = {
  all: ["cart"],
  detail: () => [...cartKeys.all, "detail"],
};

// Fetch cart
export function useCart() {
  const { data: session } = useSession();
  const { addError } = useErrorHandler();

  return useQuery({
    queryKey: cartKeys.detail(),
    queryFn: async () => {
      try {
        return await apiFetch<Cart>("/api/cart");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load cart";
        addError(message, "error");
        throw error;
      }
    },
    enabled: !!session, // Only fetch when user is authenticated
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

// Add item to cart
export function useAddToCart() {
  const queryClient = useQueryClient();
  const { addError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      return await apiFetch<Cart>("/api/cart/add", undefined, {
        method: "POST",
        body: JSON.stringify({ productId, quantity }),
      });
    },
    onSuccess: (newCart) => {
      // Invalidate and refetch
      queryClient.setQueryData(cartKeys.detail(), newCart);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to add item to cart";
      addError(message, "error");
    },
  });
}

// Remove item from cart
export function useRemoveFromCart() {
  const queryClient = useQueryClient();
  const { addError } = useErrorHandler();

  return useMutation({
    mutationFn: async (itemId: string) => {
      return await apiFetch<Cart>("/api/cart/remove", undefined, {
        method: "DELETE",
        body: JSON.stringify({ itemId }),
      });
    },
    onSuccess: (newCart) => {
      queryClient.setQueryData(cartKeys.detail(), newCart);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to remove item from cart";
      addError(message, "error");
    },
  });
}

// Update cart item quantity
export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  const { addError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      return await apiFetch<Cart>("/api/cart/update", undefined, {
        method: "PUT",
        body: JSON.stringify({ itemId, quantity }),
      });
    },
    onSuccess: (newCart) => {
      queryClient.setQueryData(cartKeys.detail(), newCart);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to update cart";
      addError(message, "error");
    },
  });
}

// Clear cart
export function useClearCart() {
  const queryClient = useQueryClient();
  const { addError } = useErrorHandler();

  return useMutation({
    mutationFn: async () => {
      return await apiFetch<Cart>("/api/cart/clear", undefined, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.setQueryData(cartKeys.detail(), { items: [], total: 0 });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to clear cart";
      addError(message, "error");
    },
  });
}
