import "reflect-metadata";
import { container } from "tsyringe";
import { BaseService } from "../utils/base.service.js";
import { prisma } from "../../lib/prisma.js";
import { CloudinaryService } from "../infrastructure/cloudinary/cloudinary.service.js";
import { AuthService } from "../features/auth/auth.service.js";
import { BookService } from "../features/books/books.service.js";
import { UserService } from "../features/users/users.service.js";
import { UserImageService } from "../features/uploads/user-images.service.js";
import { SupplierService } from "../features/suppliers/suppliers.service.js";
import { CartService } from "../features/cart/cart.service.js";
import { CouponService } from "../features/coupons/coupons.service.js";
import { SampleBookService } from "../features/sample-books/sample-books.service.js";
import { PaymentService } from "../infrastructure/payment/payment.service.js";
import { PayOSGateway } from "../infrastructure/payment/payos.service.js";

container.register("UserBaseService", { useValue: new BaseService<any>(prisma.user) });
container.register("UserImageBaseService", { useValue: new BaseService<any>(prisma.userImage) });
container.register("SupplierBaseService", { useValue: new BaseService<any>(prisma.supplier) });
container.register("SupplierOptionBaseService", { useValue: new BaseService<any>(prisma.supplierOption) });
container.register("DecorAssetBaseService", { useValue: new BaseService<any>(prisma.decorAsset) });
container.register("CartBaseService", { useValue: new BaseService<any>(prisma.cart) });
container.register("OrderBaseService", { useValue: new BaseService<any>(prisma.order) });

container.registerSingleton("ICloudinaryService", CloudinaryService);
container.registerSingleton("IAuthService", AuthService);
container.registerSingleton("IBookService", BookService);
container.registerSingleton("IUserService", UserService);
container.registerSingleton("IUserImageService", UserImageService);
container.registerSingleton("ISupplierService", SupplierService);
container.registerSingleton("ICartService", CartService);
container.registerSingleton("ICouponService", CouponService);
container.registerSingleton("ISampleBookService", SampleBookService);

let paymentService: PaymentService;
container.register("IPaymentService", {
  useFactory: () => (paymentService ??= new PaymentService([new PayOSGateway()])),
});

export { container };