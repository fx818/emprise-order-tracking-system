import { PrismaClient } from '@prisma/client';
import { PurchaseOrder } from '../../../domain/entities/PurchaseOrder';
import { PurchaseOrderItem } from '../../../domain/entities/PurchaseOrderItem';
import { POStatus } from '../../../domain/entities/constants';


export class PrismaPurchaseOrderRepository {
  constructor(private prisma: PrismaClient) {}

  private toDomainEntity(prismaOrder: any): PurchaseOrder {
    return {
      id: prismaOrder.id,
      poNumber: prismaOrder.poNumber,
      loa: prismaOrder.loa,
      loaNumber: prismaOrder.loaNumber,
      loaId: prismaOrder.loaId,
      vendor: prismaOrder.vendor,
      vendorId: prismaOrder.vendorId,
      items: prismaOrder.items?.map((item: any) => ({
        id: item.id,
        item: item.item,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        // taxRate: item.taxRate,
        totalAmount: item.totalAmount,
        purchaseOrderId: item.purchaseOrderId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })) || [],
      site: {
        id: prismaOrder.site.id,
        name: prismaOrder.site.name,
        code: prismaOrder.site.code,
        zoneId: prismaOrder.site.zoneId
      } ,
      siteId: prismaOrder.siteId,
      requirementDesc: prismaOrder.requirementDesc,
      termsConditions: prismaOrder.termsConditions,
      shipToAddress: prismaOrder.shipToAddress,
      baseAmount: prismaOrder.baseAmount,
      taxAmount: prismaOrder.taxAmount,
      additionalCharges: prismaOrder.additionalCharges || [],
      totalAmount: prismaOrder.totalAmount,
      notes: prismaOrder.notes,
      documentUrl: prismaOrder.documentUrl,
      documentHash: prismaOrder.documentHash,
      status: prismaOrder.status as POStatus,
      createdBy: prismaOrder.createdBy,
      createdById: prismaOrder.createdById,
      approver: prismaOrder.approver,
      approverId: prismaOrder.approverId,
      approvalComments: prismaOrder.approvalComments,
      rejectionReason: prismaOrder.rejectionReason,
      approvalHistory: prismaOrder.approvalHistory || [],
      tags: prismaOrder.tags || [],
      createdAt: prismaOrder.createdAt,
      updatedAt: prismaOrder.updatedAt
    };
  }

  private toPrismaEntity(domainOrder: Partial<PurchaseOrder>) {
    const { items, loa, vendor, site, createdBy, approver, ...prismaData } = domainOrder;
    
    const updateData: any = {};

    // Handle scalar fields
    if (prismaData.poNumber) updateData.poNumber = prismaData.poNumber;
    if (prismaData.requirementDesc) updateData.requirementDesc = prismaData.requirementDesc;
    if (prismaData.termsConditions) updateData.termsConditions = prismaData.termsConditions;
    if (prismaData.shipToAddress) updateData.shipToAddress = prismaData.shipToAddress;
    if (prismaData.baseAmount !== undefined) updateData.baseAmount = prismaData.baseAmount;
    if (prismaData.taxAmount !== undefined) updateData.taxAmount = prismaData.taxAmount;
    if (prismaData.additionalCharges !== undefined) updateData.additionalCharges = prismaData.additionalCharges;
    if (prismaData.totalAmount !== undefined) updateData.totalAmount = prismaData.totalAmount;
    if (prismaData.notes !== undefined) updateData.notes = prismaData.notes;
    if (prismaData.documentUrl !== undefined) updateData.documentUrl = prismaData.documentUrl;
    if (prismaData.documentHash !== undefined) updateData.documentHash = prismaData.documentHash;
    if (prismaData.status) updateData.status = prismaData.status;
    if (prismaData.approvalComments !== undefined) updateData.approvalComments = prismaData.approvalComments;
    if (prismaData.rejectionReason !== undefined) updateData.rejectionReason = prismaData.rejectionReason;

    // Handle relation IDs using connect
    if (prismaData.loaId) updateData.loa = { connect: { id: prismaData.loaId } };
    if (prismaData.vendorId) updateData.vendor = { connect: { id: prismaData.vendorId } };
    if (prismaData.siteId) updateData.site = { connect: { id: prismaData.siteId } };
    if (prismaData.createdById) updateData.createdBy = { connect: { id: prismaData.createdById } };
    if (prismaData.approverId) updateData.approver = { connect: { id: prismaData.approverId } };

    // Handle arrays
    if (prismaData.approvalHistory) {
      updateData.approvalHistory = {
        set: prismaData.approvalHistory
      };
    }

    if (prismaData.tags) {
      updateData.tags = {
        set: prismaData.tags
      };
    }

    return updateData;
  }
  
