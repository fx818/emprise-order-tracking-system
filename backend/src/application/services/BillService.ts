import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaBillRepository } from '../../infrastructure/persistence/repositories/PrismaBillRepository';
import { S3Service } from '../../infrastructure/services/S3Service';
import { CreateBillDto } from '../dtos/bill/CreateBillDto';
import { UpdateBillDto } from '../dtos/bill/UpdateBillDto';
import { BillResponseDto } from '../dtos/bill/BillResponseDto';
import { Result, ResultUtils } from '../../shared/types/common.types';
import { AppError } from '../../shared/errors/AppError';
import { BillStatus, calculateBillPending } from '../../domain/entities/Bill';
import { FinancialCalculationService } from './FinancialCalculationService';

export class BillService {
  constructor(
    private repository: PrismaBillRepository,
    private storageService: S3Service,
    private financialService: FinancialCalculationService
  ) {}

  private async processBillPdf(file: Express.Multer.File): Promise<string> {
    try {
      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `bills/${crypto.randomUUID()}${fileExtension}`;

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
      console.error('Error processing bill PDF:', error);
      throw new Error('Failed to process bill PDF');
    }
  }

  private mapToResponseDto(bill: any): BillResponseDto {
    const invoiceAmount = bill.invoiceAmount || 0;
    const amountReceived = bill.amountReceived || 0;
    const amountDeducted = bill.amountDeducted || 0;
    const amountPending = this.financialService.calculateInvoicePending(
      invoiceAmount,
      amountReceived,
      amountDeducted
    );

    return {
      id: bill.id,
      loaId: bill.loaId,
      invoiceNumber: bill.invoiceNumber,
      invoiceAmount: bill.invoiceAmount,
      amountReceived: bill.amountReceived,
      amountDeducted: bill.amountDeducted,
      amountPending,
      deductionReason: bill.deductionReason,
      billLinks: bill.billLinks,
      remarks: bill.remarks,
      status: bill.status as BillStatus,
      invoicePdfUrl: bill.invoicePdfUrl,
      createdAt: bill.createdAt.toISOString(),
      updatedAt: bill.updatedAt.toISOString(),
    };
  }

  async createBill(loaId: string, dto: CreateBillDto): Promise<Result<BillResponseDto>> {
    try {
      // Validate amounts
      const invoiceAmount = dto.invoiceAmount || 0;
      const amountReceived = dto.amountReceived || 0;
      const amountDeducted = dto.amountDeducted || 0;

      const validation = this.financialService.validateInvoiceAmounts(
        invoiceAmount,
        amountReceived,
        amountDeducted
      );

      if (!validation.valid) {
        return ResultUtils.fail(validation.error || 'Invalid invoice amounts');
      }

      // Validate deduction reason if amount is deducted
      if (amountDeducted > 0 && !dto.deductionReason) {
        return ResultUtils.fail('Deduction reason is required when amount is deducted');
      }

      // Process bill PDF if provided
      let invoicePdfUrl: string | undefined;
      if (dto.invoicePdfFile) {
        invoicePdfUrl = await this.processBillPdf(dto.invoicePdfFile);
      }

      // Create bill
      const bill = await this.repository.create({
        loaId,
        invoiceNumber: dto.invoiceNumber,
        invoiceAmount: dto.invoiceAmount,
        amountReceived: dto.amountReceived || 0,
        amountDeducted: dto.amountDeducted || 0,
        deductionReason: dto.deductionReason,
        billLinks: dto.billLinks,
        remarks: dto.remarks,
        status: dto.status || 'REGISTERED',
        invoicePdfUrl,
      });

      return ResultUtils.ok(this.mapToResponseDto(bill));
    } catch (error) {
      console.error('BillService createBill error:', error);
      return ResultUtils.fail('Failed to create bill');
    }
  }

  async getBillsByLoaId(loaId: string): Promise<Result<BillResponseDto[]>> {
    try {
      const bills = await this.repository.findByLoaId(loaId);
      const responseDtos = bills.map((bill) => this.mapToResponseDto(bill));
      return ResultUtils.ok(responseDtos);
    } catch (error) {
      console.error('BillService getBillsByLoaId error:', error);
      return ResultUtils.fail('Failed to retrieve bills');
    }
  }

  async getBillById(id: string): Promise<Result<BillResponseDto>> {
    try {
      const bill = await this.repository.findById(id);
      if (!bill) {
        return ResultUtils.fail('Bill not found');
      }
      return ResultUtils.ok(this.mapToResponseDto(bill));
    } catch (error) {
      console.error('BillService getBillById error:', error);
      return ResultUtils.fail('Failed to retrieve bill');
    }
  }

  async updateBill(id: string, dto: UpdateBillDto): Promise<Result<BillResponseDto>> {
    try {
      // Check if bill exists
      const existingBill = await this.repository.findById(id);
      if (!existingBill) {
        return ResultUtils.fail('Bill not found');
      }

      // Validate amounts if any are being updated
      const invoiceAmount = dto.invoiceAmount !== undefined ? dto.invoiceAmount : existingBill.invoiceAmount || 0;
      const amountReceived = dto.amountReceived !== undefined ? dto.amountReceived : existingBill.amountReceived || 0;
      const amountDeducted = dto.amountDeducted !== undefined ? dto.amountDeducted : existingBill.amountDeducted || 0;

      const validation = this.financialService.validateInvoiceAmounts(
        invoiceAmount,
        amountReceived,
        amountDeducted
      );

      if (!validation.valid) {
        return ResultUtils.fail(validation.error || 'Invalid invoice amounts');
      }

      // Validate deduction reason if amount is deducted
      const finalDeductionReason = dto.deductionReason !== undefined ? dto.deductionReason : existingBill.deductionReason;
      if (amountDeducted > 0 && !finalDeductionReason) {
        return ResultUtils.fail('Deduction reason is required when amount is deducted');
      }

      // Process bill PDF if provided
      let invoicePdfUrl: string | undefined;
      if (dto.invoicePdfFile) {
        invoicePdfUrl = await this.processBillPdf(dto.invoicePdfFile);
      }

      // Update bill
      const bill = await this.repository.update(id, {
        invoiceNumber: dto.invoiceNumber,
        invoiceAmount: dto.invoiceAmount,
        amountReceived: dto.amountReceived,
        amountDeducted: dto.amountDeducted,
        deductionReason: dto.deductionReason,
        billLinks: dto.billLinks,
        remarks: dto.remarks,
        status: dto.status,
        invoicePdfUrl,
      });

      return ResultUtils.ok(this.mapToResponseDto(bill));
    } catch (error) {
      console.error('BillService updateBill error:', error);
      return ResultUtils.fail('Failed to update bill');
    }
  }

  async deleteBill(id: string): Promise<Result<void>> {
    try {
      // Check if bill exists
      const exists = await this.repository.exists(id);
      if (!exists) {
        return ResultUtils.fail('Bill not found');
      }

      await this.repository.delete(id);
      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('BillService deleteBill error:', error);
      return ResultUtils.fail('Failed to delete bill');
    }
  }
}
