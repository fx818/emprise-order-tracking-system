import { BillStatus } from '../../../domain/entities/Bill';

export interface BillResponseDto {
  id: string;
  loaId: string;
  invoiceNumber?: string;
  invoiceAmount?: number;
  amountReceived: number;
  amountDeducted: number;
  amountPending: number;
  deductionReason?: string;
  billLinks?: string;
  remarks?: string;
  status: BillStatus;
  invoicePdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}
