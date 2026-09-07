// Minimal stand-in for the generated Prisma client module in unit tests.
// Only the runtime VALUES services reference live here; types are erased at compile time.
export const Prisma = {
	TransactionIsolationLevel: {
		Serializable: 'Serializable',
		ReadCommitted: 'ReadCommitted',
		RepeatableRead: 'RepeatableRead',
	},
	PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
		code: string;
		constructor(message: string, meta: { code: string }) {
			super(message);
			this.code = meta?.code ?? '';
		}
	},
} as const;

export class PrismaClient {}
