"use client";

import { atom, getDefaultStore, useAtom } from "jotai";

export type BookPage = { front: string; back: string };

const pictures = [
  "DSC00680",
  "DSC00933",
  "DSC00966",
  "DSC00983",
  "DSC01011",
  "DSC01040",
  "DSC01064",
  "DSC01071",
  "DSC01103",
  "DSC01145",
  "DSC01420",
  "DSC01461",
  "DSC01489",
  "DSC02031",
  "DSC02064",
  "DSC02069",
];

export const pageAtom = atom(1);

export const pages: BookPage[] = (() => {
  const pages: BookPage[] = [{ front: "book-cover", back: pictures[0] }];
  for (let i = 1; i < pictures.length - 1; i += 2) {
    pages.push({ front: pictures[i % pictures.length], back: pictures[(i + 1) % pictures.length] });
  }
  for (let i = 0; i < 30; i++) {
    pages.push({ front: "blank", back: "blank" });
  }
  pages.push({ front: pictures[pictures.length - 1], back: "book-back" });
  return pages;
})();

const FLIP_DEBOUNCE_MS = 500;
let lastFlipAt = 0;

export const turnPage = (next: number) => {
  const now = Date.now();
  if (now - lastFlipAt < FLIP_DEBOUNCE_MS) return;
  lastFlipAt = now;
  getDefaultStore().set(pageAtom, next);
};

export function Page({ total }: { total?: number }) {
  const [page] = useAtom(pageAtom);
  const n = total && total > 0 ? total : pages.length;

  const btn = (active: boolean) =>
    `font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-2.5 rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] transition-[transform,box-shadow,background-color] shrink-0 cursor-pointer ${
      active ? "bg-[#222] text-white" : "bg-[#FFF7D6] text-[#222] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_#222]"
    }`;
  const disabled = "opacity-40 pointer-events-none";

  return (
    <div className="pointer-events-none select-none z-10 absolute inset-0 flex justify-between flex-col ">
      <div />
      <div className="w-full overflow-auto pointer-events-auto flex justify-center">
        <div className="overflow-auto flex items-center gap-4 max-w-full p-8 scrollbar-none">
          <button className={`${btn(page === 0)}`} onClick={() => turnPage(0)}>Cover</button>
          <button
            className={`${btn(false)} ${page === 0 ? disabled : ""}`}
            onClick={() => turnPage(Math.max(0, page - 1))}
          >
            Previous
          </button>
          <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#222]/70 shrink-0">
            Page {page + 1} / {n + 1}
          </span>
          <button
            className={`${btn(false)} ${page === n ? disabled : ""}`}
            onClick={() => turnPage(Math.min(n, page + 1))}
          >
            Next
          </button>
          <button className={btn(page === n)} onClick={() => turnPage(n)}>Back Cover</button>
        </div>
      </div>
    </div>
  );
}