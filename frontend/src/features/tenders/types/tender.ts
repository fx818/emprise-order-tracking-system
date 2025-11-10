import { z } from 'zod';

export const tenderSchema = z.object({
  tenderNumber: z.string().min(1, 'Tender number is required'),
  dueDate: z.date(),
  description: z.string().min(1, 'Description is required'),
  hasEMD: z.boolean().default(false),
  emdAmount: z.number().min(0, 'EMD amount must be positive').optional().nullable(),
  emdBankName: z.string().optional(),
  emdSubmissionDate: z.date().optional(),
  emdMaturityDate: z.date().optional(),
  tags: z.array(z.string()).default([]),
  documentFile: z.any().optional(),
  nitDocumentFile: z.any().optional(),
  emdDocumentFile: z.any().optional(),
  siteId: z.string().optional()
});

export type TenderFormData = z.infer<typeof tenderSchema>;

export type TenderStatus = 'ACTIVE' | 'RETENDERED' | 'CANCELLED' | 'AWARDED' | 'NOT_AWARDED';

export type EMDReturnStatus = 'PENDING' | 'RELEASED' | 'RETAINED_AS_SD';

export interface Tender {
  id: string;
  tenderNumber: string;
  dueDate: string;
  description: string;
  hasEMD: boolean;
  emdAmount?: number | null;
  emdBankName?: string | null;
  emdSubmissionDate?: string | null;
  emdMaturityDate?: string | null;
  emdDocumentUrl?: string | null;
  emdReturnStatus?: EMDReturnStatus | null;
  emdReturnDate?: string | null;
  emdReturnAmount?: number | null;
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
  createdAt: string;
  updatedAt: string;
}

export interface TenderResponse {
  status: string;
  data: {
    data: Tender[];
    total: number;
  } | Tender | Tender[];
} 