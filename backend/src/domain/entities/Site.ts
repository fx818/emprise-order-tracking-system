// domain/entities/Site.ts
import { LOA } from './LOA';
import { PurchaseOrder } from './PurchaseOrder';
import { SiteStatus } from './constants';

export interface Site {
  id: string;
  name: string;
  code: string;
  location: string;
  zoneId: string;
  zone?: {
    id: string;
    name: string;
    headquarters: string;
  };
  address: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  loas: LOA[];
  purchaseOrders: PurchaseOrder[];
  status: SiteStatus;
  stats: {
    totalLoas: number;
    totalPurchaseOrders: number;
    totalValue: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

type DeliveryPeriod = {
  start: string;  // ISO date string
  end: string;    // ISO date string
};

export interface LOAWithDeliveryPeriod extends LOA {
  deliveryPeriod: {
    start: Date;
    end: Date;
  };
}
