import { DeliveryPeriod } from "./CreateLoaDto";

export interface UpdateLoaDto {
    loaNumber?: string;
    loaValue?: number;
    deliveryPeriod?: DeliveryPeriod;
    dueDate?: string;
    orderReceivedDate?: string;
    workDescription?: string;
    documentFile?: Express.Multer.File;
    tags?: string[];
    siteId?: string;
    status?: string;
    remarks?: string;
    tenderNo?: string;
    tenderId?: string;
    orderPOC?: string;
    pocId?: string;
    inspectionAgencyId?: string;
    fdBgDetails?: string;
    // EMD fields
    hasEmd?: boolean;
    emdAmount?: number;
    // FDR linking - link/update existing FDR records
    hasSd?: boolean;
    sdFdrId?: string | null;
    hasPg?: boolean;
    pgFdrId?: string | null;
    receivablePending?: number;
    // Warranty fields
    warrantyPeriodMonths?: number;
    warrantyPeriodYears?: number;
    warrantyStartDate?: string;
    warrantyEndDate?: string;
    // Billing/Invoice fields
    invoiceNumber?: string;
    invoiceAmount?: number;
    totalReceivables?: number;
    actualAmountReceived?: number;
    amountDeducted?: number;
    amountPending?: number;
    deductionReason?: string;
    billLinks?: string;
    invoicePdfFile?: Express.Multer.File;
}