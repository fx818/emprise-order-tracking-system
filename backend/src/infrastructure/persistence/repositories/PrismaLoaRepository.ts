// infrastructure/persistence/repositories/PrismaLoaRepository.ts
import { PrismaClient, Prisma, LOA as PrismaLOA, Amendment as PrismaAmendment, OtherDocument as PrismaOtherDocument } from '@prisma/client';
import { DeliveryPeriod } from '../../../application/dtos/loa/CreateLoaDto';
import { LOA, Amendment, OtherDocument } from '../../../domain/entities/LOA';

export class PrismaLoaRepository {
  constructor(private prisma: PrismaClient) {}

  private mapPrismaLoaToLoa(prismaLoa: PrismaLOA & {
    amendments: PrismaAmendment[];
    otherDocuments?: PrismaOtherDocument[];
    purchaseOrders: any[]; // Replace 'any' with your PO type
    invoices?: any[];
    site?: any;
    tender?: any;
    poc?: any;
    inspectionAgency?: any;
    sdFdr?: any;
    pgFdr?: any;
  }): LOA {
    // Don't parse the deliveryPeriod as it's already an object
    return {
      id: prismaLoa.id,
      loaNumber: prismaLoa.loaNumber,
      loaValue: prismaLoa.loaValue,
      deliveryPeriod: prismaLoa.deliveryPeriod ? {
        start: new Date((prismaLoa.deliveryPeriod as any).start),
        end: new Date((prismaLoa.deliveryPeriod as any).end)
      } : { start: new Date(), end: new Date() },
      dueDate: prismaLoa.dueDate || undefined,
      orderReceivedDate: prismaLoa.orderReceivedDate || undefined,
      status: (prismaLoa.status || 'NOT_STARTED') as any, // Ensure status is always set
      workDescription: prismaLoa.workDescription,
      documentUrl: prismaLoa.documentUrl,
      tags: prismaLoa.tags,
      remarks: prismaLoa.remarks || undefined,
      tenderNo: prismaLoa.tenderNo || undefined,
      orderPOC: prismaLoa.orderPOC || undefined,
      pocId: prismaLoa.pocId || undefined,
      poc: prismaLoa.poc ? {
        id: prismaLoa.poc.id,
        name: prismaLoa.poc.name
      } : undefined,
      inspectionAgencyId: prismaLoa.inspectionAgencyId || undefined,
      inspectionAgency: prismaLoa.inspectionAgency ? {
        id: prismaLoa.inspectionAgency.id,
        name: prismaLoa.inspectionAgency.name
      } : undefined,
      fdBgDetails: prismaLoa.fdBgDetails || undefined,
      amendments: prismaLoa.amendments.map(amendment => ({
        id: amendment.id,
        amendmentNumber: amendment.amendmentNumber,
        documentUrl: amendment.documentUrl,
        tags: amendment.tags,
        createdAt: amendment.createdAt,
        updatedAt: amendment.updatedAt,
        loaId: amendment.loaId
      })),
      invoices: prismaLoa.invoices || [],
      otherDocuments: prismaLoa.otherDocuments?.map(doc => ({
        id: doc.id,
        title: doc.title,
        documentUrl: doc.documentUrl,
        loaId: doc.loaId,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      })) || [],
      site: prismaLoa.site ? {
        id: prismaLoa.site.id,
        name: prismaLoa.site.name,
        code: prismaLoa.site.code,
        zoneId: prismaLoa.site.zoneId,
        zone: prismaLoa.site.zone ? {
          id: prismaLoa.site.zone.id,
          name: prismaLoa.site.zone.name,
          headquarters: prismaLoa.site.zone.headquarters,
        } : undefined,
      } : undefined,
      siteId: prismaLoa.siteId || '',
      purchaseOrders: prismaLoa.purchaseOrders,
      hasEmd: prismaLoa.hasEmd,
      emdAmount: prismaLoa.emdAmount || undefined,
      hasSd: prismaLoa.hasSd,
      sdFdrId: prismaLoa.sdFdrId || undefined,
      hasPg: prismaLoa.hasPg,
      pgFdrId: prismaLoa.pgFdrId || undefined,
      sdFdr: prismaLoa.sdFdr ? {
        id: prismaLoa.sdFdr.id,
        bankName: prismaLoa.sdFdr.bankName,
        depositAmount: prismaLoa.sdFdr.depositAmount,
        dateOfDeposit: prismaLoa.sdFdr.dateOfDeposit,
        maturityDate: prismaLoa.sdFdr.maturityDate || undefined,
        status: prismaLoa.sdFdr.status,
        category: prismaLoa.sdFdr.category
      } : undefined,
      pgFdr: prismaLoa.pgFdr ? {
        id: prismaLoa.pgFdr.id,
        bankName: prismaLoa.pgFdr.bankName,
        depositAmount: prismaLoa.pgFdr.depositAmount,
        dateOfDeposit: prismaLoa.pgFdr.dateOfDeposit,
        maturityDate: prismaLoa.pgFdr.maturityDate || undefined,
        status: prismaLoa.pgFdr.status,
        category: prismaLoa.pgFdr.category
      } : undefined,
      recoverablePending: prismaLoa.recoverablePending,
      paymentPending: prismaLoa.paymentPending,
      manualTotalBilled: prismaLoa.manualTotalBilled || undefined,
      manualTotalReceived: prismaLoa.manualTotalReceived || undefined,
      manualTotalDeducted: prismaLoa.manualTotalDeducted || undefined,
      createdAt: prismaLoa.createdAt,
      updatedAt: prismaLoa.updatedAt
    };
  }

