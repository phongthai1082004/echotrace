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
        <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-3" style={{ color: "rgba(26,26,26,0.38)" }}>Sticker Sets</p>
        <div className="grid grid-cols-3 gap-1.5">
          {stickerSets.map((s) => (
            <div key={s.label}
              className="flex flex-col items-center gap-1 py-3 px-2 cursor-pointer hover:bg-[#f5f3ef] transition-colors"
              style={{ border: "0.5px solid #dbdad6" }}
            >
              <span className="text-lg">{s.emoji}</span>
              <span className="font-['JetBrains_Mono'] text-[7px] tracking-widest uppercase" style={{ color: "rgba(26,26,26,0.4)" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-3" style={{ color: "rgba(26,26,26,0.38)" }}>Shapes</p>
        <div className="grid grid-cols-6 gap-1.5">
          {stickerItems.map((s) => (
            <div key={s} className="aspect-square flex items-center justify-center cursor-pointer hover:bg-[#f5f3ef] transition-colors text-sm"
              style={{ border: "0.5px solid #dbdad6", color: "rgba(26,26,26,0.6)" }}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
