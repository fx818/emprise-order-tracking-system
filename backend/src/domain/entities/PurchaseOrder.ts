import { ApprovalAction, POStatus } from "./constants";
import { LOA } from "./LOA";
import { PurchaseOrderItem } from "./PurchaseOrderItem";
import { Site } from "./Site";
import { User } from "./User";
import { Vendor } from "./Vendor";
import { AdditionalCharge } from "../../application/dtos/purchaseOrder/PurchaseOrderDto";

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  loa: LOA;
  loaId: string;
  loaNumber: string;
  vendor: Vendor;
  vendorId: string;
  items: PurchaseOrderItem[];
  site: {
    id: string;
    name: string;
    code: string;
    zoneId: string;
  };
  siteId: string;
  requirementDesc: string;
  termsConditions: string;
  shipToAddress: string;
  baseAmount: number;
  taxAmount: number;
  additionalCharges: AdditionalCharge[];
  totalAmount: number;
  notes?: string;
  documentUrl?: string;
  status: POStatus;
  createdBy: User;
  createdById: string;
  approver?: User;
  approverId?: string;
  approvalComments?: string;     // Added for approval comments
  rejectionReason?: string;   // Added for rejection reason
  approvalHistory: ApprovalAction[]; // Added for tracking approval flow
  documentHash?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PDFItemData {
  id: string;
  item: {
    id: string;
    name: string;
    description: string;
    unitPrice: number;
    uom: string;
    hsnCode: string;
  };
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface PDFGenerationData {
  id: string;
  poNumber: string;
  loaNumber: string;
  createdAt: Date;
  totalAmount: number;
  customerOrderDate?: Date;
  vendor: {
    name: string;
    email: string;
    mobile: string;
    gstin: string;
    address: string;
    remarks?: string;
  };
  additionalCharges: Array<{
    description: string;
    amount: number;
  }>;
  items: PDFItemData[];
  requirementDesc: string;
  termsConditions: string;
  shipToAddress: string;
  notes: string;
  baseAmount: number;
  taxAmount: number;
  baseURL: string;
  createdBy: {
    name: string;
    department: string;
  };
}