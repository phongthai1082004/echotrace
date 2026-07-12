"use client";

import { useDrag } from "react-dnd";

const stickerItems = ["▲", "★", "●", "◆", "⬟", "♡", "✸", "☀", "☽", "✦", "♢", "♤"];

function DraggableSticker({ char }: { char: string }) {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: "STICKER",
    item: { type: "STICKER", char },
    collect: (m) => ({ isDragging: m.isDragging() }),
  }), [char]);

  return (
    <div ref={dragRef as any}
      className={`aspect-square flex items-center justify-center cursor-grab active:cursor-grabbing transition-all text-lg rounded-[6px] border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] text-[#666] ${isDragging ? "opacity-40" : ""}`}>
      {char}
    </div>
  );
}

export function StickersPanel() {
  return (
    <div className="p-4">
      <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">Stickers</p>
      <div className="grid grid-cols-4 gap-2">
        {stickerItems.map((s) => (
          <DraggableSticker key={s} char={s} />
        ))}
      </div>
    </div>
  );
}
