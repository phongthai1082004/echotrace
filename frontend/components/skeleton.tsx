type SkeletonProps = { className?: string };

function Pulse({ className = "" }: SkeletonProps) {
  return <div className={`animate-pulse bg-[#e8e6e0]/50 rounded ${className}`} />;
}

export function SkeletonRow({ cells }: { cells: string[] }) {
  return (
    <div
      className="grid border-b-[2px] border-[#222]/10 items-center py-3"
      style={{ gridTemplateColumns: cells.join(" ") }}
    >
      {cells.map((_, i) => (
        <Pulse key={i} className="h-3 mx-2" />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="p-6 rounded-xl border-2 border-[#222]/10">
      <Pulse className="h-3 w-24 mb-3" />
      <Pulse className="h-7 w-32 mb-2" />
      <Pulse className="h-3 w-20" />
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols }: { rows?: number; cols: string[] }) {
  return (
    <>
      <div className="grid border-b-[3px] border-[#222]" style={{ gridTemplateColumns: cols.join(" ") }}>
        {cols.map((_, i) => (
          <Pulse key={i} className="h-3 mx-2 my-3" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cells={cols} />
      ))}
    </>
  );
}
export function SkeletonGrid({ count = 12, aspect = "square" }: { count?: number;
  aspect?: string }) {
  const aspectClass = aspect === "portrait" ? "aspect-[3/4]" : aspect === "landscape" ? "aspect-[4/3]" : "aspect-square";
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border-2 border-[#222]/10 overflow-hidden">
          <Pulse className={`w-full ${aspectClass}`} />
          <div className="p-2 space-y-1.5">
            <Pulse className="h-2.5 w-3/4" />
            <Pulse className="h-2 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonCardRow({ count = 4, aspect = "portrait" }: { count?: number; aspect?: string }) {
  const aspectClass = aspect === "landscape" ? "aspect-[4/3]" : "aspect-[3/4]";
  return (
    <div className="flex gap-5" style={{ width: "max-content" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="shrink-0 w-64 rounded-[10px] border-[3px] border-[#222]/10 overflow-hidden animate-pulse"
        >
          <Pulse className={`w-full ${aspectClass}`} />
          <div className="p-4 border-t-[3px] border-[#222]/10 space-y-2">
            <Pulse className="h-4 w-3/4" />
            <Pulse className="h-3 w-1/2" />
            <Pulse className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonForm() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Pulse className="h-2.5 w-20" />
          <Pulse className="h-9 w-full" />
        </div>
      ))}
      <Pulse className="h-10 w-full rounded-lg" />
    </div>
  );
}
