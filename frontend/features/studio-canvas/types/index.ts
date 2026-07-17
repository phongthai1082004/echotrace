import type { LayoutConfig } from "./layout";

export type FormatKey = 'A4_PORTRAIT' | 'SQUARE' | 'LANDSCAPE';

export const FORMATS: Record<FormatKey, { width: number; height: number; label: string }> = {
  A4_PORTRAIT: { width: 840, height: 1188, label: 'A4' },
  SQUARE:      { width: 840, height: 840,  label: '□' },
  LANDSCAPE:   { width: 1188, height: 840, label: '⊞' },
};

export type PageState = {
  index: number;
  canvasJson: string | null;
  thumbnailUrl: string | null;
  layout: LayoutConfig | null;
};

export const FONTS: { name: string; css: string; preview: string }[] = [
  { name: "Playfair Display", css: "'Playfair Display', serif",     preview: "Playfair" },
  { name: "Cormorant Garamond", css: "'Cormorant Garamond', serif", preview: "Cormorant" },
  { name: "Space Grotesk",     css: "'Space Grotesk', sans-serif",  preview: "Grotesk" },
  { name: "Inter",             css: "'Inter', sans-serif",           preview: "Inter" },
  { name: "JetBrains Mono",   css: "'JetBrains Mono', monospace",  preview: "Mono" },
  { name: "DM Mono",           css: "'DM Mono', monospace",          preview: "DM Mono" },
  { name: "Great Vibes",       css: "'Great Vibes', cursive",        preview: "Great Vibes" },
  { name: "Dancing Script",    css: "'Dancing Script', cursive",     preview: "Dancing Script" },
  { name: "Pacifico",          css: "'Pacifico', cursive",           preview: "Pacifico" },
  { name: "Lobster",           css: "'Lobster', cursive",            preview: "Lobster" },
  { name: "Righteous",         css: "'Righteous', sans-serif",       preview: "Righteous" },
  { name: "Permanent Marker",  css: "'Permanent Marker', cursive",   preview: "Permanent Marker" },
  { name: "Abril Fatface",     css: "'Abril Fatface', serif",        preview: "Abril Fatface" },
  { name: "Bebas Neue",        css: "'Bebas Neue', sans-serif",      preview: "Bebas Neue" },
  { name: "Oswald",            css: "'Oswald', sans-serif",          preview: "Oswald" },
  { name: "Montserrat",        css: "'Montserrat', sans-serif",      preview: "Montserrat" },
  { name: "Poppins",           css: "'Poppins', sans-serif",         preview: "Poppins" },
  { name: "Raleway",           css: "'Raleway', sans-serif",         preview: "Raleway" },
  { name: "Quicksand",         css: "'Quicksand', sans-serif",       preview: "Quicksand" },
  { name: "Comfortaa",         css: "'Comfortaa', sans-serif",       preview: "Comfortaa" },
];

export const ZOOM_LEVELS = [0.25, 0.33, 0.5, 0.67, 0.75, 1.0, 1.25, 1.5, 2.0];

