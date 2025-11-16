export interface BankDetails {
    accountNumber: string;
    accountName: string;
    bankName: string;
    branchName: string;
    ifscCode: string;
}

export interface CreateVendorDto {
    name: string;
    email: string;
    mobile: string;
    gstin?: string;
    address: string;
    remarks?: string;
    bankDetails: BankDetails;
}

export interface UpdateVendorDto extends Partial<CreateVendorDto> { }