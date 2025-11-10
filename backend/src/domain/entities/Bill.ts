export type BillStatus = 'REGISTERED' | 'RETURNED' | 'PAYMENT_MADE';

export interface Bill {
  id: string;
  loaId: string;
  invoiceNumber?: string;
  invoiceAmount?: number;
  billLinks?: string;
  remarks?: string;
  status: BillStatus;
  invoicePdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
