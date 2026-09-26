type SkeletonProps = { className?: string };

function Pulse({ className = "" }: SkeletonProps) {
  return <div className={`animate-pulse bg-[#e8e6e0]/50 rounded ${className}`} />;
}

const faint = "opacity-60";

type CardVariant = "journal" | "sample" | "order";

function JournalSkeletonCard() {
  return (
    <div className={`neo-card overflow-hidden ${faint}`}>
      <Pulse className="w-full aspect-[3/4] !rounded-none" />
      <div className="p-4 border-t-[3px] border-[#222] space-y-2">
        <Pulse className="h-[22px] w-3/4" />
        <Pulse className="h-3 w-1/2" />
        <Pulse className="h-3 w-1/3" />
      </div>
    </div>
  );
}

function SampleSkeletonCard() {
  return (
    <div className={`neo-card overflow-hidden ${faint}`}>
      <div className="aspect-[3/4] bg-[#e8e6e0]/50 animate-pulse relative">
        <div className="absolute top-3 left-3 h-[18px] w-14 bg-[#FFF7D6] border-2 border-[#222]/10 rounded-md" />
      </div>
      <div className="p-4 border-t-[3px] border-[#222] space-y-2">
        <Pulse className="h-4 w-2/3" />
        <Pulse className="h-[11px] w-full" />
        <Pulse className="h-[11px] w-4/5" />
        <Pulse className="h-3 w-1/2" />
      </div>
    </div>
  );
}

function OrderSkeletonCard() {
  return (
    <div className={`neo-card overflow-hidden ${faint}`}>
      <div className="aspect-[4/3] bg-[#e8e6e0]/50 animate-pulse relative">
        <div className="grid grid-cols-2 h-full">
          <div className="border-r-2 border-[#222]/10" />
          <div />
        </div>
        <div className="absolute top-3 left-3 h-5 w-16 bg-white/70 border-2 border-[#222]/10 rounded-md" />
        <div className="absolute bottom-3 right-3 h-5 w-20 bg-[#222]/20 rounded-md" />
      </div>
      <div className="p-4 border-t-[3px] border-[#222] space-y-2">
        <div className="flex items-center justify-between">
          <Pulse className="h-3 w-20" />
          <Pulse className="h-3 w-16" />
        </div>
        <Pulse className="h-4 w-full" />
        <Pulse className="h-3 w-2/3" />
      </div>
    </div>
  );
}

const variantGrid: Record<CardVariant, string> = {
  journal: "grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4",
  sample: "grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 sm:gap-5",
  order: "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3",
};

const variantCard: Record<CardVariant, () => React.JSX.Element> = {
  journal: JournalSkeletonCard,
  sample: SampleSkeletonCard,
  order: OrderSkeletonCard,
};

export function SkeletonGrid({
  count = 12,
  aspect = "square",
  variant,
}: {
  count?: number;
  aspect?: string;
  variant?: CardVariant;
}) {
  const v: CardVariant | null =
    variant ?? (aspect === "landscape" ? "order" : aspect === "portrait" ? "journal" : null);
  if (v) {
    const Card = variantCard[v];
    return (
      <div className={`${variantGrid[v]} ${faint}`}>
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} />
        ))}
      </div>
    );
  }
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 ${faint}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border-2 border-[#222]/10 overflow-hidden">
          <Pulse className="w-full aspect-square !rounded-none" />
          <div className="p-2 space-y-1.5">
            <Pulse className="h-2.5 w-3/4" />
            <Pulse className="h-2 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonForm() {
  return (
    <div className={`space-y-8 animate-pulse ${faint}`}>
      <div className="flex items-center gap-6 mb-8">
        <div className="w-16 h-16 rounded-xl bg-[#e8e6e0]/50 border-[3px] border-[#222]/10 shrink-0" />
        <div className="space-y-2">
          <Pulse className="h-4 w-40" />
          <Pulse className="h-3 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        <div className="sm:col-span-2 space-y-1.5">
          <Pulse className="h-2.5 w-20" />
          <Pulse className="h-10 w-full" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Pulse className="h-2.5 w-20" />
          <Pulse className="h-10 w-full" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Pulse className="h-2.5 w-20" />
          <Pulse className="h-10 w-full" />
        </div>
        <div className="space-y-1.5">
          <Pulse className="h-2.5 w-20" />
          <Pulse className="h-10 w-full" />
        </div>
        <div className="space-y-1.5">
          <Pulse className="h-2.5 w-20" />
          <Pulse className="h-10 w-full" />
        </div>
      </div>
      <Pulse className="h-11 w-40 !rounded-[10px]" />
    </div>
  );
}