  async create(data: any): Promise<PurchaseOrder> {
    try {
      const { items, ...poData } = data;
      
      // Remove approverId if it's empty/undefined
      const createData = { ...poData };
      if (!createData.approverId) {
        delete createData.approverId;
      }

      const prismaResult = await this.prisma.purchaseOrder.create({
        data: {
          ...createData,
          items: {
            create: items.map((item: any) => ({
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.quantity * item.unitPrice,
              item: {
                connect: { id: item.itemId }
              }
            }))
          }
        },
        include: {
          loa: true,
          vendor: true,
          site: true,
          items: {
            include: {
              item: true
            }
          },
          createdBy: true,
          approver: true
        }
      });

      return this.toDomainEntity(prismaResult);
    } catch (error) {
      console.error('Error creating purchase order:', error);
      throw error;
    }
  }

  async update(id: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const { items, ...updateData } = data;

    // First update the PO data
    const updatedPO = await this.prisma.purchaseOrder.update({
      where: { id },
      data: this.toPrismaEntity(updateData),
      include: {
        loa: true,
        vendor: true,
        site: true,
        items: {
          include: {
            item: true
          }
        },
        createdBy: true,
      }
    });

    // If items were provided, update them
    if (items && items.length > 0) {
      await this.updateItems(id, items.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        // taxRates: {
        //   igst: item.taxRates.igst || 0,
        //   sgst: item.taxRates.sgst || 0,
        //   ugst: item.taxRates.ugst || 0
        // }
      })));
    }

    // Fetch the updated PO with all relations
    const finalPO = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        loa: true,
        vendor: true,
        site: true,
        items: {
          include: {
            item: true
          }
        },
        createdBy: true,
        approver: true
      }
    });

    if (!finalPO) {
      throw new Error('Failed to fetch updated purchase order');
    }

    return this.toDomainEntity(finalPO);
  }
  
  async delete(id: string): Promise<PurchaseOrder> {
    const prismaResult = await this.prisma.purchaseOrder.delete({
      where: { id },
      include: {
        loa: true,
        vendor: true,
        site: true,
        items: {
          include: {
            item: true
          }
        },
        createdBy: true,
        approver: true
      }
    });

    return this.toDomainEntity(prismaResult);
  }

  async findById(id: string): Promise<PurchaseOrder | null> {
    const prismaResult = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        loa: true,
        vendor: true,
        site: true,
        items: {
          include: {
            item: true
          }
        },
        createdBy: true,
        approver: true
      }
    });

    return prismaResult ? this.toDomainEntity(prismaResult) : null;
  }

  async findByPoNumber(poNumber: string): Promise<PurchaseOrder | null> {
    const prismaResult = await this.prisma.purchaseOrder.findUnique({
      where: { poNumber },
      include: {
        loa: true,
        vendor: true,
        site: true,
        items: {
          include: {
            item: true
          }
        },
        createdBy: true,
        approver: true
      }
    });

    return prismaResult ? this.toDomainEntity(prismaResult) : null;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    status?: POStatus;
    vendorId?: string;
    siteId?: string;
    zoneId?: string;
    loaId?: string;
    createdById?: string;
    approverId?: string;
    searchTerm?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PurchaseOrder[]> {
    const { skip, take, status, vendorId, siteId, zoneId, loaId, createdById, approverId, searchTerm, sortBy, sortOrder } = params;

    // Determine sort configuration
    let orderBy: any = { createdAt: 'desc' }; // Default sorting

    if (sortBy && sortOrder) {
      switch (sortBy) {
        case 'totalAmount':
          orderBy = { totalAmount: sortOrder };
          break;
        case 'createdAt':
          orderBy = { createdAt: sortOrder };
          break;
        case 'poNumber':
          orderBy = { poNumber: sortOrder };
          break;
        default:
          orderBy = { createdAt: 'desc' };
      }
    }

    const prismaResults = await this.prisma.purchaseOrder.findMany({
      skip,
      take,
      where: {
        AND: [
          status ? { status } : {},
          vendorId ? { vendorId } : {},
          siteId ? { siteId } : {},
          zoneId ? { site: { zoneId } } : {},
          loaId ? { loaId } : {},
          createdById ? { createdById } : {},
          approverId ? { approverId } : {},
          searchTerm ? {
            OR: [
              { poNumber: { contains: searchTerm, mode: 'insensitive' } },
              { requirementDesc: { contains: searchTerm, mode: 'insensitive' } },
              { tags: { has: searchTerm } }
            ]
          } : {}
        ]
      },
      include: {
        loa: true,
        vendor: true,
        site: true,
        items: {
          include: {
            item: true
          }
        },
        createdBy: true,
        approver: true
      },
      orderBy
    });

    return prismaResults.map(result => this.toDomainEntity(result));
  }

  async count(params: {
    status?: POStatus;
    vendorId?: string;
    siteId?: string;
    zoneId?: string;
    loaId?: string;
    createdById?: string;
    approverId?: string;
    searchTerm?: string;
  }): Promise<number> {
    const { status, vendorId, siteId, zoneId, loaId, createdById, approverId, searchTerm } = params;

    return this.prisma.purchaseOrder.count({
      where: {
        AND: [
          status ? { status } : {},
          vendorId ? { vendorId } : {},
          siteId ? { siteId } : {},
          zoneId ? { site: { zoneId } } : {},
          loaId ? { loaId } : {},
          createdById ? { createdById } : {},
          approverId ? { approverId } : {},
          searchTerm ? {
            OR: [
              { poNumber: { contains: searchTerm, mode: 'insensitive' } },
              { requirementDesc: { contains: searchTerm, mode: 'insensitive' } },
              { tags: { has: searchTerm } }
            ]
          } : {}
        ]
      }
    });
  }
  async updateItems(
    purchaseOrderId: string,
    items: Array<{
      itemId: string;
      quantity: number;
      unitPrice: number;
      // taxRates: {
      //   igst: number;
      //   sgst: number;
      //   ugst: number;
      // };
    }>
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // First delete all existing items
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId }
        });

        // Then create new items one by one to ensure proper data creation
        for (const item of items) {
          await tx.purchaseOrderItem.create({
            data: {
              purchaseOrderId,
              itemId: item.itemId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              // taxRates: item.taxRates,
              // taxRate: (item.taxRates.igst || 0) + (item.taxRates.sgst || 0) + (item.taxRates.ugst || 0),
              totalAmount: this.calculateItemTotal(item)
            }
          });
        }
      });

      // Log successful update
    } catch (error) {
      console.error('Error updating PO items:', error);
      throw error;
    }
  }
  
  private calculateItemTotal(item: {
    quantity: number;
    unitPrice: number;
  }): number {
    const baseAmount = item.quantity * item.unitPrice;
    // return baseAmount + (baseAmount * (totalTaxRate / 100));
    return baseAmount;
  }
  async getItemsForPo(purchaseOrderId: string): Promise<PurchaseOrderItem[]> {
    const prismaItems = await this.prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId },
      include: {
        item: true,
        purchaseOrder: {
          include: {
            site: true,
            loa: true,
            vendor: true,
            items: {
              include: {
                item: true
              }
            },
            createdBy: true,
            approver: true
          }
        }
      }
    });
  
    return prismaItems.map(prismaItem => ({
      id: prismaItem.id,
      purchaseOrder: this.toDomainEntity(prismaItem.purchaseOrder),
      purchaseOrderId: prismaItem.purchaseOrderId,
      item: {
        id: prismaItem.item.id,
        name: prismaItem.item.name,
        description: prismaItem.item.description || undefined,
        unitPrice: prismaItem.item.unitPrice || 0,
        uom: prismaItem.item.uom,
        hsnCode: prismaItem.item.hsnCode || undefined,
        createdAt: prismaItem.item.createdAt,
        updatedAt: prismaItem.item.updatedAt
      },
      itemId: prismaItem.itemId,
      quantity: prismaItem.quantity || 0,
      unitPrice: prismaItem.unitPrice || 0,
      totalAmount: prismaItem.totalAmount || 0,
      createdAt: prismaItem.createdAt,
      updatedAt: prismaItem.updatedAt
    }));
  }

  async getTotalValue(purchaseOrderId: string): Promise<number> {
    const items = await this.getItemsForPo(purchaseOrderId);
    return items.reduce((sum, item) => sum + item.totalAmount, 0);
  }

  async findLatestPoNumber(): Promise<string | null> {
    const latestPO = await this.prisma.purchaseOrder.findFirst({
      orderBy: {
        poNumber: 'desc'
      },
      select: {
        poNumber: true
      }
    });
    
    return latestPO?.poNumber || null;
  }
}