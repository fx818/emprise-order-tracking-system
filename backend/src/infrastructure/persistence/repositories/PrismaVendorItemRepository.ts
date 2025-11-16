import { PrismaClient, Prisma } from '@prisma/client';
import { CreateVendorItemDto, UpdateVendorItemDto } from '../../../application/dtos/vendorItem/CreateVendorItemDto';
import { VendorItem } from '../../../domain/entities/VendorItem';

export class PrismaVendorItemRepository {
    constructor(private prisma: PrismaClient) { }

    private transformToEntity(prismaVendorItem: any): VendorItem {
        return {
            vendor: prismaVendorItem.vendor,
            vendorId: prismaVendorItem.vendorId,
            item: prismaVendorItem.item,
            itemId: prismaVendorItem.itemId,
            unitPrice: prismaVendorItem.unitPrice,
            createdAt: prismaVendorItem.createdAt,
            updatedAt: prismaVendorItem.updatedAt
        };
    }

    private transformToCreateInput(data: CreateVendorItemDto): Prisma.VendorItemCreateInput {
        return {
            vendor: {
                connect: { id: data.vendorId }
            },
            item: {
                connect: { id: data.itemId }
            },
            unitPrice: data.unitPrice
        };
    }

    private transformToUpdateInput(data: UpdateVendorItemDto): Prisma.VendorItemUpdateInput {
        return {
            unitPrice: data.unitPrice
        };
    }

    async create(data: CreateVendorItemDto): Promise<VendorItem> {
        try {
            const prismaVendorItem = await this.prisma.vendorItem.create({
                data: this.transformToCreateInput(data),
                include: {
                    vendor: true,
                    item: true
                }
            });

            return this.transformToEntity(prismaVendorItem);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new Error('Vendor-Item relationship already exists');
                }
                if (error.code === 'P2025') {
                    throw new Error('Vendor or Item not found');
                }
            }
            throw error;
        }
    }

    async update(
        vendorId: string,
        itemId: string,
        data: UpdateVendorItemDto
    ): Promise<VendorItem> {
        try {
            const prismaVendorItem = await this.prisma.vendorItem.update({
                where: {
                    vendorId_itemId: {
                        vendorId,
                        itemId
                    }
                },
                data: this.transformToUpdateInput(data),
                include: {
                    vendor: true,
                    item: true
                }
            });

            return this.transformToEntity(prismaVendorItem);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new Error('Vendor-Item relationship not found');
                }
            }
            throw error;
        }
    }

    async delete(vendorId: string, itemId: string): Promise<VendorItem> {
        try {
            const prismaVendorItem = await this.prisma.vendorItem.delete({
                where: {
                    vendorId_itemId: {
                        vendorId,
                        itemId
                    }
                },
                include: {
                    vendor: true,
                    item: true
                }
            });

            return this.transformToEntity(prismaVendorItem);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new Error('Vendor-Item relationship not found');
                }
            }
            throw error;
        }
    }

    async deleteByItemId(itemId: string) {
        return this.prisma.vendorItem.deleteMany({
            where: { itemId }
        });
    }


    async findByVendorAndItem(vendorId: string, itemId: string): Promise<VendorItem | null> {
        const prismaVendorItem = await this.prisma.vendorItem.findUnique({
            where: {
                vendorId_itemId: {
                    vendorId,
                    itemId
                }
            },
            include: {
                vendor: true,
                item: true
            }
        });

        return prismaVendorItem ? this.transformToEntity(prismaVendorItem) : null;
    }

    async findByVendor(vendorId: string): Promise<VendorItem[]> {
        const prismaVendorItems = await this.prisma.vendorItem.findMany({
            where: { vendorId },
            include: {
                vendor: true,
                item: true
            }
        });

        return prismaVendorItems.map(item => this.transformToEntity(item));
    }

    async findByItem(itemId: string): Promise<VendorItem[]> {
        const prismaVendorItems = await this.prisma.vendorItem.findMany({
            where: { itemId },
            include: {
                vendor: true,
                item: true
            }
        });

        return prismaVendorItems.map(item => this.transformToEntity(item));
    }

    async findByPriceRange(
        minPrice: number,
        maxPrice: number
    ): Promise<VendorItem[]> {
        const prismaVendorItems = await this.prisma.vendorItem.findMany({
            where: {
                unitPrice: {
                    gte: minPrice,
                    lte: maxPrice
                }
            },
            include: {
                vendor: true,
                item: true
            }
        });

        return prismaVendorItems.map(item => this.transformToEntity(item));
    }
}