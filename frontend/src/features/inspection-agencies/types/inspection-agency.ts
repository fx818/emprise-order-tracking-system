import { z } from 'zod';

// Zod schema for form validation
export const inspectionAgencySchema = z.object({
  name: z.string().min(1, 'Inspection agency name is required'),
});

// Form data type
export type InspectionAgencyFormData = z.infer<typeof inspectionAgencySchema>;

// Entity interface
export interface InspectionAgency {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// API response types
export interface InspectionAgenciesResponse {
  status: string;
  data: {
    inspectionAgencies: InspectionAgency[];
    total: number;
  };
}
