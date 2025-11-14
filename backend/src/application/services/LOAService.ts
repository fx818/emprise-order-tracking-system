// application/services/LoaService.ts
import { promises as fs } from 'fs';
import { PrismaLoaRepository } from '../../infrastructure/persistence/repositories/PrismaLoaRepository';
import { PrismaTenderRepository } from '../../infrastructure/persistence/repositories/PrismaTenderRepository';
import { PrismaOtherDocumentRepository } from '../../infrastructure/persistence/repositories/PrismaOtherDocumentRepository';
import { PrismaBillRepository } from '../../infrastructure/persistence/repositories/PrismaBillRepository';
import { S3Service } from '../../infrastructure/services/S3Service';
import { CreateLoaDto } from '../dtos/loa/CreateLoaDto';
import { UpdateLoaDto } from '../dtos/loa/UpdateLoaDto';
import { CreateAmendmentDto } from '../dtos/loa/CreateAmendmentDto';
import { UpdateAmendmentDto } from '../dtos/loa/UpdateAmendmentDto';
import { CreateOtherDocumentDto } from '../dtos/loa/CreateOtherDocumentDto';
import { UpdateOtherDocumentDto } from '../dtos/loa/UpdateOtherDocumentDto';
import { UpdateStatusDto } from '../dtos/loa/UpdateStatusDto';
import { Result, ResultUtils } from '../../shared/types/common.types';
import { LoaValidator } from '../validators/loa.validator';
import { AppError } from '../../shared/errors/AppError';
import { FinancialCalculationService } from './FinancialCalculationService';
import path from 'path';

export class LoaService {
    private validator: LoaValidator;

    constructor(
        private repository: PrismaLoaRepository,
        private tenderRepository: PrismaTenderRepository,
        private otherDocumentRepository: PrismaOtherDocumentRepository,
        private billRepository: PrismaBillRepository,
        private storageService: S3Service,
        private financialService: FinancialCalculationService
    ) {
        this.validator = new LoaValidator();
    }

    private async processDocument(file: Express.Multer.File): Promise<string> {
        try {
          // Generate unique filename
          const fileExtension = path.extname(file.originalname);
          const fileName = `loas/${crypto.randomUUID()}${fileExtension}`;
    
          // Read file buffer
          const fileBuffer = await fs.readFile(file.path);
    
          // Upload to S3
          const documentUrl = await this.storageService.uploadFile(
            fileName,
            fileBuffer,
            file.mimetype
          );
    
          return documentUrl;
        } catch (error) {
          console.error('Error processing document:', error);
          throw new Error('Failed to process document');
        }
    }

