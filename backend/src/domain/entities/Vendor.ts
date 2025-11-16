import { PurchaseOrder } from "./PurchaseOrder";
import { VendorItem } from "./VendorItem";

export interface BankDetails {
    accountNumber: string;
    accountName: string;
    bankName: string;
    branchName: string;
    ifscCode: string;
  }
  
  export interface Vendor {
    id: string;
    name: string;
    email: string;
    mobile: string;
    gstin?: string;
    address: string;
    remarks?: string;
    bankDetails: BankDetails;
    items?: VendorItem[];
    purchaseOrders?: PurchaseOrder[];
    createdAt: Date;
    updatedAt: Date;
  }
  