// domain/entities/InspectionAgency.ts
import { LOA } from './LOA';

export interface InspectionAgency {
  id: string;
  name: string;
  loas?: LOA[];
  createdAt: Date;
  updatedAt: Date;
}