  private mapPrismaAmendmentToAmendment(prismaAmendment: PrismaAmendment & {
    loa: PrismaLOA & {
      amendments: PrismaAmendment[];
      purchaseOrders: any[]; // Replace 'any' with your PO type
    };
  }): Amendment {
    return {
      id: prismaAmendment.id,
      amendmentNumber: prismaAmendment.amendmentNumber,
      documentUrl: prismaAmendment.documentUrl,
      tags: prismaAmendment.tags,
      loaId: prismaAmendment.loaId,
      loa: this.mapPrismaLoaToLoa(prismaAmendment.loa),
      createdAt: prismaAmendment.createdAt,
      updatedAt: prismaAmendment.updatedAt
    };
  }

  async create(data: {
    loaNumber: string;
    loaValue: number;
    deliveryPeriod: DeliveryPeriod;
    workDescription: string;
    documentUrl: string;
    tags: string[];
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
    hasSd?: boolean;
    sdFdrId?: string;
    hasPg?: boolean;
    pgFdrId?: string;
    warrantyPeriodMonths?: number;
    warrantyPeriodYears?: number;
    warrantyStartDate?: Date;
    warrantyEndDate?: Date;
    dueDate?: Date;
    orderReceivedDate?: Date;
    recoverablePending?: number;
    paymentPending?: number;
    manualTotalBilled?: number;
    manualTotalReceived?: number;
    manualTotalDeducted?: number;
  }): Promise<LOA> {
    try {
      const prismaLoa = await this.prisma.lOA.create({
        data: {
          loaNumber: data.loaNumber,
          loaValue: data.loaValue,
          deliveryPeriod: {
            start: new Date(data.deliveryPeriod.start),
            end: new Date(data.deliveryPeriod.end)
          },
          workDescription: data.workDescription,
          documentUrl: data.documentUrl,
          tags: data.tags,
          siteId: data.siteId,
          tenderId: data.tenderId || null,
          remarks: data.remarks || null,
          tenderNo: data.tenderNo || null,
          orderPOC: data.orderPOC || null,
          pocId: data.pocId || null,
          inspectionAgencyId: data.inspectionAgencyId || null,
          fdBgDetails: data.fdBgDetails || null,
          hasEmd: data.hasEmd || false,
          emdAmount: data.emdAmount || null,
          hasSd: data.hasSd || false,
          sdFdrId: data.sdFdrId || null,
          hasPg: data.hasPg || false,
          pgFdrId: data.pgFdrId || null,
          recoverablePending: data.recoverablePending || 0,
          paymentPending: data.paymentPending || 0,
          manualTotalBilled: data.manualTotalBilled || null,
          manualTotalReceived: data.manualTotalReceived || null,
          manualTotalDeducted: data.manualTotalDeducted || null
        },
        include: {
          amendments: true,
          purchaseOrders: true,
          invoices: true,
          site: {
            include: {
              zone: true
            }
          },
          tender: true,
          poc: true,
          inspectionAgency: true,
          sdFdr: true,
          pgFdr: true
        }
      });

      return this.mapPrismaLoaToLoa(prismaLoa);
    } catch (error) {
      console.error('PrismaLoaRepository create error:', error);
      throw error;
    }
  }

