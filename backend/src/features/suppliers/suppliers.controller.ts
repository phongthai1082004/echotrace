import { injectable, inject } from "tsyringe";
import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { ApiResponse } from "../../middleware/api.response.js";
import { AppError } from "../../middleware/app.error.js";
import { ErrorCode } from "@echotrace/shared";
import { CreateSupplierDTO } from "../../dto/supplier/supplier.create.dto.js";
import { UpdateSupplierDTO } from "../../dto/supplier/supplier.update.dto.js";
import { ISupplierService } from "./suppliers.service.js";

@injectable()
export class SupplierController {
    constructor(@inject("ISupplierService") private readonly supplierService: ISupplierService) {}
    getSupplierList = async (req:AuthRequest, res:Response) => {
        const { status } = req.query;
        const extraWhere: any = {};
        if (status === "banned") extraWhere.isDelete = true;
        else if (status === "active") extraWhere.isDelete = false;
        else extraWhere.isDelete = undefined;
        const result = await this.supplierService.getSupplierList(extraWhere);
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
        await this.supplierService.updateSupplier(id, { status } as any);
        res.json(ApiResponse.success({ id, banned: status === "banned" }));
    };

    updateSupplierInfo = async (req: AuthRequest, res: Response) => {
        const id = parseInt(String(req.params.id));
        const updateData = req.body as UpdateSupplierDTO;
        // Only allow personal info fields
        const allowedFields = ['name', 'contact', 'email', 'bankName', 'bankAccountNumber', 'bankAccountName', 'status'];
        const filteredData: any = {};
        allowedFields.forEach(field => {
            if (field in updateData) {
                filteredData[field] = updateData[field as keyof UpdateSupplierDTO];
            }
        });
        const result = await this.supplierService.updateSupplier(id, filteredData);
        res.json(ApiResponse.success(result));
    };

    deleteSupplier = async (req: AuthRequest, res: Response) => {
        const id = parseInt(String(req.params.id));
        await this.supplierService.deleteSupplier(id);
        res.json(ApiResponse.success({ deleted: true }));
    }

    getAvailableSuppliers = async (req: AuthRequest, res: Response) => {
        const { paperSize, paper, cover } = req.query;
        const result = await this.supplierService.findAvailableSuppliers({
            paperSize: String(paperSize ?? ""),
            paper: String(paper ?? ""),
            cover: String(cover ?? ""),
        });
        res.json(ApiResponse.success({ suppliers: result }));
    }

    getAggregatedOptions = async (req: AuthRequest, res: Response) => {
        const result = await this.supplierService.getAggregatedOptions();
        res.json(ApiResponse.success(result));
    }

    getPriceOptions = async (req: AuthRequest, res: Response) => {
        const { paperSize, paper, cover } = req.query;
        const result = await this.supplierService.getPriceOptions({
            paperSize: String(paperSize ?? ""),
            paper: String(paper ?? ""),
            cover: String(cover ?? ""),
        });
        res.json(ApiResponse.success(result));
    }

    updateSupplierOptions = async (req: AuthRequest, res: Response) => {
        const id = parseInt(String(req.params.id));
        const { paperSizeOptions, paperOptions, coverOptions } = req.body;
        await this.supplierService.updateSupplierOptions(id, { paperSizeOptions, paperOptions, coverOptions });
        res.json(ApiResponse.success({ id, updated: true }));
    };
}