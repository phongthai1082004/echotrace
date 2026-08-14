import { injectable } from "tsyringe";
import type { PaymentType, PaymentDeposit} from "@echotrace/shared";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../middleware/app.error.js";
import { ErrorCode } from "@echotrace/shared";
import { CartItem, parseCartItems } from "@echotrace/shared";
import { Coupon } from "../../generated/prisma/client.js";
import { PaymentService } from "../infrastructure/payment/payment.service.js";

export abstract class IOrderService {
    
}

@injectable()
export class OrderService implements IOrderService {
    public constructor() {

    }
    async createOrder(PaymentType: PaymentType, CouponId: string) {
        // Process Information form
        // Create Order Link
        try {

        } catch(error) {

        }
        // Create Order 
        // Create OrderItems
    }
    
    async getPrice(email: string, couponCode: string): Promise<number> {
         const [cart, coupon] = await Promise.all([
            prisma.cart.findFirst({
                where: {
                    user: {
                        email: email
                    }
                }
            }),
            prisma.coupon.findUnique({
                where: {
                    code: couponCode
                }
            })
        ])

        if (!cart) {
            throw new AppError(ErrorCode.CART_NOT_FOUND, 404);
        }

        parseCartItems(cart.items).forEach((item) => {
            
        });

        // const subtotal = parseCartItems(cart.items).reduce((total, item) => {
        //     return total += item.price * item.quantity;
        // }, 0);

        // if (coupon !== null) {
        //     return subtotal - this.calculateCouponDiscount(coupon, subtotal);
        // }
        return 0;
    }
    calculateCouponDiscount(coupon: Coupon, subtotal: number): number {
        if (!coupon || subtotal <= 0) return 0;

        if (coupon.isDelete || !coupon.isActive) {
            return 0;
        }

        if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
            return 0;
        }

        if (coupon.maxUsageCount > 0 && coupon.usedCount >= coupon.maxUsageCount) {
            return 0;
        }

        if (coupon.minOrderAmount > 0 && subtotal < coupon.minOrderAmount) {
            return 0;
        }

        let discount = 0;

        const type = coupon.discountType.toUpperCase();

        if (type === 'PERCENT' || type === 'PERCENTAGE') {
            discount = (subtotal * coupon.discountValue) / 100;

            if (coupon.maxDiscountAmount !== null && coupon.maxDiscountAmount > 0) {
            discount = Math.min(discount, coupon.maxDiscountAmount);
            }
        } else if (type === 'FIXED' || type === 'FIXED_AMOUNT' || type === 'AMOUNT') {
            discount = coupon.discountValue;
        }

        discount = Math.min(discount, subtotal);
        discount = Math.max(discount, 0);

        return Math.round(discount);
    }
}