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
      const validationResult = this.validator.validate(dto);
      if (!validationResult.isSuccess) {
        return ResultUtils.fail('Validation processing failed');
      }

      if (validationResult.data && validationResult.data.length > 0) {
        return ResultUtils.fail('Validation failed', validationResult.data);
      }

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
      const vendor = await this.repository.findById(id);
      if (!vendor) {
        return ResultUtils.fail('Vendor not found');
      }

      await this.repository.delete(id);
      return ResultUtils.ok(undefined);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : (typeof error === 'string' ? error : 'Failed to delete vendor');
      throw new AppError(`Failed to delete vendor. ${message}`);
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
