import { PrismaClient, Prisma } from '@prisma/client';
import { CreateVendorDto, UpdateVendorDto, BankDetails } from '../../../application/dtos/vendor/CreateVendorDto';
import { Vendor } from '../../../domain/entities/Vendor';

export class PrismaVendorRepository {
    constructor(private prisma: PrismaClient) {}

    private transformToEntity(prismaVendor: any): Vendor {
        return {
            id: prismaVendor.id,
            name: prismaVendor.name,
            email: prismaVendor.email,
            mobile: prismaVendor.mobile,
            gstin: prismaVendor.gstin,
            address: prismaVendor.address,
            remarks: prismaVendor.remarks,
            bankDetails: prismaVendor.bankDetails as BankDetails,
            items: prismaVendor.items,
            purchaseOrders: prismaVendor.purchaseOrders,
            createdAt: prismaVendor.createdAt,
            updatedAt: prismaVendor.updatedAt
        };
    }

    private transformToCreateInput(data: CreateVendorDto): Prisma.VendorCreateInput {
        return {
            name: data.name,
            email: data.email,
            mobile: data.mobile,
            gstin: data.gstin,
            address: data.address,
            remarks: data.remarks,
            bankDetails: data.bankDetails as unknown as Prisma.InputJsonValue
        };
    }

    private transformToUpdateInput(data: UpdateVendorDto): Prisma.VendorUpdateInput {
        const updateData: Prisma.VendorUpdateInput = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.mobile !== undefined) updateData.mobile = data.mobile;
        if (data.gstin !== undefined) updateData.gstin = data.gstin;
        if (data.address !== undefined) updateData.address = data.address;
        if (data.remarks !== undefined) updateData.remarks = data.remarks;
        if (data.bankDetails !== undefined) {
            updateData.bankDetails = data.bankDetails as unknown as Prisma.InputJsonValue;
        }

        return updateData;
    }

    async create(data: CreateVendorDto): Promise<Vendor> {
        try {
            const prismaVendor = await this.prisma.vendor.create({
                data: this.transformToCreateInput(data),
                include: {
                    items: {
                        include: {
                            item: true
                        }
                    },
                    purchaseOrders: true
                }
            });

            return this.transformToEntity(prismaVendor);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    const target = (error.meta?.target as string[]) || [];
                    if (target.includes('email')) {
                        throw new Error('Email already exists');
                    }
                    if (target.includes('gstin')) {
                        throw new Error('GSTIN already exists');
                    }
                }
            }
            throw error;
        }
    }

    async update(id: string, data: UpdateVendorDto): Promise<Vendor> {
        try {
            const prismaVendor = await this.prisma.vendor.update({
                where: { id },
                data: this.transformToUpdateInput(data),
                include: {
                    items: {
                        include: {
                            item: true
                        }
                    },
                    purchaseOrders: true
                }
            });

            return this.transformToEntity(prismaVendor);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new Error('Vendor not found');
                }
                if (error.code === 'P2002') {
                    const target = (error.meta?.target as string[]) || [];
                    if (target.includes('email')) {
                        throw new Error('Email already exists');
                    }
                    if (target.includes('gstin')) {
                        throw new Error('GSTIN already exists');
                    }
                }
            }
            throw error;
        }
    }

    async delete(id: string): Promise<Vendor> {
        try {
            const prismaVendor = await this.prisma.vendor.delete({
                where: { id },
                include: {
                    items: {
                        include: {
                            item: true
                        }
                    },
                    purchaseOrders: true
                }
            });

            return this.transformToEntity(prismaVendor);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new Error('Vendor not found');
                }
                if (error.code === 'P2003') {
                    throw new Error('Cannot delete vendor with existing purchase orders');
                }
            }
            throw error;
        }
    }

    async findById(id: string): Promise<Vendor | null> {
        const prismaVendor = await this.prisma.vendor.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        item: true
                    }
                },
                purchaseOrders: true
            }
        });

        return prismaVendor ? this.transformToEntity(prismaVendor) : null;
    }

    async findByEmail(email: string): Promise<Vendor | null> {
        const prismaVendor = await this.prisma.vendor.findUnique({
            where: { email },
            include: {
                items: {
                    include: {
                        item: true
                    }
                },
                purchaseOrders: true
            }
        });

        return prismaVendor ? this.transformToEntity(prismaVendor) : null;
    }

    async findAll(params: {
        skip?: number;
        take?: number;
        searchTerm?: string;
    }): Promise<Vendor[]> {
        const prismaVendors = await this.prisma.vendor.findMany({
            skip: params.skip,
            take: params.take,
            where: params.searchTerm ? {
                OR: [
                    { name: { contains: params.searchTerm, mode: 'insensitive' } },
                    { email: { contains: params.searchTerm, mode: 'insensitive' } },
                    { gstin: { contains: params.searchTerm, mode: 'insensitive' } }
                ]
            } : undefined,
            include: {
                items: {
                    include: {
                        item: true
                    }
                },
                purchaseOrders: true
            }
        });

        return prismaVendors.map(vendor => this.transformToEntity(vendor));
    }

    async count(params: { searchTerm?: string }): Promise<number> {
        return this.prisma.vendor.count({
            where: params.searchTerm ? {
                OR: [
                    { name: { contains: params.searchTerm, mode: 'insensitive' } },
                    { email: { contains: params.searchTerm, mode: 'insensitive' } },
                    { gstin: { contains: params.searchTerm, mode: 'insensitive' } }
                ]
            } : undefined
        });
    }
}