  async update(id: string, data: any): Promise<LOA> {
    // Convert plain object to Prisma update structure
    const updateData: Prisma.LOAUpdateInput = {};

    // Only set fields that are defined
    if (data.loaNumber !== undefined) updateData.loaNumber = data.loaNumber;
    if (data.loaValue !== undefined) updateData.loaValue = data.loaValue;
    if (data.workDescription !== undefined) updateData.workDescription = data.workDescription;
    if (data.documentUrl !== undefined) updateData.documentUrl = data.documentUrl;
    if (data.tags) updateData.tags = { set: data.tags };
    
    // Add status field handling
    if (data.status !== undefined) updateData.status = data.status;
    
    // Handle delivery period
    if (data.deliveryPeriod) {
      updateData.deliveryPeriod = {
        start: new Date(data.deliveryPeriod.start),
        end: new Date(data.deliveryPeriod.end)
      };
    }
    
    // Handle optional EDM fields
    if (data.hasEmd !== undefined) updateData.hasEmd = data.hasEmd;
    if (data.emdAmount !== undefined) updateData.emdAmount = data.emdAmount;

    // Handle optional LOA fields
    if (data.remarks !== undefined) updateData.remarks = data.remarks;
    if (data.tenderNo !== undefined) updateData.tenderNo = data.tenderNo;
    if (data.tenderId !== undefined) {
      updateData.tender = data.tenderId ? { connect: { id: data.tenderId } } : { disconnect: true };
    }
    if (data.orderPOC !== undefined) updateData.orderPOC = data.orderPOC;
    if (data.pocId !== undefined) {
      updateData.poc = data.pocId ? { connect: { id: data.pocId } } : { disconnect: true };
    }
    if (data.inspectionAgencyId !== undefined) {
      updateData.inspectionAgency = data.inspectionAgencyId ? { connect: { id: data.inspectionAgencyId } } : { disconnect: true };
    }
    if (data.fdBgDetails !== undefined) updateData.fdBgDetails = data.fdBgDetails;

    // Handle pending split fields
    if (data.recoverablePending !== undefined) updateData.recoverablePending = data.recoverablePending;
    if (data.paymentPending !== undefined) updateData.paymentPending = data.paymentPending;

    // Handle manual override fields
    if (data.manualTotalBilled !== undefined) updateData.manualTotalBilled = data.manualTotalBilled;
    if (data.manualTotalReceived !== undefined) updateData.manualTotalReceived = data.manualTotalReceived;
    if (data.manualTotalDeducted !== undefined) updateData.manualTotalDeducted = data.manualTotalDeducted;

    try {
      const prismaLoa = await this.prisma.lOA.update({
        where: { id },
        data: updateData,
        include: {
          amendments: true,
          purchaseOrders: true,
          invoices: true,
          site: {
            include: {
              zone: true
            }
          },
          tender: true,
          poc: true,
          inspectionAgency: true,
          sdFdr: true,
          pgFdr: true
        }
      });

      return this.mapPrismaLoaToLoa(prismaLoa);
    } catch (error) {
      console.error('PrismaLoaRepository update error:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<LOA> {
    const prismaLoa = await this.prisma.lOA.delete({
      where: { id },
      include: {
        amendments: true,
        purchaseOrders: true,
        poc: true,
        inspectionAgency: true
      }
    });

    return this.mapPrismaLoaToLoa(prismaLoa);
  }

  async findById(id: string): Promise<LOA | null> {
    const prismaLoa = await this.prisma.lOA.findUnique({
      where: { id },
      include: {
        amendments: true,
        otherDocuments: true,
        purchaseOrders: true,
        invoices: true,
        site: {
          include: {
            zone: true
          }
        },
        tender: true,
        poc: true,
        inspectionAgency: true,
        sdFdr: true,
        pgFdr: true
      }
    });

    return prismaLoa ? this.mapPrismaLoaToLoa(prismaLoa) : null;
  }

  async findByLoaNumber(loaNumber: string): Promise<LOA | null> {
    const prismaLoa = await this.prisma.lOA.findUnique({
      where: { loaNumber },
      include: {
        amendments: true,
        otherDocuments: true,
        purchaseOrders: true,
        site: {
          include: {
            zone: true
          }
        },
        tender: true,
        poc: true,
        inspectionAgency: true,
        sdFdr: true,
        pgFdr: true
      }
    });

    return prismaLoa ? this.mapPrismaLoaToLoa(prismaLoa) : null;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    searchTerm?: string;
    siteId?: string;
    zoneId?: string;
    tenderId?: string;
    status?: string;
    minValue?: number;
    maxValue?: number;
    hasEMD?: boolean;
    hasSecurity?: boolean;
    hasPerformanceGuarantee?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<LOA[]> {
    // Determine sort configuration
    let orderBy: any = { createdAt: 'desc' }; // Default sorting

    if (params.sortBy && params.sortOrder) {
      switch (params.sortBy) {
        case 'loaValue':
          orderBy = { loaValue: params.sortOrder };
          break;
        case 'deliveryStartDate':
          orderBy = { deliveryPeriod: { start: params.sortOrder } };
          break;
        case 'deliveryEndDate':
          orderBy = { deliveryPeriod: { end: params.sortOrder } };
          break;
        case 'dueDate':
          orderBy = { dueDate: params.sortOrder };
          break;
        case 'createdAt':
          orderBy = { createdAt: params.sortOrder };
          break;
        default:
          orderBy = { createdAt: 'desc' };
      }
    }

    // Build where clause with filters
    const whereConditions: any[] = [];

    if (params.siteId) {
      whereConditions.push({ siteId: params.siteId });
    }

    if (params.zoneId) {
      whereConditions.push({ site: { zoneId: params.zoneId } });
    }

    if (params.tenderId) {
      whereConditions.push({ tenderId: params.tenderId });
    }

    if (params.status) {
      if (params.status === 'ACTIVE') {
        // 'ACTIVE' means exclude CLOSED status
        whereConditions.push({ status: { not: 'CLOSED' } });
      } else {
        // Direct status match (e.g., 'CLOSED', 'IN_PROGRESS', etc.)
        whereConditions.push({ status: params.status });
      }
    }

    if (params.minValue !== undefined || params.maxValue !== undefined) {
      const valueFilter: any = {};
      if (params.minValue !== undefined) {
        valueFilter.gte = params.minValue;
      }
      if (params.maxValue !== undefined) {
        valueFilter.lte = params.maxValue;
      }
      whereConditions.push({ loaValue: valueFilter });
    }

    if (params.hasEMD !== undefined) {
      whereConditions.push({ hasEmd: params.hasEMD });
    }

    if (params.hasSecurity !== undefined) {
      whereConditions.push({ hasSecurityDeposit: params.hasSecurity });
    }

    if (params.hasPerformanceGuarantee !== undefined) {
      whereConditions.push({ hasPerformanceGuarantee: params.hasPerformanceGuarantee });
    }

    if (params.searchTerm) {
      whereConditions.push({
        OR: [
          { loaNumber: { contains: params.searchTerm, mode: 'insensitive' } },
          { workDescription: { contains: params.searchTerm, mode: 'insensitive' } },
          { tags: { has: params.searchTerm } },
          { site: {
            OR: [
              { name: { contains: params.searchTerm, mode: 'insensitive' } },
              { code: { contains: params.searchTerm, mode: 'insensitive' } }
            ]
          }}
        ]
      });
    }

    const prismaLoas = await this.prisma.lOA.findMany({
      skip: params.skip,
      take: params.take,
      where: whereConditions.length > 0 ? { AND: whereConditions } : {},
      include: {
        amendments: true,
        otherDocuments: true,
        purchaseOrders: true,
        invoices: true,
        site: {
          include: {
            zone: true  // Include customer/zone data
          }
        },
        tender: true,  // Include tender data
        poc: true,  // Include POC data
        sdFdr: true,  // Include Security Deposit FDR
        pgFdr: true  // Include Performance Guarantee FDR
      },
      orderBy
    });

    return prismaLoas.map(this.mapPrismaLoaToLoa.bind(this));
  }

  async count(params: {
    searchTerm?: string;
    siteId?: string;
    zoneId?: string;
    tenderId?: string;
    status?: string;
    minValue?: number;
    maxValue?: number;
    hasEMD?: boolean;
    hasSecurity?: boolean;
    hasPerformanceGuarantee?: boolean;
  }): Promise<number> {
    // Build where clause with filters - same logic as findAll
    const whereConditions: any[] = [];

    if (params.siteId) {
      whereConditions.push({ siteId: params.siteId });
    }

    if (params.zoneId) {
      whereConditions.push({ site: { zoneId: params.zoneId } });
    }

    if (params.tenderId) {
      whereConditions.push({ tenderId: params.tenderId });
    }

    if (params.status) {
      if (params.status === 'ACTIVE') {
        // 'ACTIVE' means exclude CLOSED status
        whereConditions.push({ status: { not: 'CLOSED' } });
      } else {
        // Direct status match (e.g., 'CLOSED', 'IN_PROGRESS', etc.)
        whereConditions.push({ status: params.status });
      }
    }

    if (params.minValue !== undefined || params.maxValue !== undefined) {
      const valueFilter: any = {};
      if (params.minValue !== undefined) {
        valueFilter.gte = params.minValue;
      }
      if (params.maxValue !== undefined) {
        valueFilter.lte = params.maxValue;
      }
      whereConditions.push({ loaValue: valueFilter });
    }

    if (params.hasEMD !== undefined) {
      whereConditions.push({ hasEmd: params.hasEMD });
    }

    if (params.hasSecurity !== undefined) {
      whereConditions.push({ hasSecurityDeposit: params.hasSecurity });
    }

    if (params.hasPerformanceGuarantee !== undefined) {
      whereConditions.push({ hasPerformanceGuarantee: params.hasPerformanceGuarantee });
    }

    if (params.searchTerm) {
      whereConditions.push({
        OR: [
          { loaNumber: { contains: params.searchTerm, mode: 'insensitive' } },
          { workDescription: { contains: params.searchTerm, mode: 'insensitive' } },
          { tags: { has: params.searchTerm } },
          { site: {
            OR: [
              { name: { contains: params.searchTerm, mode: 'insensitive' } },
              { code: { contains: params.searchTerm, mode: 'insensitive' } }
            ]
          }}
        ]
      });
    }

    return this.prisma.lOA.count({
      where: whereConditions.length > 0 ? { AND: whereConditions } : {}
    });
  }

  async createAmendment(data: {
    amendmentNumber: string;
    documentUrl: string;
    loaId: string;
    tags: string[];
  }): Promise<Amendment> {
    const prismaAmendment = await this.prisma.amendment.create({
      data,
      include: {
        loa: {
          include: {
            amendments: true,
            purchaseOrders: true,
            site: {
          include: {
            zone: true
          }
        }
          }
        }
      }
    });

    return this.mapPrismaAmendmentToAmendment(prismaAmendment);
  }

  async updateAmendment(id: string, data: Partial<Omit<Amendment, 'id' | 'loa'>>): Promise<Amendment> {
    const updateData: Prisma.AmendmentUpdateInput = {
      amendmentNumber: data.amendmentNumber,
      documentUrl: data.documentUrl,
      tags: data.tags ? { set: data.tags } : undefined
    };

    const prismaAmendment = await this.prisma.amendment.update({
      where: { id },
      data: updateData,
      include: {
        loa: {
          include: {
            amendments: true,
            purchaseOrders: true,
            site: {
          include: {
            zone: true
          }
        }
          }
        }
      }
    });

    return this.mapPrismaAmendmentToAmendment(prismaAmendment);
  }

  async deleteAmendment(id: string): Promise<Amendment> {
    const prismaAmendment = await this.prisma.amendment.delete({
      where: { id },
      include: {
        loa: {
          include: {
            amendments: true,
            purchaseOrders: true,
            site: {
          include: {
            zone: true
          }
        }
          }
        }
      }
    });

    return this.mapPrismaAmendmentToAmendment(prismaAmendment);
  }

  async findAmendmentById(id: string): Promise<Amendment | null> {
    const prismaAmendment = await this.prisma.amendment.findUnique({
      where: { id },
      include: {
        loa: {
          include: {
            amendments: true,
            purchaseOrders: true,
            site: {
          include: {
            zone: true
          }
        }
          }
        }
      }
    });

    return prismaAmendment ? this.mapPrismaAmendmentToAmendment(prismaAmendment) : null;
  }

  /**
   * Create an invoice record for an LOA
   */
  async createInvoice(data: {
    loaId: string;
    invoiceNumber?: string;
    invoiceAmount?: number;
    billLinks?: string;
    invoicePdfUrl?: string;
    remarks?: string;
    status?: 'REGISTERED' | 'RETURNED' | 'PAYMENT_MADE';
  }): Promise<any> {
    try {
      const invoice = await this.prisma.invoice.create({
        data: {
          loaId: data.loaId,
          invoiceNumber: data.invoiceNumber,
          invoiceAmount: data.invoiceAmount,
          billLinks: data.billLinks,
          invoicePdfUrl: data.invoicePdfUrl,
          remarks: data.remarks,
          status: data.status || 'REGISTERED',
        }
      });
      return invoice;
    } catch (error) {
      console.error('PrismaLoaRepository createInvoice error:', error);
      throw error;
    }
  }

  /**
   * Find invoice by LOA ID
   */
  async findInvoiceByLoaId(loaId: string): Promise<any | null> {
    try {
      const invoice = await this.prisma.invoice.findFirst({
        where: { loaId }
      });
      return invoice;
    } catch (error) {
      console.error('PrismaLoaRepository findInvoiceByLoaId error:', error);
      throw error;
    }
  }

  /**
   * Update an existing invoice record
   */
  async updateInvoice(id: string, data: {
    invoiceNumber?: string;
    invoiceAmount?: number;
    billLinks?: string;
    invoicePdfUrl?: string;
    remarks?: string;
    status?: 'REGISTERED' | 'RETURNED' | 'PAYMENT_MADE';
  }): Promise<any> {
    try {
      const invoice = await this.prisma.invoice.update({
        where: { id },
        data: {
          invoiceNumber: data.invoiceNumber,
          invoiceAmount: data.invoiceAmount,
          billLinks: data.billLinks,
          invoicePdfUrl: data.invoicePdfUrl,
          remarks: data.remarks,
          status: data.status,
        }
      });
      return invoice;
    } catch (error) {
      console.error('PrismaLoaRepository updateInvoice error:', error);
      throw error;
    }
  }
}