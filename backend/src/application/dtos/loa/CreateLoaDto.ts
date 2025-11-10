export interface DeliveryPeriod {
    start: string;
    end: string;
}

export interface CreateLoaDto {
    loaNumber: string;
    loaValue: number;
    deliveryPeriod: DeliveryPeriod;
    dueDate?: string;
    orderReceivedDate?: string;
    workDescription: string;
    documentFile?: Express.Multer.File;
    tags?: string[];
    siteId: string;
    remarks?: string;
    tenderNo?: string;
    tenderId?: string;
    orderPOC?: string;
    pocId?: string;
    inspectionAgencyId?: string;
    fdBgDetails?: string;
    hasEmd?: boolean;
    emdAmount?: number;
    // FDR linking - link existing FDR records
    hasSd?: boolean;
    sdFdrId?: string;
    hasPg?: boolean;
    pgFdrId?: string;
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
