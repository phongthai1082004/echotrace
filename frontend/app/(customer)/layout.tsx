// app/(customer)/layout.tsx
import { getServerSession } from "next-auth";
import { Nav } from "@/components/nav";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  return (
    <>
      <Nav user={session?.user} />
      <main className="flex-1">{children}</main>
    </>
  );
}