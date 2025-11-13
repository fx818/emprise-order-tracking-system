import { PrismaTenderRepository } from '../../infrastructure/persistence/repositories/PrismaTenderRepository';
import { PrismaLoaRepository } from '../../infrastructure/persistence/repositories/PrismaLoaRepository';
import { S3Service } from '../../infrastructure/services/S3Service';
import { CreateTenderDto } from '../dtos/tender/CreateTenderDto';
import { UpdateTenderDto } from '../dtos/tender/UpdateTenderDto';
import { TenderResponseDto } from '../dtos/tender/TenderResponseDto';
import { TenderStatus, EMDReturnStatus } from '@prisma/client';
import { AppError } from '../../shared/errors/AppError';
import { Tender } from '../../domain/entities/Tender';

interface ServiceResult<T> {
  isSuccess: boolean;
  data?: T;
  error?: string;
}

export class TenderService {
  constructor(
    private repository: PrismaTenderRepository,
    private loaRepository: PrismaLoaRepository,
    private s3Service: S3Service
  ) { }

  async createTender(dto: CreateTenderDto): Promise<TenderResponseDto> {
    try {
      // Check if tender number already exists
      const existingTender = await this.repository.findByTenderNumber(dto.tenderNumber);
      if (existingTender) {
        throw new AppError('Tender number already exists', 400);
      }

      let documentUrl: string | undefined;
      let nitDocumentUrl: string | undefined;
      let emdDocumentUrl: string | undefined;

      // If document file is provided, upload to S3
      if (dto.documentFile) {
        try {
          const filename = `${dto.tenderNumber}-tender-${Date.now().toString()}`;
          const uploadResult = await this.s3Service.uploadFile(
            filename,
            dto.documentFile.buffer,
            dto.documentFile.mimetype
          );
          documentUrl = uploadResult;
        } catch (uploadError) {
          console.error('Error uploading tender document file to S3:', uploadError);
          throw new AppError('Failed to upload tender document file', 500);
        }
      }

      // If NIT document file is provided, upload to S3
      if (dto.nitDocumentFile) {
        try {
          const filename = `${dto.tenderNumber}-nit-${Date.now().toString()}`;
          const uploadResult = await this.s3Service.uploadFile(
            filename,
            dto.nitDocumentFile.buffer,
            dto.nitDocumentFile.mimetype
          );
          nitDocumentUrl = uploadResult;
        } catch (uploadError) {
          console.error('Error uploading NIT document file to S3:', uploadError);
          // Clean up tender document if already uploaded
          if (documentUrl) {
            try {
              await this.s3Service.deleteFile(documentUrl);
            } catch (deleteError) {
              console.error('Failed to delete tender document after NIT upload error:', deleteError);
            }
          }
          throw new AppError('Failed to upload NIT document file', 500);
        }
      }

      // If EMD document file is provided, upload to S3
      if (dto.emdDocumentFile) {
        try {
          const filename = `${dto.tenderNumber}-emd-${Date.now().toString()}`;
          const uploadResult = await this.s3Service.uploadFile(
            filename,
            dto.emdDocumentFile.buffer,
            dto.emdDocumentFile.mimetype
          );
          emdDocumentUrl = uploadResult;
        } catch (uploadError) {
          console.error('Error uploading EMD document file to S3:', uploadError);
          // Clean up previously uploaded files
          if (documentUrl) {
            try {
              await this.s3Service.deleteFile(documentUrl);
            } catch (deleteError) {
              console.error('Failed to delete tender document:', deleteError);
            }
          }
          if (nitDocumentUrl) {
            try {
              await this.s3Service.deleteFile(nitDocumentUrl);
            } catch (deleteError) {
              console.error('Failed to delete NIT document:', deleteError);
            }
          }
          throw new AppError('Failed to upload EMD document file', 500);
        }
      }

      try {
        // Ensure proper type conversion for all fields
        const hasEMD = typeof dto.hasEMD === 'string'
          ? (dto.hasEMD as string).toLowerCase() === 'true'
          : !!dto.hasEMD;

        let emdAmount: number | undefined = undefined;
        if (hasEMD && dto.emdAmount !== undefined && dto.emdAmount !== null) {
          emdAmount = typeof dto.emdAmount === 'string'
            ? parseFloat(dto.emdAmount)
            : dto.emdAmount;
        }

        const tender = await this.repository.create({
          tenderNumber: dto.tenderNumber,
          dueDate: typeof dto.dueDate === 'string' ? new Date(dto.dueDate) : dto.dueDate,
          description: dto.description,
          hasEMD,
          emdAmount,
          emdBankName: dto.emdBankName,
          emdSubmissionDate: dto.emdSubmissionDate ? (typeof dto.emdSubmissionDate === 'string' ? new Date(dto.emdSubmissionDate) : dto.emdSubmissionDate) : undefined,
          emdMaturityDate: dto.emdMaturityDate ? (typeof dto.emdMaturityDate === 'string' ? new Date(dto.emdMaturityDate) : dto.emdMaturityDate) : undefined,
          emdDocumentUrl,
          emdReleaseStatus: hasEMD ? EMDReturnStatus.PENDING : undefined,
          status: dto.status || TenderStatus.ACTIVE,
          documentUrl,
          nitDocumentUrl,
          tags: dto.tags || [],
          siteId: dto.siteId
        });

        return this.mapToResponseDto(tender);
      } catch (dbError) {
        console.error('Error creating tender in database:', dbError);
        // If we uploaded files but failed to create the tender, clean up the files
        if (documentUrl) {
          try {
            await this.s3Service.deleteFile(documentUrl);
          } catch (deleteError) {
            console.error('Failed to delete tender document after tender creation error:', deleteError);
          }
        }
        if (nitDocumentUrl) {
          try {
            await this.s3Service.deleteFile(nitDocumentUrl);
          } catch (deleteError) {
            console.error('Failed to delete NIT document after tender creation error:', deleteError);
          }
        }
        if (emdDocumentUrl) {
          try {
            await this.s3Service.deleteFile(emdDocumentUrl);
          } catch (deleteError) {
            console.error('Failed to delete EMD document after tender creation error:', deleteError);
          }
        }
        throw new AppError('Failed to create tender in database', 500);
      }
    } catch (error) {
      console.error('Tender creation failed:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create tender, Server error from backend', 500);
    }
  }
  async updateTender(id: string, dto: UpdateTenderDto): Promise<TenderResponseDto> {
    try {
      // --- STEP 1: Check tender existence
      const tender = await this.repository.findById(id);
      if (!tender) {
        throw new AppError('Tender not found', 404);
      }

      let documentUrl = tender.documentUrl;
      let nitDocumentUrl = tender.nitDocumentUrl;
      let emdDocumentUrl = tender.emdDocumentUrl;

      // --- STEP 2: Handle file uploads safely
      try {
        // Tender Document
        if (dto.documentFile) {
          if (tender.documentUrl) {
            await this.s3Service.deleteFile(tender.documentUrl);
          }
          const filename = `${tender.tenderNumber}-tender-${Date.now()}`;
          documentUrl = await this.s3Service.uploadFile(
            filename,
            dto.documentFile.buffer,
            dto.documentFile.mimetype
          );
        }

        // NIT Document
        if (dto.nitDocumentFile) {
          if (tender.nitDocumentUrl) {
            await this.s3Service.deleteFile(tender.nitDocumentUrl);
          }
          const filename = `${tender.tenderNumber}-nit-${Date.now()}`;
          nitDocumentUrl = await this.s3Service.uploadFile(
            filename,
            dto.nitDocumentFile.buffer,
            dto.nitDocumentFile.mimetype
          );
        }

        // EMD Document
        if (dto.emdDocumentFile) {
          if (tender.emdDocumentUrl) {
            await this.s3Service.deleteFile(tender.emdDocumentUrl);
          }
          const filename = `${tender.tenderNumber}-emd-${Date.now()}`;
          emdDocumentUrl = await this.s3Service.uploadFile(
            filename,
            dto.emdDocumentFile.buffer,
            dto.emdDocumentFile.mimetype
          );
        }
      } catch (fileError: any) {
        console.error('S3 File Handling Error:', fileError);
        throw new AppError('Error uploading tender documents to storage. Please try again.', 500);
      }

      // --- STEP 3: Validate unique tender number
      if (dto.tenderNumber && dto.tenderNumber !== tender.tenderNumber) {
        const existingTender = await this.repository.findByTenderNumber(dto.tenderNumber);
        if (existingTender) {
          throw new AppError('Tender number already exists', 400);
        }
      }

      // --- STEP 4: Convert and validate fields safely
      const hasEMD =
        dto.hasEMD !== undefined
          ? (typeof dto.hasEMD === 'string'
            ? dto.hasEMD.toLowerCase() === 'true'
            : !!dto.hasEMD)
          : tender.hasEMD;

      let emdAmount: number | undefined = undefined;
      if (hasEMD) {
        if (dto.emdAmount !== undefined && dto.emdAmount !== null) {
          emdAmount =
            typeof dto.emdAmount === 'string'
              ? parseFloat(dto.emdAmount)
              : dto.emdAmount;
        } else {
          emdAmount = tender.emdAmount;
        }
      }

      let emdReleaseAmount: number | undefined = undefined;
      if (dto.emdReleaseAmount !== undefined && dto.emdReleaseAmount !== null) {
        emdReleaseAmount =
          typeof dto.emdReleaseAmount === 'string'
            ? parseFloat(dto.emdReleaseAmount)
            : dto.emdReleaseAmount;
      }

      // --- STEP 5: Perform database update
      let updatedTender;
      try {
        updatedTender = await this.repository.update(id, {
          tenderNumber: dto.tenderNumber,
          dueDate: dto.dueDate
            ? new Date(dto.dueDate)
            : undefined,
          description: dto.description,
          hasEMD,
          emdAmount,
          emdBankName: dto.emdBankName,
          emdSubmissionDate: dto.emdSubmissionDate
            ? new Date(dto.emdSubmissionDate)
            : undefined,
          emdMaturityDate: dto.emdMaturityDate
            ? new Date(dto.emdMaturityDate)
            : undefined,
          emdDocumentUrl,
          emdReleaseStatus: dto.emdReleaseStatus,
          emdReleaseDate: dto.emdReleaseDate
            ? new Date(dto.emdReleaseDate)
            : undefined,
          emdReleaseAmount,
          status: dto.status,
          documentUrl,
          nitDocumentUrl,
          tags: dto.tags,
          siteId: dto.siteId,
        });
      } catch (dbError: any) {
        console.error('Database Update Error:', dbError);
        throw new AppError('Database update failed while saving tender details.', 500);
      }

      return this.mapToResponseDto(updatedTender);

    } catch (error: any) {
      console.error('Error in updateTender():', error);

      // --- STEP 6: Detailed error classification
      if (error instanceof AppError) {
        throw error; // known error, preserve message
      }

      if (error.name === 'ValidationError') {
        throw new AppError('Invalid input data. Please check your form values.', 400);
      }

      if (error.code === 'ENOENT') {
        throw new AppError('File not found during upload process.', 404);
      }

      if (error.code === 'NetworkingError' || error.message?.includes('S3')) {
        throw new AppError('S3 storage service is currently unavailable.', 503);
      }

      // --- Fallback for unexpected errors
      throw new AppError('Failed to update tender due to an unexpected server error.', 500);
    }
  }

