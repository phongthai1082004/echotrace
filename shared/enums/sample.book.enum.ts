export const Type = {
  ALBUM: "album",
  TEMPLATE: "template",
} as const;

export type Type = typeof Type[keyof typeof Type];

export const statusOption = {
    Draft: "Draft", 
    Published: "Published", 
    Archive: "Archive"
}
export type statusOption = typeof statusOption[keyof typeof statusOption];
