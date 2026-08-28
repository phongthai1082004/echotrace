"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { useDebounce } from "@/hooks";
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
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [page, setPage] = useState(0);
  const perPage = 6;

  useEffect(() => {
    if (!token) return;
    apiFetch<OrderDTO[]>("/api/admin/orders", token)
      .then(setOrders)
      .catch(() => setOrders([]));
    // ponytail: supplier list là nhỏ (admin config); cap 1000 tránh truncate silent,
    // không cần phân trang UI ở scale này.
    apiFetch<{ items: SupplierRow[] }>("/api/admin/suppliers?status=active&limit=1000", token)
      .then((r) => setSuppliers(r.items ?? []))
      .catch(() => setSuppliers([]));
  }, [token]);

  const customerName = (o: OrderDTO) => o.name || o.user?.name || "";

  const list = orders ?? [];
  const enrichedSuppliers = useMemo(
    () =>
      suppliers.map((s) => ({
        ...s,
        activeOrders: list.filter((o) => o.supplierId === s.id && ACTIVE_STATUSES.includes(o.status)).length,
      })),
    [suppliers, list],
  );

  const filteredOrders = list
    .filter((o) => !selectedSupplierId || o.supplierId === selectedSupplierId)
    .filter((o) => {
      const q = debouncedSearch.toLowerCase();
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

  const patchOrder = useCallback((updated: OrderDTO) => {
    setOrders((cur) => (cur ? cur.map((o) => (o.id === updated.id ? updated : o)) : [updated]));
    setSelectedOrder((p) => (p?.id === updated.id ? updated : p));
  }, []);

  // ponytail: chỉ fetch 1 đơn thay vì whole list (B1) — patch vào local state.
  const refreshOrder = useCallback(
    async (id: number) => {
      const o = await apiFetch<OrderDTO>(`/api/admin/orders/${id}`, token).catch(() => null);
      if (o) patchOrder(o);
    },
    [token, patchOrder],
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
        await refreshOrder(id);
      }
    },
    [token, refreshOrder],
  );

  const selectSupplier = (id: number | null) => {
    setSelectedSupplierId(id);
    setPage(0);
  };

  const approveReturn = useCallback(
    async (id: number, body: { fault: "self" | "supplier" }) => {
      try {
        await apiFetch(`/api/admin/orders/${id}/return-approve`, token, {
          method: "POST",
          body: JSON.stringify(body),
        });
      } catch (e) {
        console.error(e);
      } finally {
        await refreshOrder(id);
      }
    },
    [token, refreshOrder],
  );

  const markReshipped = useCallback(
    async (id: number) => {
      try {
        await apiFetch(`/api/admin/orders/${id}/return-reshipped`, token, { method: "POST" });
      } catch (e) {
        console.error(e);
      } finally {
        await refreshOrder(id);
      }
    },
    [token, refreshOrder],
  );

  // ponytail: hàng lỗi chỉ là state; mark = reported, resolve = PATCH defectState.
  const markDefective = useCallback(
    async (id: number) => {
      try {
        await apiFetch(`/api/admin/orders/${id}/mark-defective`, token, { method: "POST" });
      } catch (e) {
        console.error(e);
      } finally {
        await refreshOrder(id);
      }
    },
    [token, refreshOrder],
  );

  const resolveDefect = useCallback(
    async (id: number) => {
      try {
        await apiFetch(`/api/admin/orders/${id}`, token, {
          method: "PATCH",
          body: JSON.stringify({ defectState: "resolved" }),
        });
      } catch (e) {
        console.error(e);
      } finally {
        await refreshOrder(id);
      }
    },
    [token, refreshOrder],
  );

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
    approveReturn,
    markReshipped,
    markDefective,
    resolveDefect,
    statusLabel,
    customerName,
    suppliers: enrichedSuppliers,
  };
}
