import { defineConfig } from "prisma/config";
export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://postgres:123abc%40@localhost:5432/echotrace",
  },
});
