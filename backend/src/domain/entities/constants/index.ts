// import { TaxRates } from "../Item";

export enum POStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DELETED = 'DELETED',
}

export enum SiteStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE'
}

export type ApprovalActionType = 'SUBMIT' | 'APPROVE' | 'REJECT';

export interface ApprovalAction {
  actionType: 'SUBMIT' | 'APPROVE' | 'REJECT';
  userId: string;
  timestamp: string;
  comments?: string;
  previousStatus: POStatus;
  newStatus: POStatus;
}

export type PrismaJson = {
  [key: string]: string | number | boolean | null | PrismaJson | PrismaJson[];
};

// export const DEFAULT_TAX_RATES: TaxRates = {
//   igst: 0,
//   sgst: 0,
//   ugst: 0
// };

export const VALID_UOM_TYPES = [
  'pieces',
  'meters',
  'kilograms',
  'liters',
  'square_meters',
  'cubic_meters',
  'hours',
  'days',
  'units'
] as const;

export type UOMType = typeof VALID_UOM_TYPES[number];