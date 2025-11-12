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
