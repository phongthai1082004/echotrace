// ESM-only @prisma/adapter-pg is replaced in unit tests — no driver is ever constructed.
export const PrismaPg = class {
	constructor(_opts: { connectionString?: string }) {}
} as unknown as new (...args: any[]) => any;
