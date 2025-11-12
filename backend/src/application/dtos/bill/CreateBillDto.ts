import { BillStatus } from '../../../domain/entities/Bill';

export interface CreateBillDto {
  invoiceNumber?: string;
  invoiceAmount?: number;
  amountReceived?: number;
  amountDeducted?: number;
  deductionReason?: string;
  billLinks?: string;
  remarks?: string;
  status?: BillStatus;
  invoicePdfFile?: Express.Multer.File;
}
