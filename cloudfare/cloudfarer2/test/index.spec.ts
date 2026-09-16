import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

function fakeObject(bytes: Uint8Array) {
	return {
		body: new Response(bytes).body,
		httpEtag: '"etag-123"',
		writeHttpMetadata(headers: Headers) {
			headers.set("content-type", "image/png");
		},
	};
}

const ENV_BASE = {
	R2: {
		get: async (key: string) => (key === "echotrace/gallery/u1/abc" ? fakeObject(new Uint8Array([1, 2, 3])) : null),
	},
	UPLOAD_SECRET: "s",
	ADMIN_TOKEN: "a",
};

function run(request: Request, envMock: unknown) {
	const ctx = createExecutionContext();
	const p = worker.fetch(request, envMock as never);
	return { p, ctx };
}

describe("GET cache headers", () => {
	it("original -> immutable long-term cache", async () => {
		const req = new IncomingRequest("http://x.com/echotrace/gallery/u1/abc");
		const { p, ctx } = run(req, ENV_BASE);
		const res = await p;
		await waitOnExecutionContext(ctx);
		expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
	});

	it("HEAD request also includes Cache-Control", async () => {
		const req = new IncomingRequest("http://x.com/echotrace/gallery/u1/abc", { method: "HEAD" });
		const { p, ctx } = run(req, ENV_BASE);
		const res = await p;
		await waitOnExecutionContext(ctx);
		expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
	});

	it("transform /w_N/ -> short TTL for image expiration within day", async () => {
		const envMock = {
			...ENV_BASE,
			IMAGES: {
				input: (_s: unknown) => ({
					transform: () => ({
						output: async () => ({ response: () => ({ body: new Response(new Uint8Array([9])).body }) }),
					}),
				}),
			},
		};
		const req = new IncomingRequest("http://x.com/w_300/echotrace/gallery/u1/abc", {
			headers: { Accept: "image/webp" },
		});
		const { p, ctx } = run(req, envMock);
		const res = await p;
		await waitOnExecutionContext(ctx);
		expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400, stale-while-revalidate=86400");
	});

	it("transform fail -> fallback original keeps immutable", async () => {
		const envMock = {
			...ENV_BASE,
			IMAGES: {
				input: () => {
					throw new Error("boom");
				},
			},
		};
		const req = new IncomingRequest("http://x.com/w_300/echotrace/gallery/u1/abc", {
			headers: { Accept: "image/webp" },
		});
		const { p, ctx } = run(req, envMock);
		const res = await p;
		await waitOnExecutionContext(ctx);
		expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
	});
});
