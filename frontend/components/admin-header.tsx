interface Props {
  label: string;
  title: string;
  children?: React.ReactNode;
}

const labelCls = "font-mono text-[9px] font-bold tracking-widest uppercase";

export function AdminHeader({ label, title, children }: Props) {
  return (
    <div className="px-8 py-6 border-b-[3px] border-[#222] flex items-end justify-between gap-4">
      <div>
        <p className={`${labelCls} mb-1 text-[#666]`} suppressHydrationWarning>
          {label}
        </p>
        <h1 className="text-3xl font-bold" suppressHydrationWarning>
          {title}
        </h1>
      </div>
      {children}
    </div>
  );
}
