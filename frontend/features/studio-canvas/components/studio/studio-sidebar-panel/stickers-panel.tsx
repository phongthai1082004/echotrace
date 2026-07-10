"use client";

const stickerSets = [
  { label: "Travel", color: "#C4A882", emoji: "✈" },
  { label: "Nature", color: "#9CB8A8", emoji: "🌿" },
  { label: "Food", color: "#D4A574", emoji: "🍜" },
  { label: "Maps", color: "#A8B8C8", emoji: "🗺" },
  { label: "Camera", color: "#8B8B8B", emoji: "📷" },
  { label: "Compass", color: "#B8A88C", emoji: "🧭" },
];

const stickerItems = ["▲", "★", "●", "◆", "⬟", "♡", "✸", "☀", "☽", "✦", "♢", "♤"];

export function StickersPanel() {
  return (
    <div className="p-4 space-y-5">
      <div>
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">Sticker Sets</p>
        <div className="grid grid-cols-3 gap-1.5">
          {stickerSets.map((s) => (
            <div key={s.label}
              className="flex flex-col items-center gap-1 py-3 px-2 cursor-pointer hover:bg-[#e8e6e0] transition-all rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222]"
            >
              <span className="text-lg">{s.emoji}</span>
              <span className="font-mono text-[7px] font-bold tracking-widest uppercase text-[#666]">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">Shapes</p>
        <div className="grid grid-cols-6 gap-1.5">
          {stickerItems.map((s) => (
            <div key={s} className="aspect-square flex items-center justify-center cursor-pointer hover:bg-[#e8e6e0] transition-all text-sm rounded-[6px] border-[2px] border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] text-[#666]"
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
