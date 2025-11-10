// types/site.ts
import type { Customer } from '../../customers/hooks/use-customers';

export interface Site {
    id: string;
    name: string;
    code: string;
    location: string;
    zoneId: string;
    zone?: Customer;  // Customer/Zone information
    address: string;
    contactPerson: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    status: SiteStatus;
    loas: Array<{
      id: string;
      loaNumber: string;
      loaValue: number;
      workDescription: string;
      deliveryPeriod: {
        start: Date;
        end: Date;
      };
      status: string;
      createdAt: string;
    }>;
    purchaseOrders: Array<{
      id: string;
      poNumber: string;
      status: string;
      totalAmount: number;
      createdAt: string;
    }>;
    stats: {
      totalLoas: number;
      totalPurchaseOrders: number;
      totalValue: number;
      pendingPOs: number;
    };
    createdAt: string;
    updatedAt: string;
  }
  
  export enum SiteStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    // UNDER_MAINTENANCE = 'UNDER_MAINTENANCE'
  }