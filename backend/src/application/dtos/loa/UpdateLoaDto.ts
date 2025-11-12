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
    // Pending breakdown fields
    recoverablePending?: number;
    paymentPending?: number;
    // Manual override fields (for historical data entry)
    manualTotalBilled?: number;
    manualTotalReceived?: number;
    manualTotalDeducted?: number;
    // Warranty fields
    warrantyPeriodMonths?: number;
    warrantyPeriodYears?: number;
    warrantyStartDate?: string;
    warrantyEndDate?: string;
}