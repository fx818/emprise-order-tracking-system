// application/services/InspectionAgencyService.ts
import { PrismaInspectionAgencyRepository } from '../../infrastructure/persistence/repositories/PrismaInspectionAgencyRepository';
import { Result, ResultUtils } from '../../shared/types/common.types';
import { AppError } from '../../shared/errors/AppError';
import { InspectionAgency } from '../../domain/entities/InspectionAgency';
import type { CreateInspectionAgencyDto, UpdateInspectionAgencyDto } from '../../infrastructure/persistence/repositories/PrismaInspectionAgencyRepository';

export class InspectionAgencyService {
  constructor(private repository: PrismaInspectionAgencyRepository) {}

  async createInspectionAgency(dto: CreateInspectionAgencyDto): Promise<Result<InspectionAgency>> {
    try {
      // Validate input
      if (!dto.name || dto.name.trim().length === 0) {
        return ResultUtils.fail('Inspection agency name is required');
      }

      // Check if inspection agency with same name already exists
      const existingAgency = await this.repository.findByName(dto.name.trim());
      if (existingAgency) {
        return ResultUtils.fail('Inspection agency with this name already exists');
      }

      const agency = await this.repository.create({ name: dto.name.trim() });
      return ResultUtils.ok(agency);
    } catch (error) {
      console.error('Inspection Agency Creation Error:', error);
      throw new AppError('Failed to create inspection agency');
    }
  }

  async updateInspectionAgency(id: string, dto: UpdateInspectionAgencyDto): Promise<Result<InspectionAgency>> {
    try {
      const agency = await this.repository.findById(id);
      if (!agency) {
        return ResultUtils.fail('Inspection agency not found');
      }

      if (dto.name) {
        if (dto.name.trim().length === 0) {
          return ResultUtils.fail('Inspection agency name cannot be empty');
        }

        // Check if another inspection agency with same name exists
        const existingAgency = await this.repository.findByName(dto.name.trim());
        if (existingAgency && existingAgency.id !== id) {
          return ResultUtils.fail('Inspection agency with this name already exists');
        }
      }

      const updatedAgency = await this.repository.update(id, { name: dto.name?.trim() });
      return ResultUtils.ok(updatedAgency);
    } catch (error) {
      console.error('Inspection Agency Update Error:', error);
      throw new AppError('Failed to update inspection agency');
    }
  }

  async deleteInspectionAgency(id: string): Promise<Result<void>> {
    try {
      const agency = await this.repository.findById(id);
      if (!agency) {
        return ResultUtils.fail('Inspection agency not found');
      }

      await this.repository.delete(id);
      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('Inspection Agency Deletion Error:', error);
      throw new AppError('Failed to delete inspection agency');
    }
  }

  async getInspectionAgency(id: string): Promise<Result<InspectionAgency>> {
    try {
      const agency = await this.repository.findById(id);
      if (!agency) {
        return ResultUtils.fail('Inspection agency not found');
      }

      return ResultUtils.ok(agency);
    } catch (error) {
      console.error('Inspection Agency Fetch Error:', error);
      throw new AppError('Failed to fetch inspection agency');
    }
  }

  async getAllInspectionAgencies(params: {
    searchTerm?: string;
    page?: number;
    limit?: number;
  }): Promise<Result<{ inspectionAgencies: InspectionAgency[]; total: number }>> {
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
      console.error('Inspection Agencies Fetch Error:', error);
      throw new AppError('Failed to fetch inspection agencies');
    }
  }
}
