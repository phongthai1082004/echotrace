import { BaseService } from "../utils/base.service.js";
import { prisma } from "../../lib/prisma.js";
import { SupplierModel } from "../../generated/prisma/models.js";

export class SupplierService {
    private readonly context: BaseService<SupplierModel>;
    constructor() {
        this.context = new BaseService<SupplierModel>(prisma.supplier);
    }
    async createSupplier() {
        // this.context.create(); 
    }
}