  async deleteTender(id: string): Promise<void> {
    try {
      // --- STEP 1: Verify tender existence
      const tender = await this.repository.findById(id);
      if (!tender) {
        throw new AppError('Tender not found', 404);
      }

      // --- STEP 2: Check for linked LOAs before deletion
      const associatedLoas = await this.loaRepository.findAll({ tenderId: id });
      if (associatedLoas.length > 0) {
        throw new AppError(
          `Cannot delete tender: ${associatedLoas.length} LOA(s) are associated. Remove them first.`,
          400
        );
      }

      // --- STEP 3: Attempt to delete related files from S3 (safe handling)
      try {
        if (tender.documentUrl) {
          await this.s3Service.deleteFile(tender.documentUrl);
        }
        if (tender.nitDocumentUrl) {
          await this.s3Service.deleteFile(tender.nitDocumentUrl);
        }
        if (tender.emdDocumentUrl) {
          await this.s3Service.deleteFile(tender.emdDocumentUrl);
        }
      } catch (s3Error: any) {
        console.error('S3 Deletion Error:', s3Error);
        throw new AppError('Failed to remove one or more tender files from storage.', 500);
      }

      // --- STEP 4: Attempt tender deletion from DB
      try {
        await this.repository.delete(id);
      } catch (dbError: any) {
        console.error('Database Deletion Error:', dbError);
        throw new AppError('Database operation failed while deleting the tender.', 500);
      }

    } catch (error: any) {
      console.error('Error in deleteTender():', error);

      // --- STEP 5: Smart classification for user-friendly feedback
      if (error instanceof AppError) {
        throw error; // already has status & message
      }

      if (error.code === 'NetworkingError' || error.message?.includes('S3')) {
        throw new AppError('Cloud storage service is currently unavailable.', 503);
      }

      if (error.name === 'ValidationError') {
        throw new AppError('Invalid tender ID or request format.', 400);
      }

      if (error.code === 'ENOENT') {
        throw new AppError('File not found in storage during deletion.', 404);
      }

      // --- Fallback for unexpected issues
      throw new AppError('Failed to delete tender due to an unexpected error.', 500);
    }
  }