    async createLoa(dto: CreateLoaDto): Promise<Result<any>> {
        try {
            // Step 1: Validate the input data
            const validationResult = this.validator.validate(dto);
            if (!validationResult.isSuccess) {
                return ResultUtils.fail('Validation processing failed');
            }
            
            if (validationResult.data && validationResult.data.length > 0) {
                return ResultUtils.fail('Validation failed', validationResult.data);
            }

            // Step 2: Check for existing LOA with the same number
            const existingLoa = await this.repository.findByLoaNumber(dto.loaNumber);
            if (existingLoa) {
                return ResultUtils.fail('LOA number already exists');
            }

            // Step 2.5: Validate tender if provided and auto-populate EMD
            if (dto.tenderId) {
                const tender = await this.tenderRepository.findById(dto.tenderId);
                if (!tender) {
                    return ResultUtils.fail('Tender not found');
                }

                // Auto-populate EMD from tender if not explicitly set
                if (dto.hasEmd === undefined && tender.hasEMD) {
                    dto.hasEmd = true;
                    if (dto.emdAmount === undefined && tender.emdAmount) {
                        dto.emdAmount = tender.emdAmount;
                    }
                }
            }

            // Step 3: Process and normalize tags
            let tags: string[] = [];
            if (dto.tags) {
                if (Array.isArray(dto.tags)) {
                  tags = dto.tags;
                } else if (typeof dto.tags === 'string') {
                  try {
                    const parsedTags = JSON.parse(dto.tags);
                    if (Array.isArray(parsedTags)) {
                      tags = parsedTags;
                    }
                  } catch (error) {
                    console.warn('Failed to parse tags string, using empty array:', error);
                  }
                }
              }

            // Step 4: Process document files
            const documentUrls = await this.processDocumentFiles(dto);
            if (!documentUrls.success) {
                return ResultUtils.fail(documentUrls.errorMessage || 'Failed to process document files');
            }

            // Step 5: Create LOA record with FDR links and LOA-level billing fields
            const loa = await this.repository.create({
                loaNumber: dto.loaNumber,
                loaValue: dto.loaValue,
                deliveryPeriod: {
                    start: new Date(dto.deliveryPeriod.start).toISOString(),
                    end: new Date(dto.deliveryPeriod.end).toISOString()
                },
                siteId: dto.siteId,
                workDescription: dto.workDescription,
                documentUrl: documentUrls.documentUrl || 'pending',
                tags,
                remarks: dto.remarks,
                tenderNo: dto.tenderNo,
                tenderId: dto.tenderId,
                orderPOC: dto.orderPOC,
                pocId: dto.pocId,
                inspectionAgencyId: dto.inspectionAgencyId,
                fdBgDetails: dto.fdBgDetails,
                hasEmd: dto.hasEmd || false,
                emdAmount: dto.emdAmount,
                sdFdrId: dto.sdFdrId,
                pgFdrId: dto.pgFdrId,
                warrantyPeriodMonths: dto.warrantyPeriodMonths,
                warrantyPeriodYears: dto.warrantyPeriodYears,
                warrantyStartDate: dto.warrantyStartDate ? new Date(dto.warrantyStartDate) : undefined,
                warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : undefined,
                recoverablePending: dto.recoverablePending ?? 0,
                paymentPending: dto.paymentPending ?? 0,
            });

            return ResultUtils.ok(loa);
        } catch (error) {
            console.error('LOA Creation Error:', error);
            return ResultUtils.fail('Failed to create LOA record');
        }
    }

    /**
     * Helper method to process all document files for an LOA
     */
    private async processDocumentFiles(dto: CreateLoaDto): Promise<{
        success: boolean;
        documentUrl?: string;
        errorMessage?: string;
    }> {
        try {
            // Initialize empty URLs
            let documentUrl = '';

            // Process main LOA document
            if (dto.documentFile) {
                try {
                    documentUrl = await this.processDocument(dto.documentFile);
                } catch (error) {
                    console.error('Error processing LOA document file:', error);
                    return {
                        success: false,
                        errorMessage: 'Failed to process LOA document file'
                    };
                }
            }

            return {
                success: true,
                documentUrl
            };
        } catch (error) {
            console.error('Document processing error:', error);
            return {
                success: false,
                errorMessage: 'Unexpected error while processing documents'
            };
        }
    }

