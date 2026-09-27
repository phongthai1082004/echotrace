import { vi } from "vitest";
import { apiFetch } from "@/lib/api.fetch";
import { getSession, signOut } from "next-auth/react";

vi.mock("next-auth/react", () => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
}));

const ok = (data: unknown) => ({ status: 200, ok: true, json: async () => ({ data }) });
const denied = () => ({ status: 401, ok: false, json: async () => ({}) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
afterEach(() => vi.unstubAllGlobals());

it("3 request 401 cùng lúc chỉ refresh 1 lần rồi retry đều ok", async () => {
  vi.mocked(getSession).mockResolvedValue(null);
  let calls = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      calls++;
      return (calls <= 3 ? denied() : ok({ n: calls })) as any;
    }),
  );
  const [a, b, c] = await Promise.all([apiFetch("/api/x"), apiFetch("/api/y"), apiFetch("/api/z")]);
  expect([a, b, c]).toBeTruthy();
  expect(getSession).toHaveBeenCalledTimes(1);
  expect(vi.mocked(fetch)).toHaveBeenCalledTimes(6);
  expect(signOut).not.toHaveBeenCalled();
});

it("persistent 401 → signOut + throw", async () => {
  vi.mocked(getSession).mockResolvedValue(null);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => denied() as any),
  );
  await expect(apiFetch("/api/x")).rejects.toThrow("Session expired");
  await vi.waitFor(() => expect(signOut).toHaveBeenCalled());
});
