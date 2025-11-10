// application/dtos/fdr/UpdateFdrDto.ts

export interface UpdateFdrDto {
  // Basic FDR/BG Information
  category?: 'SD' | 'PG' | 'FD' | 'BG';
  bankName?: string;
  accountNo?: string;
  fdrNumber?: string;
  accountName?: string;

  // Financial Details
  depositAmount?: number;
  dateOfDeposit?: Date | string;
  maturityValue?: number;
  maturityDate?: Date | string;

  // Contract/Project Information
  contractNo?: string;
  contractDetails?: string;
  poc?: string;
  location?: string;

  // Document
  documentFile?: Express.Multer.File;
  extractedData?: any;

  // Status
  status?: 'RUNNING' | 'COMPLETED' | 'CANCELLED' | 'RETURNED';

  // Relations
  offerId?: string;

  tags?: string[] | string;
}
