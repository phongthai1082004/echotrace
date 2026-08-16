import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth.config";
import { roleHome } from "@/lib/routing";
import { AdminLayoutClient } from "./admin-layout-client";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session) redirect(roleHome());
  if (role !== "admin") redirect(roleHome(role));

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}