    async updateLoa(id: string, dto: UpdateLoaDto): Promise<Result<any>> {
        try {
            const existingLoa = await this.repository.findById(id);
            if (!existingLoa) {
                return ResultUtils.fail('LOA not found');
            }

            // If updating LOA number, check for uniqueness
            if (dto.loaNumber && dto.loaNumber !== existingLoa.loaNumber) {
                const duplicateLoa = await this.repository.findByLoaNumber(dto.loaNumber);
                if (duplicateLoa) {
                    return ResultUtils.fail('LOA number already exists');
                }
            }

            // Validate tender if provided
            if (dto.tenderId !== undefined) {
                if (dto.tenderId) {
                    const tender = await this.tenderRepository.findById(dto.tenderId);
                    if (!tender) {
                        return ResultUtils.fail('Tender not found');
                    }
                }
            }

            // Process files
            let documentUrl = existingLoa.documentUrl;

            if (dto.documentFile) {
                try {
                    documentUrl = await this.processDocument(dto.documentFile);
                } catch (error) {
                    console.error('Error processing document file:', error);
                    return ResultUtils.fail('Failed to process document file');
                }
            }

            // Handle tags
            let tags = existingLoa.tags;
            if (dto.tags) {
                if (typeof dto.tags === 'string') {
                    try {
                        tags = JSON.parse(dto.tags);
                    } catch (error) {
                        console.error('Error parsing tags:', error);
                    }
                } else {
                    tags = dto.tags;
                }
            }

            // Prepare delivery period data if provided
            const deliveryPeriod = dto.deliveryPeriod ? {
                start: new Date(dto.deliveryPeriod.start),
                end: new Date(dto.deliveryPeriod.end)
            } : undefined;

            // Prepare update data
            const updateData: any = {
                loaNumber: dto.loaNumber,
                loaValue: dto.loaValue,
                workDescription: dto.workDescription,
                documentUrl,
                tags,
                deliveryPeriod,
                status: dto.status,
                remarks: dto.remarks,
                tenderNo: dto.tenderNo,
                tenderId: dto.tenderId,
                orderPOC: dto.orderPOC,
                pocId: dto.pocId,
                inspectionAgencyId: dto.inspectionAgencyId,
                fdBgDetails: dto.fdBgDetails,
                hasEmd: dto.hasEmd,
                emdAmount: dto.emdAmount,
                sdFdrId: dto.sdFdrId,
                pgFdrId: dto.pgFdrId,
                warrantyPeriodMonths: dto.warrantyPeriodMonths,
                warrantyPeriodYears: dto.warrantyPeriodYears,
                warrantyStartDate: dto.warrantyStartDate ? new Date(dto.warrantyStartDate) : undefined,
                warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : undefined,
                recoverablePending: dto.recoverablePending,
                paymentPending: dto.paymentPending,
            };

            // Update the LOA
            const updatedLoa = await this.repository.update(id, updateData);

            return ResultUtils.ok(updatedLoa);
        } catch (error) {
            console.error('LOA Update Error:', error);
            return ResultUtils.fail('Failed to update LOA record');
        }
    }

    async deleteLoa(id: string): Promise<Result<void>> {
        try {
            const idValidation = this.validator.validateId(id);
            if (!idValidation.isSuccess) {
                return ResultUtils.fail('Invalid ID format');
            }
    
            const loa = await this.repository.findById(id);
            if (!loa) {
                return ResultUtils.fail('LOA not found');
            }
    
            // Check if LOA has any purchase orders
            if (loa.purchaseOrders && loa.purchaseOrders.length > 0) {
                return ResultUtils.fail('Cannot delete LOA with associated purchase orders');
            }
    
            // First delete all amendments associated with this LOA
            if (loa.amendments && loa.amendments.length > 0) {
                for (const amendment of loa.amendments) {
                    // Delete amendment document if exists
                    // if (amendment.documentUrl) {
                    //     await this.storageService.deleteDocument(amendment.documentUrl);
                    // }
                    await this.repository.deleteAmendment(amendment.id);
                }
            }
    
            // Delete LOA document if exists
            // if (loa.documentUrl) {
            //     await this.storageService.deleteDocument(loa.documentUrl);
            // }
    
            // Finally delete the LOA
            await this.repository.delete(id);
            return ResultUtils.ok(undefined);
        } catch (error) {
            console.error('LOA Deletion Error:', error);
            throw new AppError('Failed to delete LOA record');
        }
    }

    async getLoa(id: string): Promise<Result<any>> {
        try {
            const idValidation = this.validator.validateId(id);
            if (!idValidation.isSuccess) {
                return ResultUtils.fail('Invalid ID format');
            }

            const loa = await this.repository.findById(id);
            if (!loa) {
                return ResultUtils.fail('LOA not found');
            }

            return ResultUtils.ok(loa);
        } catch (error) {
            console.error('LOA Fetch Error:', error);
            throw new AppError('Failed to fetch LOA record');
        }
    }

