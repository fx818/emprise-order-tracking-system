// application/services/SiteService.ts
import { PrismaSiteRepository } from '../../infrastructure/persistence/repositories/PrismaSiteRepository';
import { CreateSiteDto, UpdateSiteDto } from '../dtos/site/SiteDto';
import { Result, ResultUtils } from '../../shared/types/common.types';
import { SiteValidator } from '../validators/site.validator';
import { AppError } from '../../shared/errors/AppError';
import { Site } from '../../domain/entities/Site';
import { POStatus } from '@prisma/client';

export class SiteService {
  private validator: SiteValidator;

  constructor(private repository: PrismaSiteRepository) {
    this.validator = new SiteValidator();
  }
  async createSite(dto: CreateSiteDto): Promise<Result<Site>> {
    try {
      // -------------------------
      // 1. Input Validation
      // -------------------------
      const validationResult = this.validator.validate(dto);

      if (!validationResult.isSuccess || (validationResult.data && validationResult.data.length > 0)) {
        return ResultUtils.fail(
          "Validation failed",
          validationResult.data // array of errors to frontend
        );
      }

      // -------------------------
      // 2. Generate Code (optional)
      // -------------------------
      if (!dto.code) {
        dto.code = await this.generateSiteCode(dto.zoneId);
      }

      // -------------------------
      // 3. Create Site in DB
      // -------------------------
      const site = await this.repository.create(dto);
      return ResultUtils.ok(site);

    } catch (error: any) {
      console.error("Site Creation Error:", error);

      // -------------------------
      // Known Error Types Handling
      // -------------------------

      // Prisma Known Errors
      if (error.code === "P2002") {
        // Unique constraint failed
        return ResultUtils.fail("A site with this code already exists.");
      }

      if (error.code === "P2003") {
        // Foreign key constraint
        return ResultUtils.fail("Invalid zoneId. Matching zone not found.");
      }

      if (error.code === "P2025") {
        // Required record not found
        return ResultUtils.fail("Record not found while creating site.");
      }

      // Validation Errors Thrown Manually
      if (error instanceof AppError) {
        return ResultUtils.fail(error.message);
      }

      // -------------------------
      // Unknown / Unexpected Errors
      // -------------------------
      return ResultUtils.fail(
        "Something went wrong while creating the site. Please try again.",
        process.env.NODE_ENV === "development" ? error.message : undefined
      );
    }
  }
  async updateSite(id: string, dto: UpdateSiteDto): Promise<Result<Site>> {
    try {
      // -------------------------
      // 1. Check if site exists
      // -------------------------
      const existingSite = await this.repository.findById(id);

      if (!existingSite) {
        return ResultUtils.fail("Site not found");
      }

      // -------------------------
      // 2. Validate Update DTO
      // -------------------------
      const validationResult = this.validator.validateUpdate(dto);

      if (!validationResult.isSuccess || (validationResult.data && validationResult.data?.length > 0)) {
        return ResultUtils.fail(
          "Validation failed",
          validationResult.data // return validation errors to user
        );
      }

      // -------------------------
      // 3. Update
      // -------------------------
      const updatedSite = await this.repository.update(id, dto);
      return ResultUtils.ok(updatedSite);

    } catch (error: any) {
      console.error("Site Update Error:", error);

      // -------------------------
      // Known Prisma Error Handlers
      // -------------------------

      // Unique constraint (e.g., code already exists)
      if (error.code === "P2002") {
        return ResultUtils.fail("Another site already exists with these unique fields.");
      }

      // Foreign key constraint (e.g., new zoneId doesn't exist)
      if (error.code === "P2003") {
        return ResultUtils.fail("Invalid zoneId. Matching zone not found.");
      }

      // Record not found
      if (error.code === "P2025") {
        return ResultUtils.fail("Site not found or already deleted.");
      }

      // -------------------------
      // Known Custom Error
      // -------------------------
      if (error instanceof AppError) {
        return ResultUtils.fail(error.message, (error as any).details);
      }

      // -------------------------
      // Unknown Errors (Safe Mode)
      // -------------------------
      return ResultUtils.fail(
        "Something went wrong while updating the site. Please try again.",
        process.env.NODE_ENV === "development" ? error.message : undefined
      );
    }
  }

