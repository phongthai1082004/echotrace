"use client";

export function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col pt-15">
      {children}
    </div>
  );
}
