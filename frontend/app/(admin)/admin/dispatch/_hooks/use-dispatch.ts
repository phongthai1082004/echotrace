"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Order, OrderStatus } from "@/lib/mock-dispatch";
import { allOrders, dispatchSuppliers, unassignedOrders } from "@/lib/mock-dispatch";

export function useDispatch() {
  const { t } = useTranslation();
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [page, setPage] = useState(0);
  const perPage = 6;

  const filteredOrders = allOrders
    .filter((o) => !selectedSupplierId || o.supplierId === selectedSupplierId)
    .filter((o) => {
      const q = search.toLowerCase();
      return (
        !q ||
        o.id.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q) ||
        o.product.toLowerCase().includes(q)
      );
    })
    .filter((o) => statusFilter === "all" || o.status === statusFilter);

  const totalPages = Math.ceil(filteredOrders.length / perPage);
  const paged = filteredOrders.slice(page * perPage, (page + 1) * perPage);
  const selectedSupplier = selectedSupplierId ? dispatchSuppliers.find((s) => s.id === selectedSupplierId) : null;

  const counts = (["all", "pending", "printing", "quality-check", "shipped"] as const).map((s) => ({
    key: s,
    count: s === "all" ? allOrders.length : allOrders.filter((o) => o.status === s).length,
  }));

  const updateStatus = (id: string, status: OrderStatus) => {
    const o = allOrders.find((o) => o.id === id);
    if (o) o.status = status;
    setSelectedOrder((prev) => (prev?.id === id ? { ...prev, status } : prev));
  };

  const selectSupplier = (id: number | null) => {
    setSelectedSupplierId(id);
    setPage(0);
  };

  const statusLabel = (key: string) =>
    key === "all"
      ? t("admin.dispatch.filterAll")
      : t(
          `admin.dispatch.filter${key.replace(/-./g, (m) => m[1].toUpperCase()).replace(/^./, (m) => m.toUpperCase())}`,
        );

  return {
    t,
    selectedSupplierId,
    selectSupplier,
    selectedSupplier,
    selectedOrder,
    setSelectedOrder,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    totalPages,
    paged,
    counts,
    updateStatus,
    statusLabel,
    unassignedCount: unassignedOrders.length,
  };
}
