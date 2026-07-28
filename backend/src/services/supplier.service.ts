import { injectable, inject } from "tsyringe";
import { BaseService } from "../utils/base.service.js";
import { SupplierDTO, SupplierMapper } from "../dto/supplier/supplier.dto.js";
import { CreateSupplierDTO } from "../dto/supplier/supplier.create.dto.js";
import { UpdateSupplierDTO } from "../dto/supplier/supplier.update.dto.js";

export abstract class ISupplierService {
  abstract getSupplierList(): Promise<SupplierDTO[]>;
  abstract getSupplierById(id: number): Promise<SupplierDTO>;
  abstract createSupplier(dto: CreateSupplierDTO): Promise<SupplierDTO>;
  abstract updateSupplier(id: number, dto: UpdateSupplierDTO): Promise<void>;
  abstract deleteSupplier(id: number): Promise<void>;
}

@injectable()
export class SupplierService extends ISupplierService {
  constructor(
    @inject("SupplierBaseService") private readonly supplierBase: BaseService<any>,
  ) {
    super();
  }

  async getSupplierList() {
    const { items } = await this.supplierBase.findAll({ limit: 1000, order: "desc" }, { allowedFilterFields: ["status"] });
    return SupplierMapper.toDTOList(items);
  }

  async getSupplierById(id: number) {
    const supplier = await this.supplierBase.findById(id);
    return SupplierMapper.toDTO(supplier);
  }

  async createSupplier(dto: CreateSupplierDTO) {
    const supplier = await this.supplierBase.create({ ...dto, status: "active" });
    return SupplierMapper.toDTO(supplier);
  }

  async updateSupplier(id: number, dto: UpdateSupplierDTO) {
    return await this.supplierBase.update(id, dto);
  }

  async deleteSupplier(id: number) {
    await this.supplierBase.delete(id);
  }
}