  async deleteSite(id: string): Promise<Result<void>> {
    try {
      // -------------------------
      // 1. Check if site exists
      // -------------------------
      const site = await this.repository.findById(id);
      if (!site) {
        return ResultUtils.fail("Site not found");
      }

      // -------------------------
      // 2. Delete Site
      // -------------------------
      await this.repository.delete(id);
      return ResultUtils.ok(undefined);

    } catch (error: any) {
      console.error("Site Deletion Error:", error);

      // -------------------------
      // Prisma Known Errors
      // -------------------------

      // P2003 - Foreign key constraint violation (site is used in another table)
      if (error.code === "P2003") {
        return ResultUtils.fail(
          "Cannot delete this site because it is referenced by other records."
        );
      }

      // P2025 - Record not found (already deleted by someone else)
      if (error.code === "P2025") {
        return ResultUtils.fail("Site not found or already deleted.");
      }

      // P2002 - Unique constraint (rare when deleting but still safe)
      if (error.code === "P2002") {
        return ResultUtils.fail("Unable to delete site due to a unique constraint conflict.");
      }

      // -------------------------
      // Custom AppError
      // -------------------------
      if (error instanceof AppError) {
        return ResultUtils.fail(error.message, (error as any).details);
      }

      // -------------------------
      // Unknown Error (safe mode)
      // -------------------------
      return ResultUtils.fail(
        "Something went wrong while deleting the site. Please try again.",
        process.env.NODE_ENV === "development" ? error.message : undefined
      );
    }
  }


  async getSite(id: string): Promise<Result<Site>> {
    try {
      const site = await this.repository.findById(id);
      if (!site) {
        return ResultUtils.fail('Site not found');
      }

      return ResultUtils.ok(site);
    } catch (error) {
      console.error('Site Fetch Error:', error);
      throw new AppError('Failed to fetch site');
    }
  }

  async getAllSites(params: {
    status?: string;
    zoneId?: string;
    searchTerm?: string;
    page?: number;
    limit?: number;
  }): Promise<Result<{ sites: Site[]; total: number }>> {
    try {
      // Convert page/limit to skip/take for repository
      const page = params.page || 1;
      const limit = params.limit || 10;
      const skip = (page - 1) * limit;

      const [sites, total] = await Promise.all([
        this.repository.findAll({
          ...params,
          skip,
          take: limit
        }),
        this.repository.count(params)
      ]);

      return ResultUtils.ok({
        sites: sites.sites,
        total
      });
    } catch (error) {
      console.error('Sites Fetch Error:', error);
      throw new AppError('Failed to fetch sites');
    }
  }

  private async generateSiteCode(zoneId: string): Promise<string> {
    try {
      const latestSite = await this.repository.findLatestSiteCode(zoneId);

      if (!latestSite) {
        // First site for this customer, start with 001
        return `${zoneId.slice(0, 5)}/SITE/001`;
      }

      // Extract the number part and increment it
      const parts = latestSite.split('/');
      if (parts.length === 3) {
        const nextNumber = (parseInt(parts[2]) + 1).toString().padStart(3, '0');
        return `${zoneId.slice(0, 5)}/SITE/${nextNumber}`;
      }

      // Fallback if we can't parse the existing code
      return `${zoneId.slice(0, 5)}/SITE/001`;
    } catch (error) {
      console.error('Error generating site code:', error);
      // Fallback if anything goes wrong
      return `${zoneId.slice(0, 5)}/SITE/001`;
    }
  }

  async getSiteDetails(id: string): Promise<Result<any>> {
    try {
      const site = await this.repository.findById(id);
      if (!site) {
        return ResultUtils.fail('Site not found');
      }

      const stats = await this.repository.getSiteStats(id);

      return ResultUtils.ok({
        ...site,
        stats
      });
    } catch (error) {
      console.error('Site Details Error:', error);
      throw new AppError('Failed to fetch site details');
    }
  }


  async getSiteLoas(id: string, params: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Result<any[]>> {
    try {
      const loas = await this.repository.getLoasForSite(id, params);
      return ResultUtils.ok(loas);
    } catch (error) {
      console.error('Site LOAs Error:', error);
      throw new AppError('Failed to fetch site LOAs');
    }
  }

  async getSitePurchaseOrders(id: string, params: {
    status?: POStatus;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Result<any[]>> {
    try {
      const pos = await this.repository.getPurchaseOrdersForSite(id, params);
      return ResultUtils.ok(pos);
    } catch (error) {
      console.error('Site POs Error:', error);
      throw new AppError('Failed to fetch site purchase orders');
    }
  }

  async getSiteCountsByZone(): Promise<Result<Record<string, number>>> {
    try {
      const counts = await this.repository.getSiteCountsByZone();
      return ResultUtils.ok(counts);
    } catch (error) {
      console.error('Site Counts By Zone Error:', error);
      throw new AppError('Failed to fetch site counts by zone');
    }
  }
}