// domain/entities/FDR.ts

export interface FDR {
  id: string;

  // Basic FDR/BG Information
  category: 'SD' | 'PG' | 'FD' | 'BG';
  bankName: string;
  accountNo?: string;
  fdrNumber?: string;
  accountName?: string;

  // Financial Details
  depositAmount: number;
  dateOfDeposit: Date;
  maturityValue?: number;
  maturityDate?: Date;

  // Contract/Project Information
  contractNo?: string;
  contractDetails?: string;
  poc?: string;
  location?: string;

  // Document
  documentUrl?: string;
  extractedData?: any;

  // Status
  status: 'RUNNING' | 'COMPLETED' | 'CANCELLED' | 'RETURNED';

  // Relations
  offerId?: string;

  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
