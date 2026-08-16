import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth.config";
import { roleHome } from "@/lib/routing";
import { Nav } from "@/components/nav";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session) redirect(roleHome());
  if (role === "admin") redirect(roleHome(role));

  return (
    <>
      <Nav user={session.user} />
      <main className="flex-1">{children}</main>
    </>
  );
}