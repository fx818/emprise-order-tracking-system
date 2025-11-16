// application/dtos/item/CreateItemDto.ts

export interface CreateItemDto {
    name: string;
    description?: string;
    unitPrice?: number;
    uom: string;    // Unit of Measurement
    hsnCode?: string;
    vendors?: Array<{
        vendorId: string;
        unitPrice: number;
    }>;

    // taxRates: TaxRates;
}

export interface PriceHistoryData {
    currentPrice: number;
    priceHistory: PriceHistoryEntry[];
    averagePrice: number;
    lowestPrice: number;
    highestPrice: number;
}

export interface PriceHistoryEntry {
    purchaseDate: Date;
    poNumber: string;
    quantity: number;
    unitPrice: number;
    status: string;
}

export interface UpdateItemDto extends Partial<CreateItemDto> { }