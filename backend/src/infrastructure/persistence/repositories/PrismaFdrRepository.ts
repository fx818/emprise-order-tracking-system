// infrastructure/persistence/repositories/PrismaFdrRepository.ts
import { PrismaClient, FDR, FDRStatus, FDRCategory } from '@prisma/client';

export class PrismaFdrRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new FDR record
   */
  async create(data: {
    category?: FDRCategory;
    bankName: string;
    accountNo?: string;
    fdrNumber?: string;
    accountName?: string;
    depositAmount: number;
    dateOfDeposit: Date;
    maturityValue?: number;
    maturityDate?: Date;
    contractNo?: string;
    contractDetails?: string;
    poc?: string;
    location?: string;
    documentUrl?: string;
    extractedData?: any;
    status?: FDRStatus;
    offerId?: string;
    tags?: string[];
  }): Promise<FDR> {
    return this.prisma.fDR.create({
      data: {
        category: data.category || 'FD',
        bankName: data.bankName || 'IDBI',
        accountNo: data.accountNo,
        fdrNumber: data.fdrNumber,
        accountName: data.accountName,
        depositAmount: data.depositAmount,
        dateOfDeposit: data.dateOfDeposit,
        maturityValue: data.maturityValue,
        maturityDate: data.maturityDate,
        contractNo: data.contractNo,
        contractDetails: data.contractDetails,
        poc: data.poc,
        location: data.location,
        documentUrl: data.documentUrl,
        extractedData: data.extractedData,
        status: data.status || 'RUNNING',
        // Only set foreign keys if they have valid values (not empty strings)
        ...(data.offerId && data.offerId.trim() !== '' ? { offerId: data.offerId } : {}),
        tags: data.tags || [],
      },
      include: {
        offer: {
          select: {
            id: true,
            offerId: true,
            subject: true,
          },
        },
      },
    });
  }

  /**
   * Find FDR by ID
   */
  async findById(id: string): Promise<FDR | null> {
    return this.prisma.fDR.findUnique({
      where: { id },
      include: {
        offer: {
          select: {
            id: true,
            offerId: true,
            subject: true,
          },
        },
      },
    });
  }

  /**
   * Find all FDRs with optional filtering and pagination
   */
  async findAll(params?: {
    searchTerm?: string;
    category?: FDRCategory;
    status?: FDRStatus;
    offerId?: string;
    skip?: number;
    take?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<FDR[]> {
    const where: any = {};

    if (params?.category) {
      where.category = params.category;
    }

    if (params?.status) {
      where.status = params.status;
    }

    if (params?.offerId) {
      where.offerId = params.offerId;
    }

    if (params?.searchTerm) {
      where.OR = [
        { bankName: { contains: params.searchTerm, mode: 'insensitive' } },
        { accountName: { contains: params.searchTerm, mode: 'insensitive' } },
        { fdrNumber: { contains: params.searchTerm, mode: 'insensitive' } },
        { location: { contains: params.searchTerm, mode: 'insensitive' } },
        { poc: { contains: params.searchTerm, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (params?.sortBy) {
      orderBy[params.sortBy] = params.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    return this.prisma.fDR.findMany({
      where,
      skip: params?.skip,
      take: params?.take,
      orderBy,
      include: {
        offer: {
          select: {
            id: true,
            offerId: true,
            subject: true,
          },
        },
        generalLoaLinks: {
          include: {
            loa: {
              select: {
                id: true,
                loaNumber: true,
              },
            },
          },
        },
        loaForSD: {
          select: {
            id: true,
            loaNumber: true,
          },
        },
        loaForPG: {
          select: {
            id: true,
            loaNumber: true,
          },
        },
      },
    });
  }

  /**
   * Count FDRs with optional filtering
   */
  async count(params?: {
    searchTerm?: string;
    category?: FDRCategory;
    status?: FDRStatus;
    offerId?: string;
  }): Promise<number> {
    const where: any = {};

    if (params?.category) {
      where.category = params.category;
    }

    if (params?.status) {
      where.status = params.status;
    }

    if (params?.offerId) {
      where.offerId = params.offerId;
    }

    if (params?.searchTerm) {
      where.OR = [
        { bankName: { contains: params.searchTerm, mode: 'insensitive' } },
        { accountName: { contains: params.searchTerm, mode: 'insensitive' } },
        { fdrNumber: { contains: params.searchTerm, mode: 'insensitive' } },
        { location: { contains: params.searchTerm, mode: 'insensitive' } },
        { poc: { contains: params.searchTerm, mode: 'insensitive' } },
      ];
    }

    return this.prisma.fDR.count({ where });
  }

  /**
   * Update an FDR
   */
  async update(id: string, data: Partial<{
    category: FDRCategory;
    bankName: string;
    accountNo: string | null;
    fdrNumber: string | null;
    accountName: string | null;
    depositAmount: number;
    dateOfDeposit: Date;
    maturityValue: number | null;
    maturityDate: Date | null;
    contractNo: string | null;
    contractDetails: string | null;
    poc: string | null;
    location: string | null;
    documentUrl: string;
    extractedData: any;
    status: FDRStatus;
    offerId: string | null;
    tags: string[];
  }>): Promise<FDR> {
    return this.prisma.fDR.update({
      where: { id },
      data,
      include: {
        offer: {
          select: {
            id: true,
            offerId: true,
            subject: true,
          },
        },
      },
    });
  }

  /**
   * Delete an FDR
   */
  async delete(id: string): Promise<void> {
    await this.prisma.fDR.delete({
      where: { id },
    });
  }

  /**
   * Update FDR status
   */
  async updateStatus(id: string, status: FDRStatus): Promise<FDR> {
    return this.prisma.fDR.update({
      where: { id },
      data: { status },
      include: {
        offer: {
          select: {
            id: true,
            offerId: true,
            subject: true,
          },
        },
      },
    });
  }

  /**
   * Find FDRs by Offer ID
   */
  async findByOfferId(offerId: string): Promise<FDR[]> {
    return this.prisma.fDR.findMany({
      where: { offerId },
      include: {
        offer: {
          select: {
            id: true,
            offerId: true,
            subject: true,
          },
        },
      },
    });
  }


  /**
   * Find expiring FDRs (within specified days)
   */
  async findExpiring(days: number = 30): Promise<FDR[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return this.prisma.fDR.findMany({
      where: {
        status: 'RUNNING',
        maturityDate: {
          gte: today,
          lte: futureDate,
        },
      },
      orderBy: {
        maturityDate: 'asc',
      },
      include: {
        offer: {
          select: {
            id: true,
            offerId: true,
            subject: true,
          },
        },
      },
    });
  }

  /**
   * Find expired FDRs
   */
  async findExpired(): Promise<FDR[]> {
    const today = new Date();

    return this.prisma.fDR.findMany({
      where: {
        status: 'RUNNING',
        maturityDate: {
          lt: today,
        },
      },
      orderBy: {
        maturityDate: 'desc',
      },
      include: {
        offer: {
          select: {
            id: true,
            offerId: true,
            subject: true,
          },
        },
      },
    });
  }

  /**
   * Auto-update expired FDR statuses
   */
  async updateExpiredStatuses(): Promise<number> {
    const today = new Date();

    const result = await this.prisma.fDR.updateMany({
      where: {
        status: 'RUNNING',
        maturityDate: {
          lt: today,
        },
      },
      data: {
        status: 'COMPLETED',
      },
    });

    return result.count;
  }
}
