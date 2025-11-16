import { PrismaVendorRepository } from '../../infrastructure/persistence/repositories/PrismaVendorRepository';
import { CreateVendorDto, UpdateVendorDto } from '../dtos/vendor/CreateVendorDto';
import { VendorValidator } from '../validators/vendor.validator';
import { Result, ResultUtils } from '../../shared/types/common.types';
import { AppError } from '../../shared/errors/AppError';

export class VendorService {
  private validator: VendorValidator;

  constructor(private repository: PrismaVendorRepository) {
    this.validator = new VendorValidator();
  }

  async createVendor(dto: CreateVendorDto): Promise<Result<any>> {
    try {

      console.log("before dto is ", dto)
      const validationResult = this.validator.validate(dto);
      if (!validationResult.isSuccess) {
        return ResultUtils.fail('Validation processing failed');
      }

      if (validationResult.data && validationResult.data.length > 0) {
        return ResultUtils.fail('Validation failed', validationResult.data);
      }
      console.log("the dto is ", dto);
      const vendor = await this.repository.create(dto);
      return ResultUtils.ok(vendor);
    } catch (error) {
      console.log('Create vendor error:', error);
      const message = error instanceof Error
        ? error.message
        : (typeof error === 'string' ? error : 'Failed to create vendor');
      throw new AppError(`Failed to create vendor. ${message}`);
    }
  }

  async updateVendor(id: string, dto: UpdateVendorDto): Promise<Result<any>> {
    try {
      const idValidation = this.validator.validateId(id);
      if (!idValidation.isSuccess) {
        return ResultUtils.fail('Invalid ID format');
      }

      const existingVendor = await this.repository.findById(id);
      if (!existingVendor) {
        return ResultUtils.fail('Vendor not found');
      }

      const vendor = await this.repository.update(id, dto);
      return ResultUtils.ok(vendor);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : (typeof error === 'string' ? error : 'Failed to update vendor');
      throw new AppError(`Failed to update vendor. ${message}`);
    }
  }
  async deleteVendor(id: string): Promise<Result<void>> {
    try {
      // 1️⃣ Check existence
      const vendor = await this.repository.findById(id);
      if (!vendor) {
        return ResultUtils.fail('The selected vendor does not exist or may have already been deleted.');
      }

      // 2️⃣ Attempt deletion
      try {
        await this.repository.delete(id);
      } catch (dbError: any) {
        console.error("❌ Vendor DB deletion error:", dbError);

        // Prisma error: https://www.prisma.io/docs/reference/api-reference/error-reference
        if (dbError.code === "P2003") {
          // Foreign key constraint violation – vendor is used somewhere
          return ResultUtils.fail(
            "This vendor cannot be deleted because it is linked to other records (purchase orders, items, etc.). Remove dependencies first."
          );
        }

        if (dbError.code === "P2025") {
          // Record not found during deletion
          return ResultUtils.fail(
            "Vendor not found. It may have already been deleted."
          );
        }

        // Unknown DB failure
        return ResultUtils.fail(
          `Database error occurred while deleting vendor. Please retry.`
        );
      }

      // 3️⃣ Successful deletion
      return ResultUtils.ok(undefined);

    } catch (error: any) {
      console.error("🔥 Unexpected Vendor Deletion Failure:", {
        vendorId: id,
        errorMessage: error?.message || error,
        stack: error?.stack,
      });

      // Throw clean AppError (NOT raw error)
      throw new AppError(
        "An unexpected system error occurred while processing vendor deletion. Please try again or contact support.",
        500
      );
    }
  }

  async getVendor(id: string): Promise<Result<any>> {
    try {
      const vendor = await this.repository.findById(id);
      if (!vendor) {
        return ResultUtils.fail('Vendor not found');
      }

      return ResultUtils.ok(vendor);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : (typeof error === 'string' ? error : 'Failed to fetch vendor');
      throw new AppError(`Failed to fetch vendor. ${message}`);
    }
  }

  async getAllVendors(params: {
    searchTerm?: string;
  }): Promise<Result<{ vendors: any[]; total: number }>> {
    try {
      const [vendors, total] = await Promise.all([
        this.repository.findAll({ searchTerm: params.searchTerm }),
        this.repository.count({ searchTerm: params.searchTerm })
      ]);

      return ResultUtils.ok({
        vendors,
        total
      });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : (typeof error === 'string' ? error : 'Failed to fetch vendors');
      throw new AppError(`Failed to fetch vendors. ${message}`);
    }
  }
}
