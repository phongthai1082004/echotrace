"use client";

export function PhotosPanel() {
  return (
    <div className="p-4">
      <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">Stock Photos</p>
      <div className="grid grid-cols-2 gap-1.5">
        {[
          "https://images.unsplash.com/photo-1775830150436-1cbe3d5ad3c6?w=300&h=400&fit=crop&auto=format",
          "https://images.unsplash.com/photo-1757679789909-29f58dfd065b?w=300&h=200&fit=crop&auto=format",
          "https://images.unsplash.com/photo-1533093814449-96af23c8f43f?w=300&h=400&fit=crop&auto=format",
          "https://images.unsplash.com/photo-1765660996991-31f345c40247?w=300&h=400&fit=crop&auto=format",
        ].map((url, i) => (
          <div key={i} className="overflow-hidden bg-[#e8e6e0] rounded-[6px] border-2 border-[#222] shadow-[2px_2px_0_#222]">
            <img src={url} alt="" className="w-full object-cover" style={{ aspectRatio: "1" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
