import { BillStatus } from '../../../domain/entities/Bill';

export interface BillResponseDto {
  id: string;
  loaId: string;
  invoiceNumber?: string;
  invoiceAmount?: number;
  billLinks?: string;
  remarks?: string;
  status: BillStatus;
  invoicePdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}
