// src/features/items/types/item.ts

import { z } from "zod";

export const itemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  uom: z.string().min(1, "Unit of measurement is required"),
  hsnCode: z.string().optional().or(z.literal("")),

  // Vendors added for item creation
  vendors: z
    .array(
      z.object({
        vendorId: z.string().min(1, "Vendor ID is required"),
        unitPrice: z.coerce.number().positive("Unit price must be positive"),
      })
    )
    .optional(),
});

// -------------------------------------------------------
// FORM PAYLOAD TYPE
// This is what ItemForm submits to backend
// -------------------------------------------------------
export type ItemFormData = z.infer<typeof itemSchema>;

// -------------------------------------------------------
// BACKEND RETURN SHAPES
// -------------------------------------------------------

export interface ItemVendor {
  id: string;
  vendor: {
    id: string;
    name: string;
  };
  unitPrice: number;
  lastUpdated: string;
}

export interface Item extends Omit<ItemFormData, "vendors"> {
  id: string;
  status: "ACTIVE" | "INACTIVE";
  vendors: ItemVendor[];
  createdAt: string;
  updatedAt: string;
}
