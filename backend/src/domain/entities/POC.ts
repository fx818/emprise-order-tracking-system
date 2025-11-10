// domain/entities/POC.ts
import { LOA } from './LOA';

export interface POC {
  id: string;
  name: string;
  loas?: LOA[];
  createdAt: Date;
  updatedAt: Date;
}