    async getAllLoas(params: {
        searchTerm?: string;
        page?: number;
        limit?: number;
        siteId?: string;
        zoneId?: string;
        tenderId?: string;
        status?: string;
        minValue?: number;
        maxValue?: number;
        hasEMD?: boolean;
        hasSecurity?: boolean;
        hasPerformanceGuarantee?: boolean;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<Result<{ loas: any[]; total: number; page: number; limit: number; totalPages: number }>> {
        try {
            // Default pagination values
            const page = params.page || 1;
            const limit = params.limit || 10;
            const skip = (page - 1) * limit;

            const filterParams = {
                searchTerm: params.searchTerm,
                siteId: params.siteId,
                zoneId: params.zoneId,
                tenderId: params.tenderId,
                status: params.status,
                minValue: params.minValue,
                maxValue: params.maxValue,
                hasEMD: params.hasEMD,
                hasSecurity: params.hasSecurity,
                hasPerformanceGuarantee: params.hasPerformanceGuarantee
            };

            const [loas, total] = await Promise.all([
                this.repository.findAll({
                    ...filterParams,
                    skip,
                    take: limit,
                    sortBy: params.sortBy,
                    sortOrder: params.sortOrder
                }),
                this.repository.count(filterParams)
            ]);

            const totalPages = Math.ceil(total / limit);

            return ResultUtils.ok({
                loas,
                total,
                page,
                limit,
                totalPages
            });
        } catch (error) {
            console.error('LOAs Fetch Error:', error);
            console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
            throw new AppError('Failed to fetch LOA records');
        }
    }

    async createAmendment(loaId: string, dto: CreateAmendmentDto): Promise<Result<any>> {
        try {
            const validationResult = this.validator.validateAmendment(dto);
            if (!validationResult.isSuccess) {
                return ResultUtils.fail('Validation processing failed');
            }

            const loa = await this.repository.findById(loaId);
            if (!loa) {
                return ResultUtils.fail('LOA not found');
            }

            let documentUrl = '';
            if (dto.documentFile) {
                const fileName = `amendments/${loaId}/${crypto.randomUUID()}${path.extname(dto.documentFile.originalname)}`;
                documentUrl = await this.storageService.uploadFile(
                    fileName,
                    dto.documentFile.buffer,
                    dto.documentFile.mimetype
                );
            }

            let tags: string[] = [];
            if (dto.tags) {
                tags = typeof dto.tags === 'string' 
                    ? JSON.parse(dto.tags) 
                    : dto.tags;
            }

            const amendment = await this.repository.createAmendment({
                amendmentNumber: dto.amendmentNumber,
                documentUrl: documentUrl || 'pending',
                loaId,
                tags
            });

            return ResultUtils.ok(amendment);
        } catch (error) {
            console.error('Amendment Creation Error:', error);
            throw new AppError('Failed to create amendment record');
        }
    }

    async updateAmendment(id: string, dto: UpdateAmendmentDto): Promise<Result<any>> {
        try {
            const existingAmendment = await this.repository.findAmendmentById(id);
            if (!existingAmendment) {
                return ResultUtils.fail('Amendment not found');
            }
    
            let documentUrl = existingAmendment.documentUrl;
            if (dto.documentFile) {
                const fileName = `amendments/${existingAmendment.loaId}/${crypto.randomUUID()}${path.extname(dto.documentFile.originalname)}`;
                documentUrl = await this.storageService.uploadFile(
                    fileName,
                    dto.documentFile.buffer,
                    dto.documentFile.mimetype
                );
            }
    
            let tags = existingAmendment.tags;
            if (dto.tags) {
                tags = typeof dto.tags === 'string' 
                    ? JSON.parse(dto.tags) 
                    : dto.tags;
            }
    
            const updatedAmendment = await this.repository.updateAmendment(id, {
                amendmentNumber: dto.amendmentNumber || existingAmendment.amendmentNumber,
                documentUrl,
                tags
            });
    
            return ResultUtils.ok(updatedAmendment);
        } catch (error) {
            console.error('Amendment Update Error:', error);
            throw new AppError('Failed to update amendment record');
        }
    }

    async deleteAmendment(id: string): Promise<Result<void>> {
        try {
            const amendment = await this.repository.findAmendmentById(id);
            if (!amendment) {
                return ResultUtils.fail('Amendment not found');
            }

            // if (amendment.documentUrl) {
            //     await this.storageService.deleteDocument(amendment.documentUrl);
            // }

            await this.repository.deleteAmendment(id);
            return ResultUtils.ok(undefined);
        } catch (error) {
            console.error('Amendment Deletion Error:', error);
            throw new AppError('Failed to delete amendment record');
        }
    }

    async createOtherDocument(loaId: string, dto: CreateOtherDocumentDto): Promise<Result<any>> {
        try {
            const validationResult = this.validator.validateOtherDocument(dto);
            if (!validationResult.isSuccess) {
                return ResultUtils.fail('Validation processing failed');
            }

            const loa = await this.repository.findById(loaId);
            if (!loa) {
                return ResultUtils.fail('LOA not found');
            }

            let documentUrl = '';
            if (dto.documentFile) {
                const fileName = `loas/other-documents/${crypto.randomUUID()}${path.extname(dto.documentFile.originalname)}`;
                documentUrl = await this.storageService.uploadFile(
                    fileName,
                    dto.documentFile.buffer,
                    dto.documentFile.mimetype
                );
            }

            const otherDocument = await this.otherDocumentRepository.create({
                title: dto.title,
                documentUrl,
                loaId
            });

            return ResultUtils.ok(otherDocument);
        } catch (error) {
            console.error('Other Document Creation Error:', error);
            throw new AppError('Failed to create other document record');
        }
    }

    async updateOtherDocument(id: string, dto: UpdateOtherDocumentDto): Promise<Result<any>> {
        try {
            const existingDocument = await this.otherDocumentRepository.findById(id);
            if (!existingDocument) {
                return ResultUtils.fail('Other document not found');
            }

            let documentUrl = existingDocument.documentUrl;
            if (dto.documentFile) {
                const fileName = `loas/other-documents/${crypto.randomUUID()}${path.extname(dto.documentFile.originalname)}`;
                documentUrl = await this.storageService.uploadFile(
                    fileName,
                    dto.documentFile.buffer,
                    dto.documentFile.mimetype
                );
            }

            const updatedDocument = await this.otherDocumentRepository.update(id, {
                title: dto.title || existingDocument.title,
                documentUrl
            });

            return ResultUtils.ok(updatedDocument);
        } catch (error) {
            console.error('Other Document Update Error:', error);
            throw new AppError('Failed to update other document record');
        }
    }

    async deleteOtherDocument(id: string): Promise<Result<void>> {
        try {
            const document = await this.otherDocumentRepository.findById(id);
            if (!document) {
                return ResultUtils.fail('Other document not found');
            }

            await this.otherDocumentRepository.delete(id);
            return ResultUtils.ok(undefined);
        } catch (error) {
            console.error('Other Document Deletion Error:', error);
            throw new AppError('Failed to delete other document record');
        }
    }

    async updateStatus(id: string, dto: UpdateStatusDto): Promise<Result<any>> {
        try {
            console.log(`Starting status update for LOA ${id} to status ${dto.status}`);
            
            // Step 1: Validate the input data
            const validationResult = this.validator.validateStatusUpdate(dto);
            if (!validationResult.isSuccess) {
                console.log('Validation processing failed');
                return ResultUtils.fail('Validation processing failed');
            }
            
            if (validationResult.data && validationResult.data.length > 0) {
                console.log('Validation errors:', validationResult.data);
                return ResultUtils.fail('Validation failed', validationResult.data);
            }

            // Step 2: Validate the LOA ID
            const idValidation = this.validator.validateId(id);
            if (!idValidation.isSuccess || (idValidation.data && idValidation.data.length > 0)) {
                console.log('Invalid LOA ID format');
                return ResultUtils.fail('Invalid LOA ID format');
            }

            // Step 3: Check if LOA exists
            const existingLoa = await this.repository.findById(id);
            if (!existingLoa) {
                console.log('LOA not found');
                return ResultUtils.fail('LOA not found');
            }
            
            console.log(`Found LOA: ${existingLoa.loaNumber} with current status: ${existingLoa.status || 'undefined'}`);

            // Step 4: Update the status
            console.log(`Updating LOA status to: ${dto.status}`);
            const updatedLoa = await this.repository.update(id, {
                status: dto.status
            });
            
            console.log(`Status updated successfully. New status: ${updatedLoa.status || 'undefined'}`);

            return ResultUtils.ok(updatedLoa);
        } catch (error) {
            console.error('LOA Status Update Error:', error);
            return ResultUtils.fail('Failed to update LOA status');
        }
    }

    /**
     * Get LOA with complete financial calculations from invoices
     * Respects manual overrides for historical data
     */
    async getLoaWithFinancials(id: string): Promise<Result<any>> {
        try {
            const loa = await this.repository.findById(id);
            if (!loa) {
                return ResultUtils.fail('LOA not found');
            }

            // Aggregate invoice totals (calculated from bills)
            const invoiceTotals = await this.financialService.aggregateInvoiceTotals(id);

            // Use manual overrides if available, otherwise use calculated values
            const totalBilled = loa.manualTotalBilled !== null && loa.manualTotalBilled !== undefined
                ? loa.manualTotalBilled
                : invoiceTotals.totalBilled;

            const totalReceived = loa.manualTotalReceived !== null && loa.manualTotalReceived !== undefined
                ? loa.manualTotalReceived
                : invoiceTotals.totalReceived;

            const totalDeducted = loa.manualTotalDeducted !== null && loa.manualTotalDeducted !== undefined
                ? loa.manualTotalDeducted
                : invoiceTotals.totalDeducted;

            // Calculate totalPending using LOA Value as baseline
            // Formula: LOA Value (total receivables) - Received - Deducted
            // This works for both bulk import (manual financials) and bills (calculated)
            const totalPending = loa.loaValue - totalReceived - totalDeducted;

            // Add calculated fields to LOA
            const loaWithFinancials = {
                ...loa,
                totalReceivables: loa.loaValue, // Total receivables = LOA value
                totalBilled,
                totalReceived,
                totalDeducted,
                totalPending,
            };

            return ResultUtils.ok(loaWithFinancials);
        } catch (error) {
            console.error('LOA getLoaWithFinancials error:', error);
            return ResultUtils.fail('Failed to retrieve LOA with financials');
        }
    }

    /**
     * Update the pending split (recoverable vs payment pending)
     */
    async updatePendingSplit(
        id: string,
        recoverablePending: number,
        paymentPending: number
    ): Promise<Result<any>> {
        try {
            // Get LOA with financial totals
            const loaResult = await this.getLoaWithFinancials(id);
            if (!loaResult.isSuccess || !loaResult.data) {
                return ResultUtils.fail('LOA not found');
            }

            const loa = loaResult.data;
            const totalPending = loa.totalPending || 0;

            // Validate the split
            const validation = this.financialService.validatePendingSplit(
                totalPending,
                recoverablePending,
                paymentPending
            );

            if (!validation.valid) {
                return ResultUtils.fail(validation.error || 'Invalid pending split');
            }

            // Update LOA with new pending split
            const updatedLoa = await this.repository.update(id, {
                recoverablePending,
                paymentPending,
            });

            return ResultUtils.ok(updatedLoa);
        } catch (error) {
            console.error('LOA updatePendingSplit error:', error);
            return ResultUtils.fail('Failed to update pending split');
        }
    }

    /**
     * Update manual financial overrides for historical data entry
     * Also updates recoverable pending split if provided
     */
    async updateManualFinancials(
        id: string,
        manualTotalBilled?: number,
        manualTotalReceived?: number,
        manualTotalDeducted?: number,
        recoverablePending?: number
    ): Promise<Result<any>> {
        try {
            const idValidation = this.validator.validateId(id);
            if (!idValidation.isSuccess) {
                return ResultUtils.fail('Invalid ID format');
            }

            const loa = await this.repository.findById(id);
            if (!loa) {
                return ResultUtils.fail('LOA not found');
            }

            // Validate that manual values are non-negative if provided
            if (manualTotalBilled !== undefined && manualTotalBilled < 0) {
                return ResultUtils.fail('Manual total billed cannot be negative');
            }
            if (manualTotalReceived !== undefined && manualTotalReceived < 0) {
                return ResultUtils.fail('Manual total received cannot be negative');
            }
            if (manualTotalDeducted !== undefined && manualTotalDeducted < 0) {
                return ResultUtils.fail('Manual total deducted cannot be negative');
            }

            // Calculate the new totalPending to validate recoverablePending
            const invoiceTotals = await this.financialService.aggregateInvoiceTotals(id);

            const totalBilled = manualTotalBilled !== undefined
                ? manualTotalBilled
                : (loa.manualTotalBilled ?? invoiceTotals.totalBilled);

            const totalReceived = manualTotalReceived !== undefined
                ? manualTotalReceived
                : (loa.manualTotalReceived ?? invoiceTotals.totalReceived);

            const totalDeducted = manualTotalDeducted !== undefined
                ? manualTotalDeducted
                : (loa.manualTotalDeducted ?? invoiceTotals.totalDeducted);

            // Use LOA Value as baseline for pending calculation
            const totalPending = loa.loaValue - totalReceived - totalDeducted;

            // Validate recoverable pending if provided
            if (recoverablePending !== undefined) {
                if (recoverablePending < 0) {
                    return ResultUtils.fail('Recoverable pending cannot be negative');
                }
                // Only validate if totalPending is positive (normal case)
                if (totalPending > 0 && recoverablePending > totalPending) {
                    return ResultUtils.fail(`Recoverable pending (${recoverablePending}) cannot exceed total pending (${totalPending})`);
                }
            }

            // Calculate payment pending (allow negative for overpayment scenarios)
            const finalRecoverablePending = recoverablePending !== undefined ? recoverablePending : loa.recoverablePending;
            const paymentPending = totalPending - finalRecoverablePending;

            // Update LOA with manual values and pending split
            const updateData: any = {
                manualTotalBilled: manualTotalBilled !== undefined ? manualTotalBilled : undefined,
                manualTotalReceived: manualTotalReceived !== undefined ? manualTotalReceived : undefined,
                manualTotalDeducted: manualTotalDeducted !== undefined ? manualTotalDeducted : undefined,
            };

            // Only update pending split if recoverablePending was provided
            if (recoverablePending !== undefined) {
                updateData.recoverablePending = recoverablePending;
                updateData.paymentPending = paymentPending;
            }

            await this.repository.update(id, updateData);

            // Return LOA with both manual and calculated financials
            return await this.getLoaWithFinancials(id);
        } catch (error) {
            console.error('LOA updateManualFinancials error:', error);
            return ResultUtils.fail('Failed to update manual financial overrides');
        }
    }

    /**
     * Get general FDRs linked to an LOA
     */
    async getGeneralFdrsForLoa(loaId: string): Promise<Result<any[]>> {
        try {
            // Verify LOA exists
            const loa = await this.repository.findById(loaId);
            if (!loa) {
                return ResultUtils.fail('LOA not found');
            }

            const fdrs = await this.repository.findGeneralFdrs(loaId);
            return ResultUtils.ok(fdrs);
        } catch (error) {
            console.error('LOA getGeneralFdrsForLoa error:', error);
            return ResultUtils.fail('Failed to fetch general FDRs for LOA');
        }
    }

    /**
     * Link an existing FDR to an LOA
     */
    async linkGeneralFdr(loaId: string, fdrId: string, userId?: string): Promise<Result<void>> {
        try {
            // Verify LOA exists
            const loa = await this.repository.findById(loaId);
            if (!loa) {
                return ResultUtils.fail('LOA not found');
            }

            // Verify FDR exists (assuming there's an FDR repository)
            // TODO: Add FDR existence check when FDR repository is available

            // Check if already linked
            const isLinked = await this.repository.isGeneralFdrLinked(loaId, fdrId);
            if (isLinked) {
                return ResultUtils.fail('FDR is already linked to this LOA');
            }

            await this.repository.linkGeneralFdr(loaId, fdrId, userId);
            return ResultUtils.ok(undefined);
        } catch (error) {
            console.error('LOA linkGeneralFdr error:', error);
            return ResultUtils.fail('Failed to link FDR to LOA');
        }
    }

    /**
     * Unlink an FDR from an LOA
     */
    async unlinkGeneralFdr(loaId: string, fdrId: string): Promise<Result<void>> {
        try {
            // Verify LOA exists
            const loa = await this.repository.findById(loaId);
            if (!loa) {
                return ResultUtils.fail('LOA not found');
            }

            // Check if linked
            const isLinked = await this.repository.isGeneralFdrLinked(loaId, fdrId);
            if (!isLinked) {
                return ResultUtils.fail('FDR is not linked to this LOA');
            }

            await this.repository.unlinkGeneralFdr(loaId, fdrId);
            return ResultUtils.ok(undefined);
        } catch (error) {
            console.error('LOA unlinkGeneralFdr error:', error);
            return ResultUtils.fail('Failed to unlink FDR from LOA');
        }
    }
}