"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api.fetch";
import type { OrderDTO, OrderStatus } from "@/lib/order.dto";
import { ORDER_STATUSES } from "@/lib/order.dto";
import { STATUS_LABEL_KEY } from "@/lib/order-status";

const ACTIVE_STATUSES: OrderStatus[] = ["pending_payment", "paid", "partially_paid", "processing", "shipping"];

interface SupplierRow {
  id: number;
  name: string;
  contact: string;
  email: string;
  totalDebt: number;
  overdueDebt: number;
  monthDebt: number;
}

export function useDispatch() {
  const { t } = useTranslation();
  const token = (useSession().data as { accessToken?: string } | undefined)?.accessToken;
  const [orders, setOrders] = useState<OrderDTO[] | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderDTO | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [page, setPage] = useState(0);
  const perPage = 6;

  useEffect(() => {
    if (!token) return;
    apiFetch<OrderDTO[]>("/api/admin/orders", token)
      .then(setOrders)
      .catch(() => setOrders([]));
    // ponytail: debt NCC lấy thẳng từ API; activeOrders tự tính từ orders
    apiFetch<{ items: SupplierRow[] }>("/api/admin/suppliers?status=active&limit=100", token)
      .then((r) => setSuppliers(r.items ?? []))
      .catch(() => setSuppliers([]));
  }, [token]);

  const customerName = (o: OrderDTO) => o.name || o.user?.name || "";

  const list = orders ?? [];
  const enrichedSuppliers = suppliers.map((s) => ({
    ...s,
    activeOrders: list.filter((o) => o.supplierId === s.id && ACTIVE_STATUSES.includes(o.status)).length,
  }));

  const filteredOrders = list
    .filter((o) => !selectedSupplierId || o.supplierId === selectedSupplierId)
    .filter((o) => {
      const q = search.toLowerCase();
      return (
        !q ||
        (o.orderCode ?? "").toLowerCase().includes(q) ||
        customerName(o).toLowerCase().includes(q) ||
        (o.orderItems ?? []).some((i) => i.title.toLowerCase().includes(q))
      );
    })
    .filter((o) => statusFilter === "all" || o.status === statusFilter);

  const totalPages = Math.ceil(filteredOrders.length / perPage);
  const paged = filteredOrders.slice(page * perPage, (page + 1) * perPage);
  const selectedSupplier = selectedSupplierId ? enrichedSuppliers.find((s) => s.id === selectedSupplierId) : null;

  const counts = (["all", ...ORDER_STATUSES] as const).map((s) => ({
    key: s,
    count: s === "all" ? list.length : list.filter((o) => o.status === s).length,
  }));

  const updateStatus = useCallback(
    async (id: number, status: OrderStatus) => {
      const prev = orders;
      setOrders((cur) => (cur ?? []).map((o) => (o.id === id ? { ...o, status } : o)));
      setSelectedOrder((p) => (p?.id === id ? { ...p, status } : p));
      try {
        await apiFetch(`/api/admin/orders/${id}`, token, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
      } catch {
        setOrders(prev ?? []);
        setSelectedOrder((p) => (p && prev ? (prev.find((o) => o.id === p.id) ?? p) : p));
      }
    },
    [orders, token],
  );

  const processEvent = useCallback(
    async (id: number, type: string, payload?: any) => {
      try {
        await apiFetch(`/api/admin/orders/${id}/events`, token, {
          method: "POST",
          body: JSON.stringify({ type, ...(payload ?? {}) }),
        });
      } catch (e) {
        console.error(e);
      } finally {
        const r = await apiFetch<OrderDTO[]>("/api/admin/orders", token).catch(() => null);
        if (r) {
          setOrders(r);
          setSelectedOrder((p) => (p ? r.find((o) => o.id === id) ?? p : p));
        }
      }
    },
    [token],
  );

  const selectSupplier = (id: number | null) => {
    setSelectedSupplierId(id);
    setPage(0);
  };

  const statusLabel = (key: string) =>
    key === "all" ? t("admin.dispatch.filterAll") : t(STATUS_LABEL_KEY(key));

  return {
    t,
    orders: list,
    loading: orders === null,
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
    processEvent,
    statusLabel,
    customerName,
    suppliers: enrichedSuppliers,
  };
}
