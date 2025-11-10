import { BillStatus } from '../../../domain/entities/Bill';

export interface UpdateBillDto {
  invoiceNumber?: string;
  invoiceAmount?: number;
  billLinks?: string;
  remarks?: string;
  status?: BillStatus;
  invoicePdfFile?: Express.Multer.File;
}
