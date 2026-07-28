"use client";

type Props = {
  children: React.ReactNode;
  noPadding?: boolean;
};

export function StudioLayout({ children, noPadding }: Props) {
  return (
    <div className={`h-screen flex flex-col ${noPadding ? "" : "pt-15"}`}>
      {children}
    </div>
  );
}
