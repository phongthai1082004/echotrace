export function OrderMilestone({ label, date, done, isLast }: {
  label: string;
  date?: string;
  done: boolean;
  isLast?: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <div
        className="shrink-0 w-2.5 h-2.5 rounded-full mt-0.5"
        style={{
          background: done ? "#0D1F1A" : "#FDFBF7",
          border: `0.5px solid ${done ? "#0D1F1A" : "#dbdad6"}`,
          position: "relative", zIndex: 1,
        }}
      />
      <div>
        <p className="font-['Inter'] text-[13px]" style={{ color: done ? "#1a1a1a" : "rgba(26,26,26,0.35)" }}>
          {label}
        </p>
        {date && (
          <p className="font-['JetBrains_Mono'] text-[9px] mt-0.5" style={{ color: "rgba(26,26,26,0.35)" }}>
            {date}
          </p>
        )}
      </div>
    </div>
  );
}
