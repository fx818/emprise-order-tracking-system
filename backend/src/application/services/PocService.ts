// application/services/PocService.ts
import { PrismaPocRepository } from '../../infrastructure/persistence/repositories/PrismaPocRepository';
import { Result, ResultUtils } from '../../shared/types/common.types';
import { AppError } from '../../shared/errors/AppError';
import { POC } from '../../domain/entities/POC';
import type { CreatePocDto, UpdatePocDto } from '../../infrastructure/persistence/repositories/PrismaPocRepository';

export class PocService {
  constructor(private repository: PrismaPocRepository) {}

  async createPoc(dto: CreatePocDto): Promise<Result<POC>> {
    try {
      // Validate input
      if (!dto.name || dto.name.trim().length === 0) {
        return ResultUtils.fail('POC name is required');
      }

      // Check if POC with same name already exists
      const existingPoc = await this.repository.findByName(dto.name.trim());
      if (existingPoc) {
        return ResultUtils.fail('POC with this name already exists');
      }

      const poc = await this.repository.create({ name: dto.name.trim() });
      return ResultUtils.ok(poc);
    } catch (error) {
      console.error('POC Creation Error:', error);
      throw new AppError('Failed to create POC');
    }
  }

  async updatePoc(id: string, dto: UpdatePocDto): Promise<Result<POC>> {
    try {
      const poc = await this.repository.findById(id);
      if (!poc) {
        return ResultUtils.fail('POC not found');
      }

      if (dto.name) {
        if (dto.name.trim().length === 0) {
          return ResultUtils.fail('POC name cannot be empty');
        }

        // Check if another POC with same name exists
        const existingPoc = await this.repository.findByName(dto.name.trim());
        if (existingPoc && existingPoc.id !== id) {
          return ResultUtils.fail('POC with this name already exists');
        }
      }

      const updatedPoc = await this.repository.update(id, { name: dto.name?.trim() });
      return ResultUtils.ok(updatedPoc);
    } catch (error) {
      console.error('POC Update Error:', error);
      throw new AppError('Failed to update POC');
    }
  }

  async deletePoc(id: string): Promise<Result<void>> {
    try {
      const poc = await this.repository.findById(id);
      if (!poc) {
        return ResultUtils.fail('POC not found');
      }

      await this.repository.delete(id);
      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('POC Deletion Error:', error);
      throw new AppError('Failed to delete POC');
    }
  }

  async getPoc(id: string): Promise<Result<POC>> {
    try {
      const poc = await this.repository.findById(id);
      if (!poc) {
        return ResultUtils.fail('POC not found');
      }

      return ResultUtils.ok(poc);
    } catch (error) {
      console.error('POC Fetch Error:', error);
      throw new AppError('Failed to fetch POC');
    }
  }

  async getAllPocs(params: {
    searchTerm?: string;
    page?: number;
    limit?: number;
  }): Promise<Result<{ pocs: POC[]; total: number }>> {
    try {
      const page = params.page || 1;
      const limit = params.limit || 1000; // High default limit for dropdown
      const skip = (page - 1) * limit;

      const result = await this.repository.findAll({
        skip,
        take: limit,
        searchTerm: params.searchTerm
      });

      return ResultUtils.ok(result);
    } catch (error) {
      console.error('POCs Fetch Error:', error);
      throw new AppError('Failed to fetch POCs');
    }
  }
}