// Matches checkout cart-step item + order-summary shells (same border/shadow, pulses inside).
export function CheckoutSkeletonCards({ count = 2 }: { count?: number }) {
  return (
    <div className={faint}>
      <Pulse className="h-8 w-40 mb-3" />
      <Pulse className="h-3 w-56 mb-3" />
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`flex items-start gap-4 p-4 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[2px_2px_0_#222] animate-pulse ${faint}`}
          >
            <div className="w-16 h-20 bg-[#e8e6e0]/50 rounded-[10px] border-[3px] border-[#222]/10 shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <Pulse className="h-[22px] w-3/4" />
              <Pulse className="h-3 w-1/2" />
              <div className="flex gap-1 mt-2">
                <Pulse className="w-8 h-8 !rounded-md" />
                <Pulse className="w-5 h-8" />
                <Pulse className="w-8 h-8 !rounded-md" />
              </div>
            </div>
            <div className="shrink-0 self-stretch flex flex-col items-end justify-between gap-3">
              <Pulse className="h-4 w-16" />
              <Pulse className="w-5 h-5 !rounded-[5px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CheckoutSkeletonSummary() {
  return (
    <div className={`neo-card overflow-hidden animate-pulse ${faint}`}>
      <div className="px-5 py-4 border-b-[3px] border-[#222]">
        <Pulse className="h-3 w-24" />
      </div>
      <div className="px-5 pb-4 pt-3 space-y-3">
        <div className="flex justify-between items-center gap-3">
          <Pulse className="h-4 flex-1" />
          <Pulse className="h-4 w-10" />
        </div>
        <div className="flex justify-between items-center gap-3">
          <Pulse className="h-4 flex-1" />
          <Pulse className="h-4 w-10" />
        </div>
        <div className="flex justify-between pt-2 border-t-[3px] border-[#222]/10">
          <Pulse className="h-3 w-16" />
          <Pulse className="h-6 w-24" />
        </div>
        <Pulse className="h-12 w-full !rounded-[10px]" />
        <Pulse className="h-12 w-full !rounded-[10px]" />
      </div>
    </div>
  );
}

// Matches StudioPage: topbar + sidebar/panel + canvas + properties.
export function StudioSkeleton() {
  return (
    <div className={`min-h-screen flex flex-col animate-pulse ${faint}`}>
      <div className="h-14 border-b-[3px] border-[#222]/10 flex items-center gap-3 px-4">
        <Pulse className="h-8 w-8 !rounded-lg" />
        <Pulse className="h-4 w-40" />
        <div className="flex-1" />
        <Pulse className="h-9 w-24 !rounded-[10px]" />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:flex w-16 flex-col items-center gap-3 py-4 border-r-[3px] border-[#222]/10">
          {Array.from({ length: 5 }).map((_, i) => (
            <Pulse key={i} className="h-10 w-10 !rounded-lg" />
          ))}
        </div>
        <div className="hidden lg:block w-64 p-4 border-r-[3px] border-[#222]/10 space-y-3">
          <Pulse className="h-4 w-24" />
          <Pulse className="h-20 w-full" />
          <Pulse className="h-20 w-full" />
          <Pulse className="h-20 w-full" />
        </div>
        <div className="flex-1 bg-[#e8e6e0]/30 flex items-center justify-center p-8">
          <Pulse className="w-full max-w-md aspect-[3/4] !rounded-[10px]" />
        </div>
        <div className="hidden lg:block w-72 p-4 border-l-[3px] border-[#222]/10 space-y-3">
          <Pulse className="h-4 w-24" />
          <Pulse className="h-10 w-full" />
          <Pulse className="h-10 w-full" />
          <Pulse className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
