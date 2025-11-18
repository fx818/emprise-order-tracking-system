import { z } from 'zod';
import type { Site } from "../../sites/types/site";
import { getUser } from '../../../lib/utils/auth';

// Additional Charge schema
const additionalChargeSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().min(0, 'Amount must be non-negative'),
});

// Item in PO schema
const poItemSchema = z.object({
  itemId: z.string().min(1, 'Item selection is required'),
  quantity: z.number().min(1, 'Quantity must be a positive number'),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
});

// Main purchase order schema
export const purchaseOrderSchema = z.object({
  loaId: z.string().min(1, 'LOA reference is required'),
  vendorId: z.string().min(1, 'Vendor is required'),
  items: z.array(poItemSchema).min(1, 'At least one item is required'),
  additionalCharges: z.array(additionalChargeSchema).default([]),
  taxAmount: z.number().min(0, 'Tax amount must be non-negative'),
  requirementDesc: z.string()
    .min(10, 'Requirement description must be at least 10 characters')
    .max(1000, 'Requirement description must not exceed 1000 characters')
    .trim(),
  termsConditions: z.string()
    .min(10, 'Terms and conditions must be at least 10 characters')
    .max(2000, 'Terms and conditions must not exceed 2000 characters')
    .trim(),
  shipToAddress: z.string()
    .min(10, 'Shipping address must be at least 10 characters')
    .max(500, 'Shipping address must not exceed 500 characters')
    .trim(),
  expectedDeliveryDate: z.string(),
  notes: z.string().optional(),
  approverId: z.string().refine((val) => {
    const currentUser = getUser();
    // Make approverId required only for non-admin users
    if (currentUser?.role !== 'ADMIN' && !val) {
      return false;
    }
    return true;
  }, { message: 'Approver selection is required' }),
  tags: z.array(z.string()).default([]),
  siteId: z.string().min(1, "Site is required"),
});

export type AdditionalCharge = z.infer<typeof additionalChargeSchema>;
export type POItemFormData = z.infer<typeof poItemSchema>;
export type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;

export interface POItem extends POItemFormData {
  item: {
    id: string;
    name: string;
    description: string;
    uom: string;
  };
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'DELETED';
  loaId: string;
  vendorId: string;
  items: POItem[];
  additionalCharges: AdditionalCharge[];
  taxAmount: number;
  totalAmount: number;
  requirementDesc: string;
  termsConditions: string;
  shipToAddress: string;
  expectedDeliveryDate: string;
  notes?: string;
  approverId?: string;
  tags: string[];
  documentUrl: string | null;
  siteId: string;
  site?: Site;
  vendor: {
    id: string;
    name: string;
    email: string;
  };
  loa: {
    id: string;
    loaNumber: string;
    documentUrl: string | null;
  };
  createdAt: string;
  updatedAt: string;
}