  async getTender(id: string): Promise<TenderResponseDto> {
    try {
      // --- STEP 1: Validate ID
      if (!id || typeof id !== 'string') {
        throw new AppError('Invalid tender ID format.', 400);
      }

      // --- STEP 2: Fetch tender
      const tender = await this.repository.findById(id);

      if (!tender) {
        throw new AppError('Tender not found.', 404);
      }

      // --- STEP 3: Return response DTO
      return this.mapToResponseDto(tender);

    } catch (error: any) {
      console.error('Error in getTender():', error);

      // --- STEP 4: Known application errors
      if (error instanceof AppError) {
        throw error;
      }

      // --- STEP 5: Common low-level / infra errors
      if (error.name === 'ValidationError') {
        throw new AppError('Invalid input data provided.', 400);
      }

      if (error.code === 'ECONNREFUSED') {
        throw new AppError('Database connection failed.', 503);
      }

      if (error.message?.includes('timeout')) {
        throw new AppError('Database request timed out. Please try again.', 504);
      }

      // --- STEP 6: Fallback for unexpected errors
      throw new AppError('Failed to fetch tender due to an unexpected error.', 500);
    }
  }

  async getAllTenders(options?: {
    status?: TenderStatus;
    searchTerm?: string;
  }): Promise<{ data: TenderResponseDto[]; total: number }> {
    try {
      // --- STEP 1: Fetch tenders from repository
      const result = await this.repository.findAll(options);

      // --- STEP 2: Validate result structure
      if (!result || !Array.isArray(result.data)) {
        console.warn('Repository returned invalid structure for getAllTenders()');
        return { data: [], total: 0 };
      }

      // --- STEP 3: Map to response DTOs
      return {
        data: result.data.map((tender) => this.mapToResponseDto(tender)),
        total: result.total ?? result.data.length
      };

    } catch (error: any) {
      console.error('Error in getAllTenders():', error);

      // --- STEP 4: Known custom app errors
      if (error instanceof AppError) {
        throw error;
      }

      // --- STEP 5: Common infra errors
      if (error.name === 'ValidationError') {
        throw new AppError('Invalid query parameters provided.', 400);
      }

      if (error.code === 'ECONNREFUSED') {
        throw new AppError('Database connection failed.', 503);
      }

      if (error.message?.includes('timeout')) {
        throw new AppError('Database request timed out. Please try again.', 504);
      }

      // --- STEP 6: Graceful fallback
      throw new AppError('Failed to fetch tenders due to an unexpected error.', 500);
    }
  }

