// ponytail: canonical model, zero runtime deps and zero imports from fabric/pdf-lib.
// Types only — nothing consumes it yet; the PDF exporter (8.4) will.

export type NodeType = "frame" | "image" | "text" | "sticker" | "shape" | "group";

export interface Transform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg: number;
  opacity: number;
}

export interface SceneNodeBase {
  id: string;
  type: NodeType;
  transform: Transform;
  zIndex: number;
  locked: boolean;
  name?: string;
}

export interface ClipShape {
  kind: "rect" | "ellipse" | "polygon" | "svgPath";
  cornerRadius?: number;
  points?: { x: number; y: number }[];
  svgPath?: string;
}

export interface FrameNode extends SceneNodeBase {
  type: "frame";
  shape: ClipShape;
  imageRef?: string;
  imageFit: "cover" | "contain";
  imageOffset: { x: number; y: number };
}

export interface ImageNode extends SceneNodeBase {
  type: "image";
  assetRef: string;
  clip?: ClipShape;
}

export interface TextNode extends SceneNodeBase {
  type: "text";
  text: string;
  fontFamily: string;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  underline: boolean;
  fontSizePt: number;
  lineHeight: number;
  letterSpacing: number;
  color: string;
  align: "left" | "center" | "right" | "justify";
}

export interface StickerNode extends SceneNodeBase {
  type: "sticker";
  assetRef: string;
}

export interface ShapeNode extends SceneNodeBase {
  type: "shape";
  shape: ClipShape;
  fill?: string;
  stroke?: string;
  strokeWidthPt?: number;
}

export interface GroupNode extends SceneNodeBase {
  type: "group";
  children: SceneNode[];
}

export type SceneNode = FrameNode | ImageNode | TextNode | StickerNode | ShapeNode | GroupNode;

export interface ScenePage {
  id: string;
  widthMm: number;
  heightMm: number;
  backgroundColor: string;
  nodes: SceneNode[];
}

export interface SceneDocument {
  id: string;
  title: string;
  pages: ScenePage[];
  assets: Record<string, AssetRecord>;
  fonts: Record<string, FontRecord>;
}

export interface AssetRecord {
  id: string;
  mimeType: "image/png" | "image/jpeg";
  bytes: Uint8Array;
  widthPx: number;
  heightPx: number;
}

export interface FontRecord {
  id: string;
  family: string;
  weight: "normal" | "bold";
  style: "normal" | "italic";
  bytes: Uint8Array;
  cssUrl?: string;
}

export const fontKey = (family: string, weight: string, style: string): string => `${family}|${weight}|${style}`;