import { DeliveryPeriod } from "./CreateLoaDto";

export interface UpdateLoaDto {
    loaNumber?: string;
    loaValue?: number;
    deliveryPeriod?: DeliveryPeriod;
    dueDate?: string;
    orderReceivedDate?: string;
    workDescription?: string;

    // 📁 File uploads (full list)
    documentFile?: Express.Multer.File;
    securityDepositFile?: Express.Multer.File;
    performanceGuaranteeFile?: Express.Multer.File;
    invoicePdfFile?: Express.Multer.File;  // <-- ADD THIS

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

    // 💰 EMD fields
    hasEmd?: boolean;
    emdAmount?: number;

    // 💰 FDR linking
    hasSd?: boolean;
    sdFdrId?: string | null;
    hasPg?: boolean;
    pgFdrId?: string | null;

    // 📊 Pending breakdown
    recoverablePending?: number;
    paymentPending?: number;

    // 🏦 Manual financial overrides
    manualTotalBilled?: number;
    manualTotalReceived?: number;
    manualTotalDeducted?: number;

    // 🛠️ Warranty fields
    warrantyPeriodMonths?: number;
    warrantyPeriodYears?: number;
    warrantyStartDate?: string;
    warrantyEndDate?: string;
}
