import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaBillRepository } from '../../infrastructure/persistence/repositories/PrismaBillRepository';
import { S3Service } from '../../infrastructure/services/S3Service';
import { CreateBillDto } from '../dtos/bill/CreateBillDto';
import { UpdateBillDto } from '../dtos/bill/UpdateBillDto';
import { BillResponseDto } from '../dtos/bill/BillResponseDto';
import { Result, ResultUtils } from '../../shared/types/common.types';
import { AppError } from '../../shared/errors/AppError';
import { BillStatus } from '../../domain/entities/Bill';

export class BillService {
  constructor(
    private repository: PrismaBillRepository,
    private storageService: S3Service
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
    return {
      id: bill.id,
      loaId: bill.loaId,
      invoiceNumber: bill.invoiceNumber,
      invoiceAmount: bill.invoiceAmount,
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
      const exists = await this.repository.exists(id);
      if (!exists) {
        return ResultUtils.fail('Bill not found');
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