  async updateTenderStatus(id: string, status: TenderStatus): Promise<TenderResponseDto> {
    try {
      // --- STEP 1: Validate input
      if (!id || typeof id !== 'string') {
        throw new AppError('Invalid tender ID format.', 400);
      }
      if (!status) {
        throw new AppError('Tender status is required.', 400);
      }

      // --- STEP 2: Fetch and validate tender existence
      const tender = await this.repository.findById(id);
      if (!tender) {
        throw new AppError('Tender not found.', 404);
      }

      // --- STEP 3: Update tender status
      const updatedTender = await this.repository.update(id, { status });

      return this.mapToResponseDto(updatedTender);

    } catch (error: any) {
      console.error('Error in updateTenderStatus():', error);

      // --- Known errors
      if (error instanceof AppError) throw error;

      // --- Common system-level issues
      if (error.code === 'ECONNREFUSED') {
        throw new AppError('Database connection failed.', 503);
      }
      if (error.message?.includes('timeout')) {
        throw new AppError('Database request timed out. Please try again.', 504);
      }
      if (error.name === 'ValidationError') {
        throw new AppError('Invalid input data for status update.', 400);
      }

      // --- Fallback for unexpected cases
      throw new AppError('Failed to update tender status due to an unexpected error.', 500);
    }
  }


