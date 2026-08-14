import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

async function main() {
  const userCount = await prisma.user.count();
  const supplierCount = await prisma.supplier.count();

  if (userCount === 0) {
    const hash = await bcrypt.hash("admin123", 10);
    const hash2 = await bcrypt.hash("admin456", 10);
    const userHash = await bcrypt.hash("user123", 10);

    await prisma.user.createMany({
      data: [
        { email: "admin@cabinetmemoir.app", password: hash, name: "Admin One", role: "admin", isDelete: false },
        { email: "admin2@cabinetmemoir.app", password: hash2, name: "Admin Two", role: "admin", isDelete: false },
        { email: "minh@example.com", password: userHash, name: "Nguyễn Văn Minh", phone: "0912345678", address: "12 Lê Duẩn", city: "Hà Nội", role: "user", isDelete: false },
        { email: "thao@example.com", password: userHash, name: "Trần Thị Thảo", phone: "0934567890", address: "45 Nguyễn Huệ", city: "TP. Hồ Chí Minh", role: "user", isDelete: false },
        { email: "hung@example.com", password: userHash, name: "Lê Văn Hùng", phone: "0978123456", address: "78 Bạch Đằng", city: "Đà Nẵng", role: "user", isDelete: false },
        { email: "lan@example.com", password: userHash, name: "Phạm Thị Lan", phone: "0900111222", address: "23 Trần Phú", city: "Hải Phòng", role: "user", isDelete: true },
        { email: "tuan@example.com", password: userHash, name: "Hoàng Văn Tuấn", phone: "0966333444", address: "56 Kim Mã", city: "Hà Nội", role: "user", isDelete: false },
        { email: "mai@example.com", password: userHash, name: "Đỗ Thị Mai", phone: "0988777666", address: "89 Lạc Long Quân", city: "Cần Thơ", role: "user", isDelete: true },
        { email: "son@example.com", password: userHash, name: "Bùi Văn Sơn", phone: "0911222333", address: "34 Xô Viết Nghệ Tĩnh", city: "Đà Nẵng", role: "user", isDelete: false },
        { email: "anh@example.com", password: userHash, name: "Vũ Thị Anh", phone: "0977444555", address: "67 Hoàng Văn Thụ", city: "TP. Hồ Chí Minh", role: "user", isDelete: false },

        { email: "dung@example.com", password: userHash, name: "Phan Tiến Dũng", phone: "0903123890", address: "102 Nguyễn Trãi", city: "Thanh Hóa", role: "user", isDelete: false },
        { email: "phuong@example.com", password: userHash, name: "Ngô Bích Phương", phone: "0945888999", address: "15 Lê Lợi", city: "Huế", role: "user", isDelete: false },
        { email: "khoa@example.com", password: userHash, name: "Đặng Đăng Khoa", phone: "0938777111", address: "88 Điện Biên Phủ", city: "Bình Dương", role: "user", isDelete: false },
        { email: "trinh@example.com", password: userHash, name: "Nguyễn Phương Trinh", phone: "0918999222", address: "245 Võ Văn Kiệt", city: "TP. Hồ Chí Minh", role: "user", isDelete: false },
        { email: "long@example.com", password: userHash, name: "Trịnh Quốc Long", phone: "0972333888", address: "18 Hoàng Diệu", city: "Nha Trang", role: "user", isDelete: true },
        { email: "ha@example.com", password: userHash, name: "Dương Thu Hà", phone: "0905444111", address: "91 Cầu Giấy", city: "Hà Nội", role: "user", isDelete: false },
        { email: "khanh@example.com", password: userHash, name: "Vũ Gia Khánh", phone: "0968111999", address: "52 Trần Hưng Đạo", city: "Quảng Ninh", role: "user", isDelete: false },
        { email: "nhien@example.com", password: userHash, name: "Lê An Nhiên", phone: "0933222888", address: "73 Nguyễn Văn Linh", city: "Đà Nẵng", role: "user", isDelete: false },
        { email: "quan@example.com", password: userHash, name: "Lương Minh Quân", phone: "0981555666", address: "119 Lý Thường Kiệt", city: "Vũng Tàu", role: "user", isDelete: false },
        { email: "quang.admin@cabinetmemoir.app", password: hash, name: "Trần Minh Quang", phone: "0909000999", address: "88 Phạm Văn Đồng", city: "Hà Nội", role: "admin", isDelete: false },
      ],
    });
    console.log(`Seeded ${await prisma.user.count()} users.`);
  } else {
    console.log(`Users table has ${userCount} records — skipping.`);
  }

  if (supplierCount === 0) {
    await prisma.supplier.createMany({
      data: [
        { name: "Xưởng In An Dương", contact: "Trần Văn An", email: "info@anduong.vn", isDelete: false },
        { name: "Công ty In ấn Việt Đức", contact: "Nguyễn Đức Việt", email: "vietduc@printing.vn", isDelete: false },
        { name: "Nhà Máy Giấy & In Bình Dương", contact: "Lê Văn Bình", email: "binh@giayin.vn", isDelete: false, totalDebt: 15000000, monthDebt: 5000000 },
        { name: "Xưởng Đóng Sách Thủ Công Hà Nội", contact: "Phạm Hoàng", email: "hoang@sach.vn", isDelete: false, totalDebt: 42000000, overdueDebt: 12000000, monthDebt: 8000000 },
        { name: "Công Ty Vật Tư Ngành In Sài Gòn", contact: "Trương Minh", email: "minh@vattu.vn", isDelete: true, totalDebt: 78000000, overdueDebt: 45000000, monthDebt: 15000000 },
        { name: "Giấy In Cao Cấp Đà Nẵng", contact: "Đặng Hữu", email: "huu@giaycaocap.vn", isDelete: false, totalDebt: 6000000, monthDebt: 2000000 },

        { name: "Tập Đoàn Mực In Sông Hồng", contact: "Đỗ Quốc Bảo", email: "baodq@songhongink.com", isDelete: false, totalDebt: 25000000, monthDebt: 10000000 },
        { name: "Công Ty Bao Bì & Nhãn Mác Tân Phát", contact: "Nguyễn Thị Ngọc", email: "ngocnt@tanphatpack.vn", isDelete: false, totalDebt: 0, overdueDebt: 0, monthDebt: 0 },
        { name: "Xưởng Khai Thác & Cung Cấp Keo Dán Á Châu", contact: "Hồ Văn Thái", email: "thaiho@achauglue.com", isDelete: false, totalDebt: 18500000, monthDebt: 6500000 },
        { name: "Công Ty Thiết Bị Ngành In Phúc Long", contact: "Phó Đức Phương", email: "phuong.p@phuclongprint.vn", isDelete: false, totalDebt: 120000000, overdueDebt: 30000000, monthDebt: 25000000 },
        { name: "Nhà Cung Cấp Màng Lamination Minh Quân", contact: "Trịnh Minh Quân", email: "quan@laminatemq.vn", isDelete: false, totalDebt: 8500000, monthDebt: 3000000 },
        { name: "Công Ty Cổ Phần Giấy Bãi Bằng", contact: "Lê Thanh Tùng", email: "tunglt@baibangpaper.com.vn", isDelete: false, totalDebt: 350000000, overdueDebt: 0, monthDebt: 80000000 },
        { name: "Xưởng In Lụa & Ép Kim Thành Công", contact: "Vũ Công Thành", email: "thanhcong@inlua.vn", isDelete: true, totalDebt: 55000000, overdueDebt: 55000000, monthDebt: 0 },
        { name: "Công Ty Vật Tư Khổ In Lớn Hải Phòng", contact: "Phạm Xuân Trường", email: "truongpx@haiphongprint.vn", isDelete: false, totalDebt: 32000000, overdueDebt: 5000000, monthDebt: 12000000 },
        { name: "Tổng Kho Phụ Liệu Đóng Sách Việt Nhật", contact: "Mori Hiroshi", email: "contact@vietnhatbind.com", isDelete: false, totalDebt: 94000000, overdueDebt: 14000000, monthDebt: 20000000 },
        { name: "Công Ty In Decal & Tem Nhãn Đông Á", contact: "Bùi Hoàng Anh", email: "hoanganh@donga-decal.vn", isDelete: false, totalDebt: 11000000, monthDebt: 4500000 }
      ],
    });
    console.log(`Seeded ${await prisma.supplier.count()} suppliers.`);
  } else {
    console.log(`Suppliers table has ${supplierCount} records — skipping.`);
  }

  console.log("Seed complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
