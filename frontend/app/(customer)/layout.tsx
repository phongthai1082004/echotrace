import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth.config";
import { roleHome, withLang, langFromPath } from "@/lib/routing";
import { Nav } from "@/components/nav";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  // never hardcode a lang prefix here, it would clobber the user's language.
  if (!session) redirect("/auth");
  if (role === "admin") {
    const cookieLang = (await cookies()).get("i18nextLng")?.value;
    redirect(withLang(roleHome(role), langFromPath(`/${cookieLang}`)));
  }

  return (
    <>
      <Nav user={session.user} />
      <main className="flex-1">{children}</main>
    </>
  );
}
