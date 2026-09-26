import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth.config";
import { roleHome, withLang, langFromPath } from "@/lib/routing";
import { AdminLayoutClient } from "./admin-layout-client";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session) redirect("/auth");
  if (role !== "admin") {
    const cookieLang = (await cookies()).get("i18nextLng")?.value;
    redirect(withLang(roleHome(role), langFromPath(`/${cookieLang}`)));
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
