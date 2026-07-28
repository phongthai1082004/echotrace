import { injectable, inject } from "tsyringe";
import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { ApiResponse } from "../middleware/api.response.js";
import { AppError } from "../middleware/app.error.js";
import { ErrorCode } from "../errors/error-codes.js";
import { CreateSupplierDTO } from "../dto/supplier/supplier.create.dto.js";
import { UpdateSupplierDTO } from "../dto/supplier/supplier.update.dto.js";
import { ISupplierService } from "../services/supplier.service.js";

@injectable()
export class SupplierController {
    constructor(@inject("ISupplierService") private readonly supplierService: ISupplierService) {}
    getSupplierList = async (req:AuthRequest, res:Response) => {
        const result = await this.supplierService.getSupplierList();
        res.json(ApiResponse.success({ items: result, nextCursor: null }));
    }

    getSupplierById = async (req: AuthRequest, res: Response) => {
        const id = parseInt(String(req.params.id));
        const result = await this.supplierService.getSupplierById(id);
        res.json(ApiResponse.success(result));
    }

    createSupplier = async (req: AuthRequest, res: Response) => {
        const dto = req.body as CreateSupplierDTO;
        const result = await this.supplierService.createSupplier(dto);
        res.json(ApiResponse.success(result));
    };

    updateSupplier = async (req: AuthRequest, res: Response) => {
        const id = parseInt(String(req.params.id));
        const updateData = req.body as UpdateSupplierDTO;
        const result = await this.supplierService.updateSupplier(id, updateData);
        res.json(ApiResponse.success(result));
    };

    updateSupplierStatus = async (req: AuthRequest, res: Response) => {
        const id = parseInt(String(req.params.id));
        const { status } = req.body;
        if (!status || !["active", "banned"].includes(status)) {
            throw new AppError(ErrorCode.ADMIN_INVALID_STATUS, 400);
        }
        await this.supplierService.updateSupplier(id, { status });
        res.json(ApiResponse.success({ id, status }));
    };

    deleteSupplier = async (req: AuthRequest, res: Response) => {
        const id = parseInt(String(req.params.id));
        await this.supplierService.deleteSupplier(id);
        res.json(ApiResponse.success({ deleted: true }));
    }
}
