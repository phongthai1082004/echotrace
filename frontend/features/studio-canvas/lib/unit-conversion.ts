export const MM_TO_PT = 2.834645669;
export const PT_TO_MM = 1 / MM_TO_PT;
export const PX_PER_MM = 4;
export const PT_PER_MM = MM_TO_PT;
export const PT_PER_PX = PT_PER_MM / PX_PER_MM;

export const mmToPt = (mm: number): number => mm * MM_TO_PT;
export const ptToMm = (pt: number): number => pt * PT_TO_MM;
export const pxToMm = (px: number): number => px / PX_PER_MM;
export const mmToPx = (mm: number): number => mm * PX_PER_MM;
export const pxToPt = (px: number): number => px * PT_PER_PX;
export const ptToPx = (pt: number): number => pt / PT_PER_PX;