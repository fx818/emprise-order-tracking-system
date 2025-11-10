import { TenderStatus, EMDReturnStatus } from "@prisma/client";

export interface UpdateTenderDto {
  tenderNumber?: string;
  dueDate?: Date | string;
  description?: string;
  hasEMD?: boolean | string;
  emdAmount?: number | string | null;
  emdBankName?: string;
  emdSubmissionDate?: Date | string;
  emdMaturityDate?: Date | string;
  emdDocumentFile?: Express.Multer.File;
  emdReturnStatus?: EMDReturnStatus;
  emdReturnDate?: Date | string;
  emdReturnAmount?: number | string;
  status?: TenderStatus;
  documentFile?: Express.Multer.File;
  nitDocumentFile?: Express.Multer.File;
  tags?: string[];
  siteId?: string;
} 