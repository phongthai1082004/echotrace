import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

async function main() {
  const hash = await bcrypt.hash("admin123", 10);
  const hash2 = await bcrypt.hash("admin456", 10);

  await prisma.user.upsert({ where: { email: "admin@cabinetmemoir.app" }, update: {}, create: { email: "admin@cabinetmemoir.app", password: hash, name: "Admin One", role: "admin" } });
  await prisma.user.upsert({ where: { email: "admin2@cabinetmemoir.app" }, update: {}, create: { email: "admin2@cabinetmemoir.app", password: hash2, name: "Admin Two", role: "admin" } });

  console.log("Done. Logins:\n  admin@cabinetmemoir.app / admin123\n  admin2@cabinetmemoir.app / admin456");
}

main().catch(console.error).finally(() => prisma.$disconnect());
