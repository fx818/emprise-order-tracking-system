import { TenderStatus } from "@prisma/client";

export interface CreateTenderDto {
  tenderNumber: string;
  dueDate: Date | string;
  description: string;
  hasEMD: boolean | string;
  emdAmount?: number | string | null;
  emdBankName?: string;
  emdSubmissionDate?: Date | string;
  emdMaturityDate?: Date | string;
  emdDocumentFile?: Express.Multer.File;
  status?: TenderStatus;
  documentFile?: Express.Multer.File;
  nitDocumentFile?: Express.Multer.File;
  tags?: string[];
  siteId?: string;
} 