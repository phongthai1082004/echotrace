"use client";

export function PhotosPanel() {
  return (
    <div className="p-4">
      <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-3" style={{ color: "rgba(26,26,26,0.38)" }}>Stock Photos</p>
      <div className="grid grid-cols-2 gap-1.5">
        {[
          "https://images.unsplash.com/photo-1775830150436-1cbe3d5ad3c6?w=300&h=400&fit=crop&auto=format",
          "https://images.unsplash.com/photo-1757679789909-29f58dfd065b?w=300&h=200&fit=crop&auto=format",
          "https://images.unsplash.com/photo-1533093814449-96af23c8f43f?w=300&h=400&fit=crop&auto=format",
          "https://images.unsplash.com/photo-1765660996991-31f345c40247?w=300&h=400&fit=crop&auto=format",
        ].map((url, i) => (
          <div key={i} className="overflow-hidden bg-[#e8e6e0]" style={{ border: "0.5px solid #dbdad6" }}>
            <img src={url} alt="" className="w-full object-cover" style={{ aspectRatio: "1" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
