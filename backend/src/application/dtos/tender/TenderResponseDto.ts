import { TenderStatus, EMDReturnStatus } from "@prisma/client";

export interface TenderResponseDto {
  id: string;
  tenderNumber: string;
  dueDate: Date;
  description: string;
  hasEMD: boolean;
  emdAmount?: number | null;
  emdBankName?: string | null;
  emdSubmissionDate?: Date | null;
  emdMaturityDate?: Date | null;
  emdDocumentUrl?: string | null;
  emdReleaseStatus?: EMDReturnStatus | null;
  emdReleaseDate?: Date | null;
  emdReleaseAmount?: number | null;
  status: TenderStatus;
  documentUrl?: string;
  nitDocumentUrl?: string;
  tags: string[];
  siteId?: string | null;
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