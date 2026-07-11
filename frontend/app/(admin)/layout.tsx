import { AdminSidebar } from "./admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AdminSidebar />
      <main className="ml-56 min-h-screen">{children}</main>
    </div>
  );
}
