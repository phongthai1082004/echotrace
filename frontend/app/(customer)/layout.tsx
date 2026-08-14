import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/en");
  const role = (session.user as { role?: string } | undefined)?.role;
  if (role === "admin") redirect("/admin/analytics");

  return (
    <>
      <Nav user={session.user} />
      <main className="flex-1">{children}</main>
    </>
  );
}