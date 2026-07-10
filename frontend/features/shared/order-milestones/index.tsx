export function OrderMilestone({ label, date, done, isLast }: {
  label: string;
  date?: string;
  done: boolean;
  isLast?: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="shrink-0 w-2.5 h-2.5 rounded-full mt-0.5"
        style={{
          background: done ? "#222" : "#FFF7D6",
          border: "3px solid #222",
          position: "relative", zIndex: 1,
        }}
      />
      <div>
        <p className={`text-[13px] font-bold ${done ? "text-[#222]" : "text-[#999]"}`}>
          {label}
        </p>
        {date && (
          <p className="font-mono text-[9px] font-bold mt-0.5 text-[#999]">
            {date}
          </p>
        )}
      </div>
    </div>
  );
}
