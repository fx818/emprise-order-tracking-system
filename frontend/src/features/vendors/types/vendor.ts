import { z } from 'zod';

// First, we define the schema for bank account details
export const bankDetailsSchema = z.object({
  accountNumber: z.string().min(1, "Account number is required"),
  accountName: z.string().min(1, "Account name is required"),
  bankName: z.string().min(1, "Bank name is required"),
  branchName: z.string().min(1, "Branch name is required"),
  ifscCode: z.string().min(1, "IFSC code is required"),
});

// Schema for creating or updating a vendor
export const vendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  email: z.string().email("Invalid email address"),
  mobile: z.string().min(10, "Mobile number must be 10 digits"),
  gstin: z.string().nullable().optional(),
  address: z.string().min(1, "Address is required"),
  remarks: z.string().nullable().optional(),
  bankDetails: bankDetailsSchema
});

// Types derived from schemas
export type BankDetails = z.infer<typeof bankDetailsSchema>;
export type VendorFormData = z.infer<typeof vendorSchema>;

// Extended interface for vendor with additional properties
export interface Vendor extends VendorFormData {
  id: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';
  items: VendorItem[];
  purchaseOrders: PurchaseOrder[];
  createdAt: string;
  updatedAt: string;
}

export interface VendorItem {
  vendorId: string;
  itemId: string;
  unitPrice: number;
  createdAt: string;
  updatedAt: string;
  item: {
    id: string;
    name: string;
    description: string;
    unitPrice: number;
    uom: string;
    hsnCode: string;
    taxRates: {
      igst: number;
      sgst: number;
      cgst: number;
    };
    createdAt: string;
    updatedAt: string;
  };
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  loaId: string;
  vendorId: string;
  requirementDesc: string;
  termsConditions: string;
  shipToAddress: string;
  notes: string;
  documentUrl: string;
  documentHash: string;
  status: string;
  createdById: string;
  approverId: string | null;
  approvalComments: string | null;
  rejectionReason: string | null;
  approvalHistory: {
    userId: string;
    newStatus: string;
    timestamp: string;
    actionType: string;
    previousStatus: string;
  }[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}