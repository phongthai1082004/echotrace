// Refresh rotation: backend deletes the old refresh row on every /refresh,
// so the jwt callback must store the NEW refreshToken or the 2nd refresh 401s.
import { vi } from "vitest";
import { authOptions } from "@/lib/auth.config";

const jwtCb = (authOptions.callbacks as any).jwt;

function token(over = {}) {
  return { accessToken: "A1", refreshToken: "R1", accessTokenExpires: Date.now() - 1, ...over };
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

it("stores the rotated refreshToken (2nd refresh keeps working)", async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { accessToken: "A2", refreshToken: "R2" } }),
  });
  vi.stubGlobal("fetch", fetchMock);
  const next = await jwtCb({ token: token(), user: undefined, trigger: undefined, session: undefined });
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining("/api/auth/refresh"),
    expect.objectContaining({ body: JSON.stringify({ refreshToken: "R1" }) }),
  );
  expect(next).toMatchObject({ accessToken: "A2", refreshToken: "R2" });

  // 2nd cycle sends R2, not the dead R1
  const fetch2 = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { accessToken: "A3", refreshToken: "R3" } }),
  });
  vi.stubGlobal("fetch", fetch2);
  const next2 = await jwtCb({ token: { ...next, accessTokenExpires: Date.now() - 1 }, user: undefined, trigger: undefined, session: undefined });
  expect(fetch2).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ body: JSON.stringify({ refreshToken: "R2" }) }),
  );
  expect(next2).toMatchObject({ accessToken: "A3", refreshToken: "R3" });
});

it("null token (dead refresh) → session passes through, no .sub crash", async () => {
  const sessionCb = (authOptions.callbacks as any).session;
  const session = { user: { name: "A" } };
  await expect(sessionCb({ session, token: null })).resolves.toBe(session);
});

it("dead refresh (401) → null (session ends, apiFetch signs out)", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: "revoked" }) }),
  );
  await expect(
    jwtCb({ token: token(), user: undefined, trigger: undefined, session: undefined }),
  ).resolves.toBeNull();
});
