// application/services/FdrService.ts
import { promises as fs } from 'fs';
import path from 'path';
import { FDRStatus } from '@prisma/client';
import { PrismaFdrRepository } from '../../infrastructure/persistence/repositories/PrismaFdrRepository';
import { S3Service } from '../../infrastructure/services/S3Service';
import { OCRService } from '../../infrastructure/services/OCRService';
import { CreateFdrDto } from '../dtos/fdr/CreateFdrDto';
import { UpdateFdrDto } from '../dtos/fdr/UpdateFdrDto';
import { Result, ResultUtils } from '../../shared/types/common.types';
import { FdrCalculations } from '../../domain/entities/utils/FdrCalculations';

export class FdrService {
  constructor(
    private repository: PrismaFdrRepository,
    private storageService: S3Service,
    private ocrService: OCRService,
    private openRouterApiKey?: string
  ) {}

  /**
   * Process document file - upload to S3
   */
  private async processDocument(file: Express.Multer.File): Promise<string> {
    try {
      const fileExtension = path.extname(file.originalname);
      const fileName = `fdrs/${crypto.randomUUID()}${fileExtension}`;

      const fileBuffer = await fs.readFile(file.path);
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

  /**
   * Extract data from document using AI (OpenRouter + Mistral)
   */
  async extractDataFromDocument(data: {
    extractedText: string;
  }): Promise<Result<any>> {
    try {
      if (!this.openRouterApiKey) {
        return ResultUtils.fail('OpenRouter API key not configured');
      }

      // Prepare prompt for AI
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

      // Call OpenRouter API with Mistral
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.BACKEND_URL || 'http://localhost:3000',
          'X-Title': 'Emprise FDR Extractor'
        },
        body: JSON.stringify({
          model: "mistralai/mistral-small-24b-instruct-2501",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter API error:', errorText);
        return ResultUtils.fail(`AI extraction failed: ${errorText}`);
      }

      const responseData = await response.json();
      const llmResponse = responseData.choices[0].message.content;

      // Parse and validate response
      let parsedData: any;
      try {
        const sanitizedResponse = llmResponse
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        parsedData = JSON.parse(sanitizedResponse);
      } catch (e) {
        console.error('Failed to parse AI response:', llmResponse);
        return ResultUtils.fail('Failed to parse AI response');
      }

      return ResultUtils.ok({
        depositAmount: parsedData.depositAmount,
        maturityValue: parsedData.maturityValue,
        maturityDate: parsedData.maturityDate,
        dateOfDeposit: parsedData.dateOfDeposit,
        accountNo: parsedData.accountNo,
        fdrNumber: parsedData.fdrNumber,
        accountName: parsedData.accountName,
        bankName: parsedData.bankName || 'IDBI'
      });
    } catch (error) {
      console.error('AI extraction error:', error);
      return ResultUtils.fail('AI extraction failed');
    }
  }

  /**
   * Extract data from file (PDF or image) - Complete OCR + AI pipeline
   */
  async extractDataFromFile(file: Express.Multer.File): Promise<Result<any>> {
    try {
      // Step 1: Extract text using OCR (handles both PDF and images)
      const extractedText = await this.ocrService.extractTextFromFile(file.path);
      console.log('Extracted text from file:', extractedText);

      // Step 2: Use AI to extract structured data
      const aiResult = await this.extractDataFromDocument({ extractedText });

      // Clean up temp file
      try {
        await fs.unlink(file.path);
      } catch (unlinkError) {
        console.warn('Failed to delete temp file:', unlinkError);
      }

      return aiResult;
    } catch (error) {
      console.error('File extraction error:', error);
      return ResultUtils.fail(
        error instanceof Error
          ? error.message
          : 'Failed to extract data from file'
      );
    }
  }

  /**
   * Create a new FDR
   */
  async createFdr(dto: CreateFdrDto): Promise<Result<any>> {
    try {
      // Process and upload document if provided
      let documentUrl: string | undefined;
      if (dto.documentFile) {
        documentUrl = await this.processDocument(dto.documentFile);
      }

      // Process tags
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
            console.warn('Failed to parse tags string:', error);
          }
        }
      }

      // Create FDR record
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

      // Calculate and add computed fields
      const fdrWithComputed = this.addComputedFields(fdr);

      return ResultUtils.ok(fdrWithComputed);
    } catch (error) {
      console.error('FDR Creation Error:', error);
      return ResultUtils.fail('Failed to create FDR record');
    }
  }

  /**
   * Get FDR by ID
   */
  async getFdrById(id: string): Promise<Result<any>> {
    try {
      const fdr = await this.repository.findById(id);
      if (!fdr) {
        return ResultUtils.fail('FDR not found');
      }

      const fdrWithComputed = this.addComputedFields(fdr);
      return ResultUtils.ok(fdrWithComputed);
    } catch (error) {
      console.error('FDR Fetch Error:', error);
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
      const page = params.page || 1;
      const limit = params.limit || 10;
      const skip = (page - 1) * limit;

      const [fdrs, total] = await Promise.all([
        this.repository.findAll({
          ...params,
          skip,
          take: limit,
        }),
        this.repository.count({
          searchTerm: params.searchTerm,
          category: params.category,
          status: params.status,
          offerId: params.offerId,
        }),
      ]);

      const fdrsWithComputed = fdrs.map(fdr => this.addComputedFields(fdr));
      const totalPages = Math.ceil(total / limit);

      return ResultUtils.ok({
        data: fdrsWithComputed,
        total,
        page,
        limit,
        totalPages,
      });
    } catch (error) {
      console.error('FDRs Fetch Error:', error);
      return ResultUtils.fail('Failed to fetch FDR records');
    }
  }

  /**
   * Update an FDR
   */
  async updateFdr(id: string, dto: UpdateFdrDto): Promise<Result<any>> {
    try {
      const existingFdr = await this.repository.findById(id);
      if (!existingFdr) {
        return ResultUtils.fail('FDR not found');
      }

      // Process document if provided
      let documentUrl = existingFdr.documentUrl;
      if (dto.documentFile) {
        documentUrl = await this.processDocument(dto.documentFile);
      }

      // Process tags
      let tags = existingFdr.tags;
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

      // Prepare update data
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
    } catch (error) {
      console.error('FDR Update Error:', error);
      return ResultUtils.fail('Failed to update FDR record');
    }
  }

  /**
   * Delete an FDR
   */
  async deleteFdr(id: string): Promise<Result<void>> {
    try {
      const fdr = await this.repository.findById(id);
      if (!fdr) {
        return ResultUtils.fail('FDR not found');
      }

      await this.repository.delete(id);
      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('FDR Deletion Error:', error);
      return ResultUtils.fail('Failed to delete FDR record');
    }
  }

  /**
   * Update FDR status
   */
  async updateStatus(id: string, status: FDRStatus): Promise<Result<any>> {
    try {
      const existingFdr = await this.repository.findById(id);
      if (!existingFdr) {
        return ResultUtils.fail('FDR not found');
      }

      const updatedFdr = await this.repository.updateStatus(id, status);
      const fdrWithComputed = this.addComputedFields(updatedFdr);

      return ResultUtils.ok(fdrWithComputed);
    } catch (error) {
      console.error('FDR Status Update Error:', error);
      return ResultUtils.fail('Failed to update FDR status');
    }
  }

  /**
   * Get expiring FDRs
   */
  async getExpiringFdrs(days: number = 30): Promise<Result<any[]>> {
    try {
      const fdrs = await this.repository.findExpiring(days);
      const fdrsWithComputed = fdrs.map(fdr => this.addComputedFields(fdr));
      return ResultUtils.ok(fdrsWithComputed);
    } catch (error) {
      console.error('Expiring FDRs Fetch Error:', error);
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
    } catch (error) {
      console.error('Auto-update Expired FDRs Error:', error);
      return ResultUtils.fail('Failed to auto-update expired FDRs');
    }
  }

  /**
   * Add computed fields to FDR
   */
  private addComputedFields(fdr: any): any {
    const daysUntilMaturity = FdrCalculations.getDaysUntilMaturity(fdr.maturityDate);
    const isExpired = FdrCalculations.isExpired(fdr.maturityDate);

    return {
      ...fdr,
      daysUntilMaturity,
      isExpired,
    };
  }
}
