import { TenderStatus, EMDReturnStatus } from "@prisma/client";

export interface Tender {
  id: string;
  tenderNumber: string;
  dueDate: Date;
  description: string;
  hasEMD: boolean;
  emdAmount?: number;
  emdBankName?: string;
  emdSubmissionDate?: Date;
  emdMaturityDate?: Date;
  emdDocumentUrl?: string;
  emdReturnStatus?: EMDReturnStatus;
  emdReturnDate?: Date;
  emdReturnAmount?: number;
  status: TenderStatus;
  documentUrl?: string;
  nitDocumentUrl?: string;
  tags: string[];
  siteId?: string;
  site?: {
    id: string;
    name: string;
    code: string;
    zone?: {
      id: string;
      name: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
} 