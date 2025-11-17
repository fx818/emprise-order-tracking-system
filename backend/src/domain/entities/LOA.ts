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
    invoices?: any[];
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

    // 💰 Financial tracking
    recoverablePending: number;
    paymentPending: number;

    manualTotalBilled?: number;
    manualTotalReceived?: number;
    manualTotalDeducted?: number;

    totalBilled?: number;
    totalReceived?: number;
    totalDeducted?: number;
    totalPending?: number;

    // 🛡️ FDR Links
    sdFdr?: {
        id: string;
        bankName: string;
        fdrNumber?: string;
        accountNo?: string;
        depositAmount: number;
        dateOfDeposit: Date;
        maturityDate?: Date;
        status: string;
        category: string;
    };

    pgFdr?: {
        id: string;
        bankName: string;
        fdrNumber?: string;
        accountNo?: string;
        depositAmount: number;
        dateOfDeposit: Date;
        maturityDate?: Date;
        status: string;
        category: string;
    };

    generalFdrs?: {
        id: string;
        bankName: string;
        fdrNumber?: string;
        accountNo?: string;
        depositAmount: number;
        dateOfDeposit: Date;
        maturityDate?: Date;
        status: string;
        category: string;
        linkedAt?: Date;
        linkedBy?: {
            id: string;
            name: string;
            email: string;
        };
    }[];

    // 🏷️ Tags
    tags: string[];

    // 🔧 Warranty fields (NEW)
    warrantyPeriodMonths?: number | null;
    warrantyPeriodYears?: number | null;
    warrantyStartDate?: Date | null;
    warrantyEndDate?: Date | null;

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