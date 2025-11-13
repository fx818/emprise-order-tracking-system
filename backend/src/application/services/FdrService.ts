// application/services/FdrService.ts
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FDRStatus } from '@prisma/client';
import { PrismaFdrRepository } from '../../infrastructure/persistence/repositories/PrismaFdrRepository';
import { S3Service } from '../../infrastructure/services/S3Service';
import { OCRService } from '../../infrastructure/services/OCRService';
import { CreateFdrDto } from '../dtos/fdr/CreateFdrDto';
import { UpdateFdrDto } from '../dtos/fdr/UpdateFdrDto';
import { Result, ResultUtils } from '../../shared/types/common.types';
import { FdrCalculations } from '../../domain/entities/utils/FdrCalculations';
import { AppError } from '../../shared/errors/AppError';

/**
 * FdrService
 *
 * NOTE: Core business logic preserved. This file focuses on improved error handling,
 * validation, safe cleanup, and clearer messages for downstream clients.
 */
export class FdrService {
  constructor(
    private repository: PrismaFdrRepository,
    private storageService: S3Service,
    private ocrService: OCRService,
    private openRouterApiKey?: string
  ) {}

  /**
   * Process document file - upload to S3
   * - Validates file
   * - Reads temp file
   * - Uploads to storage
   * - Cleans up temp file
   */
  private async processDocument(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new AppError('No file provided for processing', 400);
    }

    try {
      // Validate file size & type
      const MAX_FILE_SIZE_MB = 10;
      const ALLOWED_MIME_TYPES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];

