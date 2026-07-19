import { AdminSidebar } from "./admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AdminSidebar />
      <main className="ml-56 max-[1600px]:ml-45 max-[1280px]:ml-16 min-h-screen transition-all duration-200">{children}</main>
    </div>
  );
}
