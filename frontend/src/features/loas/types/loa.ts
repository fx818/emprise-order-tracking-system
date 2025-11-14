import { z } from 'zod';
import type { Customer } from '../../customers/hooks/use-customers';
import type { Tender } from '../../tenders/types/tender';

// Define the schema for the delivery period
const deliveryPeriodSchema = z.object({
  start: z.date(),
  end: z.date(),
});

// Schema for creating or updating an LOA
export const loaSchema = z.object({
  loaNumber: z.string().min(1, 'LOA number is required'),
  loaValue: z.number().min(0, 'LOA value must be positive'),
  deliveryPeriod: deliveryPeriodSchema,
  dueDate: z.date().optional().nullable(),
  orderReceivedDate: z.date().optional().nullable(),
  workDescription: z.string().min(1, 'Work description is required'),
  tags: z.array(z.string()),
  documentFile: z.any().optional(), // File is optional for both create and edit
  emdId: z.string().optional(), // EMD ID field
  siteId: z.string().min(1, 'Site is required'), // Add site field
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'SUPPLY_WORK_COMPLETED', 'CHASE_PAYMENT', 'CLOSED', 'SUPPLY_WORK_DELAYED', 'APPLICATION_PENDING', 'UPLOAD_BILL', 'RETRIEVE_EMD_SECURITY']).default('NOT_STARTED'),
  remarks: z.string().optional(),
  tenderNo: z.string().optional(),
  tenderId: z.string().optional(),
  pocId: z.string().optional(),
  inspectionAgencyId: z.string().optional(),
  fdBgDetails: z.string().optional(),
  hasEmd: z.boolean().default(false),
  emdAmount: z.number().optional().nullable(),
  hasSd: z.boolean().default(false),
  sdFdrId: z.string().optional().nullable(),
  hasPg: z.boolean().default(false),
  pgFdrId: z.string().optional().nullable(),
  // Pending breakdown fields (LOA-level)
  recoverablePending: z.number().optional().nullable(),
  paymentPending: z.number().optional().nullable(),
  // Warranty period fields
  warrantyPeriodMonths: z.number().min(0).optional().nullable(),
  warrantyPeriodYears: z.number().min(0).optional().nullable(),
  warrantyStartDate: z.date().optional().nullable(),
  warrantyEndDate: z.date().optional().nullable(),
  // Billing/Invoice fields (for individual bill/invoice records)
  invoiceNumber: z.string().optional(),
  invoiceAmount: z.number().optional().nullable(),
  billLinks: z.string().optional(),
  invoicePdfFile: z.any().optional(),
});

// Schema for creating an amendment
export const amendmentSchema = z.object({
  amendmentNumber: z.string().min(1, 'Amendment number is required'),
  documentFile: z.any().optional(),
  tags: z.array(z.string()),
});

// Schema for creating an other document
export const otherDocumentSchema = z.object({
  title: z.string().min(3, 'Document title must be at least 3 characters').max(100, 'Document title must be at most 100 characters'),
  documentFile: z.any(),
});

// Types derived from schemas
export type DeliveryPeriod = z.infer<typeof deliveryPeriodSchema>;
export type LOAFormData = z.infer<typeof loaSchema>;
export type AmendmentFormData = z.infer<typeof amendmentSchema>;
export type OtherDocumentFormData = z.infer<typeof otherDocumentSchema>;

// Interface for Purchase Order
export interface PurchaseOrder {
  id: string;
  poNumber: string;
  value: number;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  documentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Interface for FDR (simplified for LOA display)
export interface FDRSummary {
  id: string;
  bankName: string;
  fdrNumber?: string;
  accountNo?: string;
  depositAmount: number;
  dateOfDeposit: string;
  maturityDate?: string;
  status: string;
  category: string;
  linkedAt?: string;
  linkedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

// Interface for LOA with additional properties
export interface LOA extends Omit<LOAFormData, 'documentFile' | 'invoicePdfFile'> {
  id: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUPPLY_WORK_COMPLETED' | 'CHASE_PAYMENT' | 'CLOSED' | 'SUPPLY_WORK_DELAYED' | 'APPLICATION_PENDING' | 'UPLOAD_BILL' | 'RETRIEVE_EMD_SECURITY';
  documentUrl?: string;
  sdFdr?: FDRSummary;
  pgFdr?: FDRSummary;
  generalFdrs?: FDRSummary[];
  // Pending breakdown (LOA-level)
  recoverablePending: number;
  paymentPending: number;
  // Manual override fields (for historical data entry)
  manualTotalBilled?: number;
  manualTotalReceived?: number;
  manualTotalDeducted?: number;
  // Calculated financial fields (from invoices)
  totalReceivables?: number; // = loaValue
  totalBilled?: number;
  totalReceived?: number;
  totalDeducted?: number;
  totalPending?: number;
  amendments: Amendment[];
  otherDocuments?: OtherDocument[];
  purchaseOrders: PurchaseOrder[];
  invoices?: Invoice[];
  daysToDueDateFromExcel?: number | null;  // Days to due date from Excel (negative=overdue, positive=remaining, null=completed)
  site?: {
    id: string;
    name: string;
    code: string;
    location: string;
    status: string;
    zoneId: string;
    zone?: Customer;  // Customer/Zone information
  };
  tender?: Tender;  // Optional tender information
  poc?: {
    id: string;
    name: string;
  };  // Optional POC information
  inspectionAgency?: {
    id: string;
    name: string;
  };  // Optional Inspection Agency information
  createdAt: string;
  updatedAt: string;
}

// Bill status type
export type BillStatus = 'REGISTERED' | 'RETURNED' | 'PAYMENT_MADE';

// Interface for Invoice/Billing data
export interface Invoice {
  id: string;
  loaId: string;
  invoiceNumber?: string;
  invoiceAmount?: number;
  amountReceived: number;
  amountDeducted: number;
  amountPending: number; // Calculated field
  deductionReason?: string;
  billLinks?: string;
  invoicePdfUrl?: string;
  remarks?: string;
  status: BillStatus;
  createdAt: string;
  updatedAt: string;
}

// Helper to calculate invoice pending
// Note: Can return negative values for overpayment scenarios
export function calculateInvoicePending(invoice: Partial<Invoice>): number {
  const invoiceAmount = invoice.invoiceAmount || 0;
  const amountReceived = invoice.amountReceived || 0;
  const amountDeducted = invoice.amountDeducted || 0;
  return invoiceAmount - amountReceived - amountDeducted;
}

// Interface for Amendment with additional properties
export interface Amendment extends Omit<AmendmentFormData, 'documentFile'> {
  id: string;
  loaId: string;
  documentUrl?: string;
  createdAt: string;
  updatedAt: string;
  loa?: LOA;
}

// Interface for OtherDocument with additional properties
export interface OtherDocument extends Omit<OtherDocumentFormData, 'documentFile'> {
  id: string;
  loaId: string;
  documentUrl: string;
  createdAt: string;
  updatedAt: string;
}