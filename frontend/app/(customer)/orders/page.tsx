import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { apiFetch } from "@/lib/api.fetch";
import { getT } from "@/lib/i18n-server";
import type { OrderDTO } from "@/lib/order.dto";
import { OrdersClient } from "./_components/orders-client";

// khỏi waterfall session → token → fetch ở client.
export default async function OrdersPage() {
  const lng = (await cookies()).get("i18nextLng")?.value ?? "vi";
  const t = getT(lng);
  const session = await getServerSession(authOptions);
  const token = (session as any)?.accessToken as string | undefined;

  let initialOrders: OrderDTO[] | null | undefined;
  if (token) {
    try {
      initialOrders = (await apiFetch<OrderDTO[]>("/api/orders", token)) ?? [];
    } catch {
    }
  }

  return (
    <div className="min-h-screen pt-15">
      <div className="px-4 sm:px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-6 sm:py-10 max-[1600px]:py-8 max-[1440px]:py-6 border-b-[3px] border-[#222]">
        <h1
          className="text-2xl sm:text-3xl max-[1600px]:text-2xl max-[1440px]:text-xl max-[1280px]:text-lg font-bold"
          suppressHydrationWarning
        >
          {t("customer.orders.title")}
        </h1>
        <p className="text-sm mt-1 text-[#666]" suppressHydrationWarning>
          {t("customer.orders.subtitle")}
        </p>
      </div>

      <div className="px-4 sm:px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-6 sm:py-10 max-[1600px]:py-8 max-[1440px]:py-6">
        <p
          suppressHydrationWarning
          className="font-mono text-[9px] font-bold tracking-widest uppercase mb-5 text-[#666]"
        >
          {t("customer.orders.history")}
        </p>
        <OrdersClient initialOrders={initialOrders} />
      </div>
    </div>
  );
}
