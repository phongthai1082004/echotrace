import { PrintOptionDTO } from "@echotrace/shared";

export type PrintOption = PrintOptionDTO;

export const PRINT_OPTION_TYPES = ["paperSize", "paper", "cover"] as const;
export type PrintOptionType = (typeof PRINT_OPTION_TYPES)[number];
