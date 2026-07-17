export type ElementType = "image" | "text" | "sticker" | "background";

export interface CanvasElement {
  type: ElementType;
  left: number;
  top: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  opacity: number;
  visible: boolean;
  z: number;
  layer: string;
  stickerName?: string;
  src?: string;
  filters?: any[];
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fill?: string;
}

export interface BookContent {
  version: number;
  elements: CanvasElement[];
  id?: number;
  title?: string;
  pages?: number;
  paperSize?: string;
  paperType?: string;
  gsm?: number;
  bindingType?: "perfect" | "layflat";
  spineWidth?: number;
}
