export type BillStatus = 'REGISTERED' | 'RETURNED' | 'PAYMENT_MADE';

export interface Bill {
  id: string;
  loaId: string;
  invoiceNumber?: string;
  invoiceAmount?: number;
  amountReceived: number;
  amountDeducted: number;
  deductionReason?: string;
  billLinks?: string;
  remarks?: string;
  status: BillStatus;
  invoicePdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function calculateBillPending(bill: Bill): number {
  const invoiceAmount = bill.invoiceAmount || 0;
  return Math.max(0, invoiceAmount - bill.amountReceived - bill.amountDeducted);
}
