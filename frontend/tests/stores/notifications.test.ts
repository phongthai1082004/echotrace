// F41: useNotifStore — refresh replace, loadMore dedupe + done when < limit, pushLive skips dupes.
import { vi } from "vitest";
import { useNotifStore, type NotifItem } from "@/stores/notifications";
import { apiFetch } from "@/lib/api.fetch";

vi.mock("@/lib/api.fetch", () => ({ apiFetch: vi.fn() }));

const mockFetch = vi.mocked(apiFetch);
const n = (id: number | string, title = `t${id}`): NotifItem => ({ id, title, message: "m", isRead: false });

beforeEach(() => {
  mockFetch.mockReset();
  useNotifStore.getState().reset();
});

it("F41 refresh replaces list (drops stale + live items)", async () => {
  useNotifStore.getState().pushLive(n("live-1"));
  mockFetch.mockResolvedValue([n(1), n(2)]);
  await useNotifStore.getState().refresh();
  expect(useNotifStore.getState().items.map((i) => i.id)).toEqual([1, 2]);
  expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("limit=10"), undefined);
});

it("F41 refresh self-dedupes: hasMore false when < limit", async () => {
  mockFetch.mockResolvedValue([n(1)]);
  await useNotifStore.getState().refresh();
  expect(useNotifStore.getState().hasMore).toBe(false);
  // ponytail: refresh throttle 30s — reset để lần gọi 2 được fetch thật.
  useNotifStore.getState().reset();
  mockFetch.mockResolvedValue(Array.from({ length: 10 }, (_, i) => n(i)));
  await useNotifStore.getState().refresh();
  expect(useNotifStore.getState().hasMore).toBe(true);
});

it("F41 loadMore dedupes by id + sets done when batch < limit", async () => {
  useNotifStore.setState({ items: [n(1), n(2)], hasMore: true });
  mockFetch.mockResolvedValue([n(2), n(3)]);
  await useNotifStore.getState().loadMore();
  expect(useNotifStore.getState().items.map((i) => i.id)).toEqual([1, 2, 3]);
  expect(useNotifStore.getState().hasMore).toBe(false); // 2 < 20
  expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("cursor=2"), undefined);
});

it("F41 loadMore no-ops when hasMore false or already loading", async () => {
  useNotifStore.setState({ items: [n(1)], hasMore: false });
  await useNotifStore.getState().loadMore();
  expect(mockFetch).not.toHaveBeenCalled();
});

it("F41 pushLive prepends but skips dupes", () => {
  const s = useNotifStore.getState();
  s.pushLive(n(1));
  s.pushLive(n(1));
  s.pushLive(n(2));
  expect(useNotifStore.getState().items.map((i) => i.id)).toEqual([2, 1]);
});

it("F41 setRead marks one item", () => {
  useNotifStore.setState({ items: [n(1), n(2)] });
  useNotifStore.getState().setRead(1);
  expect(useNotifStore.getState().items).toEqual([
    { ...n(1), isRead: true },
    n(2),
  ]);
});

it("setUnread flips one item back", () => {
  useNotifStore.setState({ items: [{ ...n(1), isRead: true }, n(2)] });
  useNotifStore.getState().setUnread(1);
  expect(useNotifStore.getState().items[0].isRead).toBe(false);
});
