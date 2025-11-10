export interface LOA {
    purchaseOrders: any;
    id: string;
    loaNumber: string;
    loaValue: number;
    deliveryPeriod: {
        start: Date;
        end: Date;
    };
    dueDate?: Date;
    orderReceivedDate?: Date;
    status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DELAYED';
    site?: {
        id: string;
        name: string;
        code: string;
        zoneId: string;
        zone?: {
            id: string;
            name: string;
            headquarters: string;
        };
    };
    siteId: string;
    workDescription: string;
    documentUrl: string;
    amendments?: Amendment[];
    invoices?: any[]; // Invoice records for billing
    otherDocuments?: OtherDocument[];
    remarks?: string;
    tenderNo?: string;
    orderPOC?: string;
    pocId?: string;
    poc?: {
        id: string;
        name: string;
    };
    inspectionAgencyId?: string;
    inspectionAgency?: {
        id: string;
        name: string;
    };
    fdBgDetails?: string;
    hasEmd: boolean;
    emdAmount?: number;
    hasSd: boolean;
    sdFdrId?: string;
    hasPg: boolean;
    pgFdrId?: string;
    receivablePending?: number;
    actualAmountReceived?: number;
    amountDeducted?: number;
    amountPending?: number;
    deductionReason?: string;
    sdFdr?: {
        id: string;
        bankName: string;
        depositAmount: number;
        dateOfDeposit: Date;
        maturityDate?: Date;
        status: string;
        category: string;
    };
    pgFdr?: {
        id: string;
        bankName: string;
        depositAmount: number;
        dateOfDeposit: Date;
        maturityDate?: Date;
        status: string;
        category: string;
    };
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Amendment {
    id: string;
    amendmentNumber: string;
    documentUrl: string;
    loaId: string;
    loa?: LOA;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface OtherDocument {
    id: string;
    title: string;
    documentUrl: string;
    loaId: string;
    loa?: LOA;
    createdAt: Date;
    updatedAt: Date;
}