      if (typeof file.size !== 'number') {
        throw new AppError('Invalid file size', 400);
      }

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        throw new AppError(`File exceeds maximum size of ${MAX_FILE_SIZE_MB}MB`, 400);
      }

      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new AppError(`Unsupported file type: ${file.mimetype}`, 400);
      }

      // Generate filename
      const fileExtension = path.extname(file.originalname) || '.bin';
      const fileName = `fdrs/${crypto.randomUUID()}${fileExtension}`;

      // Read file buffer
      let fileBuffer: Buffer;
      try {
        fileBuffer = await fs.readFile(file.path);
      } catch (fsError: any) {
        // Do not swallow - provide informative server error
        throw new AppError(`Failed to read uploaded file: ${fsError.message || fsError}`, 500);
      }

      // Upload
      let documentUrl: string;
      try {
        documentUrl = await this.storageService.uploadFile(fileName, fileBuffer, file.mimetype);
      } catch (uploadError: any) {
        // classify storage error as 502 (bad gateway / storage failure)
        throw new AppError(`Failed to upload file to storage: ${uploadError?.message || uploadError}`, 502);
      }

      // Attempt cleanup (best-effort)
      try {
        await fs.unlink(file.path).catch(() => {});
      } catch (unlinkErr) {
        // warn but don't fail the operation
        console.warn('Could not delete temp file:', file.path, unlinkErr);
      }

      return documentUrl;
    } catch (error: any) {
      // Re-throw AppError so controllers/service callers preserve status/messages.
      if (error instanceof AppError) throw error;

      console.error('Error processing document:', error);
      throw new AppError(error?.message || 'Unexpected error occurred while processing document', 500);
    }
  }

  /**
   * Extract data from document text using OpenRouter + Mistral
   * - Robust handling for missing API key, network, timeouts, rate limits and malformed output
   */
  async extractDataFromDocument(data: { extractedText: string }): Promise<Result<any>> {
    // Input validation
    if (!data?.extractedText || typeof data.extractedText !== 'string' || data.extractedText.trim() === '') {
      return ResultUtils.fail('No extracted text provided for AI extraction');
    }

    if (!this.openRouterApiKey) {
      console.error('[FdrService] OpenRouter API key missing');
      return ResultUtils.fail('AI service not configured (OpenRouter key missing)');
    }

    // Prepare prompt (kept identical to previous prompt, only trimming)
    const prompt = `You are extracting data from a Fixed Deposit Receipt (FDR) or Bank Guarantee (BG) document.

IMPORTANT FIELD DISTINCTIONS:
- depositAmount: This is the PRINCIPAL amount deposited (the initial investment/deposit amount, typically the LOWER amount). Look for keywords like "Deposit Amount", "Principal", "Amount of Deposit", "Principal Amount", "Deposit".
- maturityValue: This is the total amount at maturity including interest (principal + interest earned, typically the HIGHER amount). Look for keywords like "Maturity Value", "Maturity Amount", "Amount on Maturity", "Value at Maturity", "Amount Payable on Maturity".
- accountName: This is the name of the account holder. Look for patterns like "A/C OF [NAME]", "Account of [NAME]", "Account Name: [NAME]", "In the name of [NAME]". IMPORTANT: Remove prefixes like "A/C OF", "A/C", "Account of", "Account Name:" and extract only the actual name. For example, "A/C OF EMPRISE MARKETING" should be extracted as "EMPRISE MARKETING".

IMPORTANT: The depositAmount is usually LOWER than maturityValue because maturityValue = depositAmount + interest earned.

Extract these fields as JSON ONLY:
{
  "depositAmount": number (the principal/initial deposit - usually the lower amount),
  "maturityValue": number (amount at maturity with interest - usually the higher amount),
  "maturityDate": "DD-MM-YYYY" (when the FD matures),
  "dateOfDeposit": "DD-MM-YYYY" (when the deposit was made),
  "accountNo": string (bank account number),
  "fdrNumber": string (FDR/FD/BG receipt/certificate number),
  "accountName": string (account holder name - remove prefixes like "A/C OF", "Account of", etc.),
  "bankName": string (name of the bank)
}

Return ONLY valid JSON without any formatting or explanations.

Text: ${data.extractedText}`;

    // Make API call with timeout + careful error handling
    try {
      const controller = new AbortController();
      const TIMEOUT_MS = 30_000;
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.BACKEND_URL || 'http://localhost:3000',
            'X-Title': 'Emprise FDR Extractor',
          },
          body: JSON.stringify({
            model: 'mistralai/mistral-small-24b-instruct-2501',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            response_format: { type: 'json_object' },
          }),
          signal: controller.signal as any,
        });
      } catch (fetchErr: any) {
        clearTimeout(timeout);
        if (fetchErr?.name === 'AbortError') {
          console.error('[FdrService] OpenRouter request timed out');
          return ResultUtils.fail('AI request timed out. Please try again later.');
        }
        console.error('[FdrService] Network error calling OpenRouter:', fetchErr);
        return ResultUtils.fail('Network error while calling AI service.');
      }

      clearTimeout(timeout);

      // Handle non-OK responses
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response body');
        console.error('[FdrService] OpenRouter API returned error:', response.status, errorText);

        if (response.status === 401) {
          return ResultUtils.fail('Invalid or unauthorized AI API key (401).');
        }
        if (response.status === 429) {
          return ResultUtils.fail('AI service rate limit exceeded. Try again later.');
        }
        if (response.status >= 500) {
          return ResultUtils.fail('AI service temporarily unavailable (server error).');
        }

        return ResultUtils.fail(`AI extraction failed: ${errorText}`);
      }

      // Parse JSON payload
      let responseData: any;
      try {
        responseData = await response.json();
      } catch (jsonErr: any) {
        console.error('[FdrService] Failed to parse OpenRouter JSON response:', jsonErr);
        return ResultUtils.fail('Failed to parse AI provider response (invalid JSON).');
      }

      // Validate expected structure
      const llmContent = responseData?.choices?.[0]?.message?.content;
      if (!llmContent || typeof llmContent !== 'string') {
        console.error('[FdrService] OpenRouter returned empty content:', responseData);
        return ResultUtils.fail('AI returned an empty response.');
      }

      // Sanitize and parse content (strip markdown fences, whitespace)
      let parsedData: any;
      try {
        const sanitized = llmContent.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedData = JSON.parse(sanitized);
      } catch (parseErr: any) {
        console.error('[FdrService] Failed to parse AI JSON content:', llmContent, parseErr);
        return ResultUtils.fail('AI returned malformed JSON.');
      }

      // Basic validation of essential fields (preserve original mapping)
      if (!parsedData || (parsedData && typeof parsedData !== 'object')) {
        return ResultUtils.fail('AI extraction returned invalid data structure.');
      }

      // Convert numeric fields if possible
      const depositAmount = parsedData.depositAmount !== undefined ? Number(parsedData.depositAmount) : undefined;
      const maturityValue = parsedData.maturityValue !== undefined ? Number(parsedData.maturityValue) : undefined;

      // If essential fields missing, return a helpful message
      if (!depositAmount || !maturityValue || !parsedData.accountName) {
        console.warn('[FdrService] AI output missing important fields:', parsedData);
        return ResultUtils.fail('AI extraction incomplete — required fields missing.');
      }

      return ResultUtils.ok({
        depositAmount,
        maturityValue,
        maturityDate: parsedData.maturityDate,
        dateOfDeposit: parsedData.dateOfDeposit,
        accountNo: parsedData.accountNo,
        fdrNumber: parsedData.fdrNumber,
        accountName: parsedData.accountName,
        bankName: parsedData.bankName || 'IDBI',
      });
    } catch (error: any) {
      console.error('[FdrService] Unexpected AI extraction error:', error);

      // If it's an AppError - forward message
      if (error instanceof AppError) {
        return ResultUtils.fail(error.message);
      }

      // Fallback
      return ResultUtils.fail('AI extraction failed due to an unexpected error.');
    }
  }

  /**
   * Extract data from file (OCR + AI pipeline)
   */
  async extractDataFromFile(file: Express.Multer.File): Promise<Result<any>> {
    if (!file) {
      return ResultUtils.fail('No file provided');
    }

    try {
      // 1. OCR
      let extractedText: string;
      try {
        extractedText = await this.ocrService.extractTextFromFile(file.path);
        if (!extractedText || typeof extractedText !== 'string') {
          console.warn('[FdrService] OCR returned empty text for file:', file.path);
          // proceed to AI step anyway — AI may still parse partial text
          extractedText = extractedText || '';
        }
      } catch (ocrErr: any) {
        console.error('[FdrService] OCR service error:', ocrErr);
        // attempt to cleanup temp file before returning
        try { await fs.unlink(file.path).catch(() => {}); } catch {}
        return ResultUtils.fail('Failed to extract text from document (OCR error).');
      }

      // 2. AI extraction
      const aiResult = await this.extractDataFromDocument({ extractedText });

      // 3. Cleanup temp file (best-effort)
      try {
        await fs.unlink(file.path).catch(() => {});
      } catch (unlinkErr) {
        console.warn('[FdrService] Failed to delete temp file after OCR/AI:', unlinkErr);
      }

      return aiResult;
    } catch (error: any) {
      console.error('[FdrService] File extraction unexpected error:', error);
      return ResultUtils.fail(error instanceof Error ? error.message : 'Failed to extract data from file');
    }
  }

  /**
   * Create a new FDR
   */
  async createFdr(dto: CreateFdrDto): Promise<Result<any>> {
    try {
      // Validate basic dto presence
      if (!dto) return ResultUtils.fail('Invalid input');

      // Process and upload document if provided
      let documentUrl: string | undefined;
      if (dto.documentFile) {
        try {
          documentUrl = await this.processDocument(dto.documentFile);
        } catch (procErr: any) {
          // bubble up a clear failure message
          console.error('[FdrService] processDocument error during createFdr:', procErr);
          return ResultUtils.fail(procErr instanceof AppError ? procErr.message : 'Failed to process document');
        }
      }

      // Process tags safely (preserve original logic)
      let tags: string[] = [];
      if (dto.tags) {
        if (Array.isArray(dto.tags)) {
          tags = dto.tags;
        } else if (typeof dto.tags === 'string') {
          try {
            const parsedTags = JSON.parse(dto.tags);
            if (Array.isArray(parsedTags)) tags = parsedTags;
          } catch (err) {
            console.warn('[FdrService] Failed to parse tags string:', err);
          }
        }
      }

      // Create FDR record (preserve fields & behavior)
      const fdr = await this.repository.create({
        category: dto.category || 'FD',
        bankName: dto.bankName || 'IDBI',
        accountNo: dto.accountNo,
        fdrNumber: dto.fdrNumber,
        accountName: dto.accountName,
        depositAmount: dto.depositAmount,
        dateOfDeposit: new Date(dto.dateOfDeposit),
        maturityValue: dto.maturityValue,
        maturityDate: dto.maturityDate ? new Date(dto.maturityDate) : undefined,
        contractNo: dto.contractNo,
        contractDetails: dto.contractDetails,
        poc: dto.poc,
        location: dto.location,
        documentUrl,
        extractedData: dto.extractedData,
        status: dto.status || 'RUNNING',
        offerId: dto.offerId,
        tags,
      });

      const fdrWithComputed = this.addComputedFields(fdr);
      return ResultUtils.ok(fdrWithComputed);
    } catch (error: any) {
      console.error('[FdrService] FDR Creation Error:', error);
      return ResultUtils.fail('Failed to create FDR record');
    }
  }

  /**
   * Get FDR by ID
   */
  async getFdrById(id: string): Promise<Result<any>> {
    if (!id || typeof id !== 'string') {
      return ResultUtils.fail('Invalid FDR id');
    }

    try {
      const fdr = await this.repository.findById(id);
      if (!fdr) return ResultUtils.fail('FDR not found');

      const fdrWithComputed = this.addComputedFields(fdr);
      return ResultUtils.ok(fdrWithComputed);
    } catch (error: any) {
      console.error('[FdrService] FDR Fetch Error:', error);
      return ResultUtils.fail('Failed to fetch FDR record');
    }
  }

  /**
   * Get all FDRs with pagination and filtering
   */
  async getAllFdrs(params: {
    searchTerm?: string;
    category?: 'SD' | 'PG' | 'FD' | 'BG';
    status?: FDRStatus;
    offerId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Result<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>> {
    try {
      const page = params?.page && params.page > 0 ? params.page : 1;
      const limit = params?.limit && params.limit > 0 ? params.limit : 10;
      const skip = (page - 1) * limit;

      const [fdrs, total] = await Promise.all([
        this.repository.findAll({
          ...params,
          skip,
          take: limit,
        }),
        this.repository.count({
          searchTerm: params?.searchTerm,
          category: params?.category,
          status: params?.status,
          offerId: params?.offerId,
        }),
      ]);

      const fdrsWithComputed = (Array.isArray(fdrs) ? fdrs : []).map((fdr) => this.addComputedFields(fdr));
      const totalPages = Math.ceil((Number(total) || 0) / limit);

      return ResultUtils.ok({
        data: fdrsWithComputed,
        total: Number(total) || 0,
        page,
        limit,
        totalPages,
      });
    } catch (error: any) {
      console.error('[FdrService] FDRs Fetch Error:', error);
      return ResultUtils.fail('Failed to fetch FDR records');
    }
  }

  /**
   * Update an FDR
   */
  async updateFdr(id: string, dto: UpdateFdrDto): Promise<Result<any>> {
    if (!id || typeof id !== 'string') {
      return ResultUtils.fail('Invalid FDR id');
    }

    try {
      const existingFdr = await this.repository.findById(id);
      if (!existingFdr) return ResultUtils.fail('FDR not found');

      // Process document if provided
      let documentUrl = existingFdr.documentUrl;
      if (dto.documentFile) {
        try {
          documentUrl = await this.processDocument(dto.documentFile);
        } catch (procErr: any) {
          console.error('[FdrService] processDocument error during updateFdr:', procErr);
          return ResultUtils.fail(procErr instanceof AppError ? procErr.message : 'Failed to process document');
        }
      }

      // Process tags
      let tags = existingFdr.tags ?? [];
      if (dto.tags) {
        if (typeof dto.tags === 'string') {
          try {
            tags = JSON.parse(dto.tags);
          } catch (err) {
            console.error('[FdrService] Error parsing tags:', err);
            // fall back to previous tags
          }
        } else {
          tags = dto.tags;
        }
      }

      // Prepare update data (preserve original mapping)
      const updateData: any = {};
      if (dto.category) updateData.category = dto.category;
      if (dto.bankName) updateData.bankName = dto.bankName;
      if (dto.accountNo !== undefined) updateData.accountNo = dto.accountNo;
      if (dto.fdrNumber !== undefined) updateData.fdrNumber = dto.fdrNumber;
      if (dto.accountName !== undefined) updateData.accountName = dto.accountName;
      if (dto.depositAmount !== undefined) updateData.depositAmount = dto.depositAmount;
      if (dto.dateOfDeposit) updateData.dateOfDeposit = new Date(dto.dateOfDeposit);
      if (dto.maturityValue !== undefined) updateData.maturityValue = dto.maturityValue;
      if (dto.maturityDate) updateData.maturityDate = new Date(dto.maturityDate);
      if (dto.contractNo !== undefined) updateData.contractNo = dto.contractNo;
      if (dto.contractDetails !== undefined) updateData.contractDetails = dto.contractDetails;
      if (dto.poc !== undefined) updateData.poc = dto.poc;
      if (dto.location !== undefined) updateData.location = dto.location;
      if (documentUrl) updateData.documentUrl = documentUrl;
      if (dto.extractedData) updateData.extractedData = dto.extractedData;
      if (dto.status) updateData.status = dto.status;
      if (dto.offerId !== undefined) updateData.offerId = dto.offerId;
      if (tags) updateData.tags = tags;

      const updatedFdr = await this.repository.update(id, updateData);
      const fdrWithComputed = this.addComputedFields(updatedFdr);

      return ResultUtils.ok(fdrWithComputed);
    } catch (error: any) {
      console.error('[FdrService] FDR Update Error:', error);
      return ResultUtils.fail('Failed to update FDR record');
    }
  }

  /**
   * Delete an FDR
   */
  async deleteFdr(id: string): Promise<Result<void>> {
    if (!id || typeof id !== 'string') {
      return ResultUtils.fail('Invalid FDR id');
    }

    try {
      const fdr = await this.repository.findById(id);
      if (!fdr) return ResultUtils.fail('FDR not found');

      // Attempt to delete attached file(s) from storage if present - best effort
      try {
        if (fdr.documentUrl) {
          await this.storageService.deleteFile(fdr.documentUrl).catch((err) => {
            console.warn('[FdrService] Warning: failed to delete file from storage:', err);
          });
        }
      } catch (storageErr) {
        console.warn('[FdrService] Storage deletion warning:', storageErr);
      }

      await this.repository.delete(id);
      return ResultUtils.ok(undefined);
    } catch (error: any) {
      console.error('[FdrService] FDR Deletion Error:', error);
      return ResultUtils.fail('Failed to delete FDR record');
    }
  }

  /**
   * Update FDR status
   */
  async updateStatus(id: string, status: FDRStatus): Promise<Result<any>> {
    if (!id || typeof id !== 'string') {
      return ResultUtils.fail('Invalid FDR id');
    }

    try {
      const existingFdr = await this.repository.findById(id);
      if (!existingFdr) return ResultUtils.fail('FDR not found');

      const updatedFdr = await this.repository.updateStatus(id, status);
      const fdrWithComputed = this.addComputedFields(updatedFdr);

      return ResultUtils.ok(fdrWithComputed);
    } catch (error: any) {
      console.error('[FdrService] FDR Status Update Error:', error);
      return ResultUtils.fail('Failed to update FDR status');
    }
  }

  /**
   * Get expiring FDRs
   */
  async getExpiringFdrs(days: number = 30): Promise<Result<any[]>> {
    if (typeof days !== 'number' || days <= 0) {
      return ResultUtils.fail('Invalid days parameter');
    }

    try {
      const fdrs = await this.repository.findExpiring(days);
      const fdrsWithComputed = (Array.isArray(fdrs) ? fdrs : []).map((fdr) =>
        this.addComputedFields(fdr)
      );
      return ResultUtils.ok(fdrsWithComputed);
    } catch (error: any) {
      console.error('[FdrService] Expiring FDRs Fetch Error:', error);
      return ResultUtils.fail('Failed to fetch expiring FDRs');
    }
  }

  /**
   * Auto-update expired FDRs
   */
  async autoUpdateExpiredStatuses(): Promise<Result<number>> {
    try {
      const count = await this.repository.updateExpiredStatuses();
      return ResultUtils.ok(count);
    } catch (error: any) {
      console.error('[FdrService] Auto-update Expired FDRs Error:', error);
      return ResultUtils.fail('Failed to auto-update expired FDRs');
    }
  }

  /**
   * Add computed fields to FDR
   */
  private addComputedFields(fdr: any): any {
    try {
      const daysUntilMaturity = FdrCalculations.getDaysUntilMaturity(fdr.maturityDate);
      const isExpired = FdrCalculations.isExpired(fdr.maturityDate);

      return {
        ...fdr,
        daysUntilMaturity,
        isExpired,
      };
    } catch (err: any) {
      console.error('[FdrService] addComputedFields error:', err);
      // return original object if computation fails (don't throw)
      return fdr;
    }
  }
}
