import { injectable, inject } from "tsyringe";
import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { ApiResponse } from "../middleware/api.response.js";
import { ISampleBookService } from "../services/sample-book.service.js";

@injectable()
export class SampleBookController {
  constructor(
    @inject("ISampleBookService") private readonly sampleBookService: ISampleBookService,
  ) {}

  list = async (req: AuthRequest, res: Response) => {
    const { type, category, isActive } = req.query;
    const filters: any = {};
    if (type) filters.type = String(type);
    if (category) filters.category = String(category);
    if (isActive !== undefined) filters.isActive = isActive === "true";
    const items = await this.sampleBookService.list(filters);
    res.json(ApiResponse.success(items));
  };

  getById = async (req: AuthRequest, res: Response) => {
    const id = parseInt(String(req.params.id));
    const item = await this.sampleBookService.getById(id);
    res.json(ApiResponse.success(item));
  };

  create = async (req: AuthRequest, res: Response) => {
    const adminId = parseInt(req.userId!);
    const item = await this.sampleBookService.create(adminId, req.body);
    res.status(201).json(ApiResponse.success(item));
  };

  update = async (req: AuthRequest, res: Response) => {
    const id = parseInt(String(req.params.id));
    const item = await this.sampleBookService.update(id, req.body);
    res.json(ApiResponse.success(item));
  };

  remove = async (req: AuthRequest, res: Response) => {
    const id = parseInt(String(req.params.id));
    await this.sampleBookService.remove(id);
    res.json(ApiResponse.message("Sample book deleted"));
  };
}