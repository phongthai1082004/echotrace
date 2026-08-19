"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "./admin-sidebar";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isStudio = path.startsWith("/admin/studio");
  return (
    <div className="min-h-screen">
      {!isStudio && <AdminSidebar />}
      <main
        className={
          isStudio ? "" : "ml-56 max-[1600px]:ml-45 max-[1280px]:ml-16 min-h-screen transition-all duration-200"
        }
      >
        {children}
      </main>
    </div>
  );
}
