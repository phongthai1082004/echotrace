"use client";

import { useCanvasStore } from "../../../hooks/useCanvasState";
import { SHAPE_NAMES, makeShapeFrame } from "../../../lib/shapes";
import { nextFrameZ, enforceZLayers } from "../../../lib/fabric-core";

export function FramesPanel() {
  const canvas = useCanvasStore((s) => s.canvas);
  const pushUndo = useCanvasStore((s) => s.pushUndo);
  const clearRedo = useCanvasStore((s) => s.clearRedo);

  const handleAdd = (name: string) => {
    if (!canvas) return;
    pushUndo();
    const size = 120;
    const left = (canvas.width || 840) / 2 - size / 2;
    const top = (canvas.height || 600) / 2 - size / 2;
    const frame = makeShapeFrame(name as any, left, top, size);
    (frame as any).customProperties.z = nextFrameZ(canvas);
    canvas.add(frame);
    canvas.setActiveObject(frame);
    canvas.renderAll();
    enforceZLayers(canvas);
    clearRedo();
  };

  const icons: Record<string, string> = {
    Rectangle: "▭",
    RoundedRect: "▣",
    Circle: "○",
    Ellipse: "⬮",
    Triangle: "△",
    Pentagon: "⬠",
    Hexagon: "⬡",
    Octagon: "⯃",
    Diamond: "◇",
    Star: "★",
    Heart: "♥",
  };

  return (
    <div className="p-4">
      <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">Frames</p>
      <div className="grid grid-cols-2 gap-2">
        {SHAPE_NAMES.map((name) => (
          <button
            key={name}
            onClick={() => handleAdd(name)}
            className="flex items-center justify-center py-3 cursor-pointer hover:bg-[#e8e6e0] transition-[background-color] rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222]"
          >
            <span className="text-2xl">{icons[name] || "□"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
