const en = require("./public/locales/en/common.json");
const vi = require("./public/locales/vi/common.json");
const es = require("./public/locales/es/common.json");

const requiredKeys = {
  dispatch: [
    "label",
    "title",
    "orders",
    "suppliers",
    "unassigned",
    "allOrders",
    "active",
    "assignOrders",
    "searchPlaceholder",
    "filterAll",
    "orderId",
    "customer",
    "product",
    "amount",
    "status",
    "date",
    "noOrders",
  ],
  stickers: [
    "label",
    "title",
    "uploadBtn",
    "categories",
    "all",
    "sticker",
    "background",
    "searchPlaceholder",
    "noAssets",
    "uploadModal",
    "assetName",
    "assetType",
    "category",
    "image",
    "namePlaceholder",
    "noCategory",
    "upload",
    "uploading",
  ],
  suppliers: [
    "label",
    "title",
    "searchPlaceholder",
    "name",
    "email",
    "phone",
    "address",
    "city",
    "role",
    "status",
    "noSuppliers",
  ],
  users: [
    "label",
    "title",
    "searchPlaceholder",
    "name",
    "email",
    "phone",
    "address",
    "city",
    "role",
    "status",
    "noUsers",
    "tokenInvalid",
    "fetchFailed",
  ],
  adminAccount: ["label", "title"],
};

console.log("=== ADMIN TRANSLATIONS VERIFICATION ===\n");

let allValid = true;

Object.entries(requiredKeys).forEach(([section, keys]) => {
  const enSection = en.admin[section];
  const viSection = vi.admin[section];
  const esSection = es.admin[section];

  let sectionValid = true;
  keys.forEach((key) => {
    if (!enSection || !enSection[key]) {
      console.log(`✗ EN admin.${section}.${key} - MISSING`);
      sectionValid = false;
      allValid = false;
    }
    if (!viSection || !viSection[key]) {
      console.log(`✗ VI admin.${section}.${key} - MISSING`);
      sectionValid = false;
      allValid = false;
    }
    if (!esSection || !esSection[key]) {
      console.log(`✗ ES admin.${section}.${key} - MISSING`);
      sectionValid = false;
      allValid = false;
    }
  });

  if (sectionValid) {
    console.log(`✓ admin.${section} - All keys present in EN/VI/ES`);
  }
});

console.log("\n=== SAMPLE TRANSLATIONS ===");
console.log("Dispatch label EN: " + en.admin.dispatch.label);
console.log("Dispatch label VI: " + vi.admin.dispatch.label);
console.log("Dispatch label ES: " + es.admin.dispatch.label);

console.log("\nStickers title EN: " + en.admin.stickers.title);
console.log("Stickers title VI: " + vi.admin.stickers.title);
console.log("Stickers title ES: " + es.admin.stickers.title);

console.log("\n=== RESULT ===");
if (allValid) {
  console.log("✓ All admin translations verified successfully!");
} else {
  console.log("✗ Some translations are missing!");
}