  async updateEMDReleaseStatus(
    id: string,
    emdReleaseStatus: EMDReturnStatus,
    emdReleaseDate?: Date,
    emdReleaseAmount?: number
  ): Promise<TenderResponseDto> {
    try {
      // --- STEP 1: Validate input
      if (!id || typeof id !== 'string') {
        throw new AppError('Invalid tender ID format.', 400);
      }
      if (!emdReleaseStatus) {
        throw new AppError('EMD release status is required.', 400);
      }

      // --- STEP 2: Fetch tender
      const tender = await this.repository.findById(id);
      if (!tender) {
        throw new AppError('Tender not found.', 404);
      }

      // --- STEP 3: Validate that tender has EMD
      if (!tender.hasEMD) {
        throw new AppError('This tender does not have an EMD.', 400);
      }

      // --- STEP 4: Optional validation for release details
      if (emdReleaseStatus === 'RELEASED' && !emdReleaseDate) {
        throw new AppError('EMD release date is required when status is RELEASED.', 400);
      }

      // --- STEP 5: Perform update
      const updatedTender = await this.repository.update(id, {
        emdReleaseStatus,
        emdReleaseDate,
        emdReleaseAmount
      });

      return this.mapToResponseDto(updatedTender);

    } catch (error: any) {
      console.error('Error in updateEMDReleaseStatus():', error);

      // --- Known app errors
      if (error instanceof AppError) throw error;

      // --- Common infra errors
      if (error.code === 'ECONNREFUSED') {
        throw new AppError('Database connection failed.', 503);
      }
      if (error.message?.includes('timeout')) {
        throw new AppError('Database request timed out. Please try again.', 504);
      }
      if (error.name === 'ValidationError') {
        throw new AppError('Invalid data provided for EMD release update.', 400);
      }

      // --- Fallback
      throw new AppError('Failed to update EMD release status due to an unexpected error.', 500);
    }
  }
  async getLoasForTender(tenderId: string) {
    try {
      // --- STEP 1: Validate Input
      if (!tenderId || typeof tenderId !== 'string') {
        throw new AppError('Invalid tender ID format.', 400);
      }

      // --- STEP 2: Verify Tender Existence
      const tender = await this.repository.findById(tenderId);
      if (!tender) {
        throw new AppError('Tender not found.', 404);
      }

      // --- STEP 3: Fetch Associated LOAs
      const loas = await this.loaRepository.findAll({ tenderId });

      // Optional: Return empty array safely if none found
      if (!loas || loas.length === 0) {
        return [];
      }

      return loas;

    } catch (error: any) {
      console.error('Error in getLoasForTender():', error);

      // --- STEP 4: Known application errors
      if (error instanceof AppError) {
        throw error;
      }

      // --- STEP 5: Common infra/database errors
      if (error.code === 'ECONNREFUSED') {
        throw new AppError('Database connection failed.', 503);
      }

      if (error.message?.includes('timeout')) {
        throw new AppError('Database request timed out. Please try again.', 504);
      }

      if (error.name === 'ValidationError') {
        throw new AppError('Invalid input data provided for LOA query.', 400);
      }

      // --- STEP 6: Fallback for unexpected issues
      throw new AppError('Failed to fetch LOAs for tender due to an unexpected error.', 500);
    }
  }


  private mapToResponseDto(tender: Tender): TenderResponseDto {
    return {
      id: tender.id,
      tenderNumber: tender.tenderNumber,
      dueDate: tender.dueDate,
      description: tender.description,
      hasEMD: tender.hasEMD,
      emdAmount: tender.emdAmount,
      emdBankName: tender.emdBankName,
      emdSubmissionDate: tender.emdSubmissionDate,
      emdMaturityDate: tender.emdMaturityDate,
      emdDocumentUrl: tender.emdDocumentUrl,
      emdReleaseStatus: tender.emdReleaseStatus,
      emdReleaseDate: tender.emdReleaseDate,
      emdReleaseAmount: tender.emdReleaseAmount,
      status: tender.status,
      documentUrl: tender.documentUrl,
      nitDocumentUrl: tender.nitDocumentUrl,
      tags: tender.tags,
      siteId: tender.siteId,
      site: tender.site,
      createdAt: tender.createdAt,
      updatedAt: tender.updatedAt
    };
  }
} 