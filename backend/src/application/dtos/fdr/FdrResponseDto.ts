// application/dtos/fdr/FdrResponseDto.ts

export interface FdrResponseDto {
  id: string;

  // Basic FDR/BG Information
  category: 'FD' | 'BG';
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

  // Deposit Usage
  emdAmount?: number;
  sdAmount?: number;

  // Document
  documentUrl?: string;
  extractedData?: any;

  // Status
  status: 'RUNNING' | 'AVAILABLE_FOR_RELEASE' | 'CANCELLED' | 'RETURNED';

  // Relations
  offer?: {
    id: string;
    offerId: string;
    subject: string;
  };
  offerId?: string;

  loa?: {
    id: string;
    loaNumber: string;
  };
  loaId?: string;

  tender?: {
    id: string;
    tenderNumber: string;
    description: string;
  };
  tenderId?: string;

  tags: string[];
  createdAt: Date;
  updatedAt: Date;

  // Computed fields
  daysUntilMaturity?: number;
  isExpired?: boolean;
}
