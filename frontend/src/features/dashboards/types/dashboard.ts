export interface StatisticCard {
    title: string;
    value: number | string;
    description: string;
    trend?: {
      value: number;
      direction: 'up' | 'down';
    };
    icon: React.ComponentType<any>;
  }
  
  export interface Activity {
    id: string;
    type: 'offer' | 'po';
    title: string;
    description: string;
    timestamp: string;
    status: string;
    createdBy?: string;
    amount?: number;
  }

  export interface OfferStatus {
    name: string;
    value: number;
    color: string;
  }

  export interface TrendData {
    month: string;
    offers: number;
    orders: number;
  }

  export interface Metric {
    label: string;
    value: number;
    total: number;
    color: string;
  }

  export interface DashboardStats {
    totalOffers: number;
    totalOrders: number;
    offersTrend: number;
    ordersTrend: number;
    processingTime: number;
    processingTimeTrend: number;
    offerStatus: Array<{ name: string; value: number; color: string }>;
  }

  export interface DispatchDueMetrics {
    dueIn7Days: number;
    dueIn7to14Days: number;
    dueIn14to30Days: number;
  }

  export interface ProcessingTimeMetrics {
    avgProcessingTime: number;
    avgDaysFromDue: number;
    onTimePercentage: number;
    earlyCount: number;
    onTimeCount: number;
    lateCount: number;
    totalProcessed: number;
  }