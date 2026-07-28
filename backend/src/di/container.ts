import "reflect-metadata";
import { container } from "tsyringe";
import { BaseService } from "../utils/base.service.js";
import { prisma } from "../../lib/prisma.js";
import { CloudinaryService } from "../infrastructure/cloudinary/cloudinary.service.js";
import { AuthService } from "../services/auth.service.js";
import { BookService } from "../services/book.service.js";
import { UserService } from "../services/user.service.js";
import { UserImageService } from "../services/user-image.service.js";
import { SupplierService } from "../services/supplier.service.js";

container.register("UserBaseService", { useValue: new BaseService<any>(prisma.user) });
container.register("UserImageBaseService", { useValue: new BaseService<any>(prisma.userImage) });
container.register("SupplierBaseService", { useValue: new BaseService<any>(prisma.supplier) });
container.register("DecorAssetBaseService", { useValue: new BaseService<any>(prisma.decorAsset) });
container.register("CartBaseService", { useValue: new BaseService<any>(prisma.cart) });

container.registerSingleton("ICloudinaryService", CloudinaryService);
container.registerSingleton("IAuthService", AuthService);
container.registerSingleton("IBookService", BookService);
container.registerSingleton("IUserService", UserService);
container.registerSingleton("IUserImageService", UserImageService);
container.registerSingleton("ISupplierService", SupplierService);
