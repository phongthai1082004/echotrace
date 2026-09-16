import { notifText } from "@/stores/notifications";

const I18N = {
  title: { vi: "Gốc VI", en: "EN title", es: "" },
  message: { vi: "Nội dung VI", en: "", es: "ES texto" },
};

const n = (over = {}) => ({
  id: 1,
  title: "Gốc VI",
  message: "Nội dung VI",
  isRead: false,
  i18n: I18N,
  ...over,
});

it("picks lang from i18n column, falls back to base fields", () => {
  expect(notifText(n(), "title", "en")).toBe("EN title");
  expect(notifText(n(), "message", "en")).toBe("Nội dung VI"); // trống → gốc
  expect(notifText(n(), "title", "es")).toBe("Gốc VI");
  expect(notifText(n(), "message", "es")).toBe("ES texto");
  expect(notifText(n(), "title", "vi")).toBe("Gốc VI");
});

it("legacy rows: metadata.i18n still works", () => {
  const legacy = n({ i18n: null, metadata: { i18n: I18N } });
  expect(notifText(legacy, "title", "en")).toBe("EN title");
  expect(notifText(legacy, "message", "es")).toBe("ES texto");
});

it("no i18n anywhere → base fields, never throws", () => {
  expect(notifText(n({ i18n: null, metadata: null }), "title", "en")).toBe("Gốc VI");
  expect(notifText(n({ i18n: null, metadata: null }), "message", "fr")).toBe("Nội dung VI");
});
