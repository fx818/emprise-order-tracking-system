import { Request, Response } from 'express';
import { VendorService } from '../../../application/services/VendorService';
import { AppError } from '../../../shared/errors/AppError';

export class VendorController {
  constructor(private service: VendorService) { }

  createVendor = async (req: Request, res: Response) => {
    try {
      const vendor = await this.service.createVendor(req.body);

      res.status(201).json({
        status: 'success',
        data: vendor
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create vendor');
    }
  };

  updateVendor = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updatedVendor = await this.service.updateVendor(id, req.body);

      res.json({
        status: 'success',
        data: updatedVendor
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update vendor');
    }
  };
  deleteVendor = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.service.deleteVendor(id);
      console.log('Vendor Deletion Result:', result);

      if (result && !result.isSuccess) {
        const rawError = result.error;
        const errorMsg = Array.isArray(rawError)
          ? rawError.map((e: any) => (typeof e === 'string' ? e : JSON.stringify(e))).join('; ')
          : typeof rawError === 'string'
            ? rawError
            : rawError
              ? String(rawError)
              : 'Unable to delete vendor';

        throw new AppError(errorMsg, 400);
      }

      // 👇 DO NOT return this
      res.status(204).send();
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          status: "error",
          message: error.message
        });
        return;
      }

      console.error("❌ Unexpected Vendor Deletion Controller Error:", {
        errorMessage: error?.message || error,
        stack: error?.stack
      });

      res.status(500).json({
        status: "error",
        message: "An unexpected error occurred while deleting the vendor. Please try again."
      });
    }
  };


  getVendor = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const vendor = await this.service.getVendor(id);

      res.json({
        status: 'success',
        data: vendor
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Vendor not found', 404);
    }
  };

  getAllVendors = async (req: Request, res: Response) => {
    try {
      const { page, limit, search } = req.query;

      const vendors = await this.service.getAllVendors({
        searchTerm: search as string,
        ...(page ? { page: parseInt(page as string) } : {}),
        ...(limit ? { limit: parseInt(limit as string) } : {})
      });

      res.json({
        status: 'success',
        data: vendors
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch vendors');
    }
  };
}