import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AdminLayoutClient } from "./admin-layout-client";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/en");
  const role = (session.user as { role?: string } | undefined)?.role;
  if (role !== "admin") redirect("/explore");

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}