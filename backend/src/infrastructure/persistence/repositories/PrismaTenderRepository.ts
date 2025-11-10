import { PrismaClient, TenderStatus } from '@prisma/client';
import { Tender } from '../../../domain/entities/Tender';

export class PrismaTenderRepository {
  constructor(private prisma: PrismaClient) {}

  private toDomainEntity(prismaTender: any): Tender {
    return {
      id: prismaTender.id,
      tenderNumber: prismaTender.tenderNumber,
      dueDate: prismaTender.dueDate,
      description: prismaTender.description,
      hasEMD: prismaTender.hasEMD,
      emdAmount: prismaTender.emdAmount,
      emdBankName: prismaTender.emdBankName,
      emdSubmissionDate: prismaTender.emdSubmissionDate,
      emdMaturityDate: prismaTender.emdMaturityDate,
      emdDocumentUrl: prismaTender.emdDocumentUrl,
      emdReturnStatus: prismaTender.emdReturnStatus,
      emdReturnDate: prismaTender.emdReturnDate,
      emdReturnAmount: prismaTender.emdReturnAmount,
      status: prismaTender.status,
      documentUrl: prismaTender.documentUrl,
      nitDocumentUrl: prismaTender.nitDocumentUrl,
      tags: prismaTender.tags || [],
      siteId: prismaTender.siteId,
      site: prismaTender.site ? {
        id: prismaTender.site.id,
        name: prismaTender.site.name,
        code: prismaTender.site.code,
        zone: prismaTender.site.zone ? {
          id: prismaTender.site.zone.id,
          name: prismaTender.site.zone.name
        } : undefined
      } : undefined,
      createdAt: prismaTender.createdAt,
      updatedAt: prismaTender.updatedAt
    };
  }

  async create(tender: Omit<Tender, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tender> {
    // Parse tags if they are a string
    let tags = tender.tags || [];
    if (typeof tags === 'string') {
      try {
        tags = JSON.parse(tags);
      } catch (error) {
        console.error('Error parsing tags string:', error);
        tags = [];
      }
    }

    const created = await this.prisma.tender.create({
      data: {
        tenderNumber: tender.tenderNumber,
        dueDate: tender.dueDate,
        description: tender.description,
        hasEMD: tender.hasEMD,
        emdAmount: tender.emdAmount,
        emdBankName: tender.emdBankName || null,
        emdSubmissionDate: tender.emdSubmissionDate || null,
        emdMaturityDate: tender.emdMaturityDate || null,
        emdDocumentUrl: tender.emdDocumentUrl || null,
        emdReturnStatus: tender.emdReturnStatus || null,
        status: tender.status,
        documentUrl: tender.documentUrl,
        nitDocumentUrl: tender.nitDocumentUrl || null,
        tags: tags,
        siteId: tender.siteId || null
      },
      include: {
        site: {
          include: {
            zone: true
          }
        }
      }
    });

    return this.toDomainEntity(created);
  }

  async update(id: string, tender: Partial<Tender>): Promise<Tender> {
    // Parse tags if they are a string
    let tags = tender.tags;
    if (typeof tags === 'string') {
      try {
        tags = JSON.parse(tags);
      } catch (error) {
        console.error('Error parsing tags string:', error);
        tags = [];
      }
    }

    // Build update data object with only defined fields
    const updateData: any = {};

    if (tender.tenderNumber !== undefined) updateData.tenderNumber = tender.tenderNumber;
    if (tender.dueDate !== undefined) updateData.dueDate = tender.dueDate;
    if (tender.description !== undefined) updateData.description = tender.description;
    if (tender.hasEMD !== undefined) updateData.hasEMD = tender.hasEMD;
    if (tender.emdAmount !== undefined) updateData.emdAmount = tender.emdAmount;
    if (tender.emdBankName !== undefined) updateData.emdBankName = tender.emdBankName;
    if (tender.emdSubmissionDate !== undefined) updateData.emdSubmissionDate = tender.emdSubmissionDate;
    if (tender.emdMaturityDate !== undefined) updateData.emdMaturityDate = tender.emdMaturityDate;
    if (tender.emdDocumentUrl !== undefined) updateData.emdDocumentUrl = tender.emdDocumentUrl;
    if (tender.emdReturnStatus !== undefined) updateData.emdReturnStatus = tender.emdReturnStatus;
    if (tender.emdReturnDate !== undefined) updateData.emdReturnDate = tender.emdReturnDate;
    if (tender.emdReturnAmount !== undefined) updateData.emdReturnAmount = tender.emdReturnAmount;
    if (tender.status !== undefined) updateData.status = tender.status;
    if (tender.documentUrl !== undefined) updateData.documentUrl = tender.documentUrl;
    if (tender.nitDocumentUrl !== undefined) updateData.nitDocumentUrl = tender.nitDocumentUrl;
    if (tender.siteId !== undefined) updateData.siteId = tender.siteId;
    if (tags !== undefined) updateData.tags = tags;

    const updated = await this.prisma.tender.update({
      where: { id },
      data: updateData,
      include: {
        site: {
          include: {
            zone: true
          }
        }
      }
    });

    return this.toDomainEntity(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.tender.delete({
      where: { id }
    });
  }

  async findById(id: string): Promise<Tender | null> {
    const tender = await this.prisma.tender.findUnique({
      where: { id },
      include: {
        site: {
          include: {
            zone: true
          }
        }
      }
    });

    return tender ? this.toDomainEntity(tender) : null;
  }

  async findByTenderNumber(tenderNumber: string): Promise<Tender | null> {
    const tender = await this.prisma.tender.findUnique({
      where: { tenderNumber },
      include: {
        site: {
          include: {
            zone: true
          }
        }
      }
    });

    return tender ? this.toDomainEntity(tender) : null;
  }

  async findAll(options?: {
    status?: TenderStatus;
    searchTerm?: string;
  }): Promise<{ data: Tender[]; total: number }> {
    try {
      const { status, searchTerm } = options || {};

      const whereClause: any = {};

      if (status) {
        whereClause.status = status;
      }

      if (searchTerm) {
        whereClause.OR = [
          { tenderNumber: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } }
        ];
      }

      const [tenders, total] = await Promise.all([
        this.prisma.tender.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.tender.count({ where: whereClause })
      ]);

      // Handle case of empty array
      if (!tenders || !Array.isArray(tenders)) {
        return { data: [], total: 0 };
      }

      return {
        data: tenders.map((tender) => this.toDomainEntity(tender)),
        total
      };
    } catch (error) {
      console.error('Error in repository findAll:', error);
      // Return empty array to avoid errors
      return { data: [], total: 0 };
    }
  }
} 