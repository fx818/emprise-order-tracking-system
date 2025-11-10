import { z } from 'zod';

// Schema for creating or updating a POC
export const pocSchema = z.object({
  name: z.string().min(1, 'POC name is required'),
});

// Types derived from schemas
export type POCFormData = z.infer<typeof pocSchema>;

// Interface for POC
export interface POC {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// API response types
export interface POCsResponse {
  status: string;
  data: {
    pocs: POC[];
    total: number;
  };
}

export interface POCResponse {
  status: string;
  data: POC;
}
