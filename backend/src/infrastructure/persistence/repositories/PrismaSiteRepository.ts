// infrastructure/persistence/repositories/PrismaSiteRepository.ts
import { PrismaClient } from '@prisma/client';
import { Site } from '../../../domain/entities/Site';
import { CreateSiteDto, UpdateSiteDto } from '../../../application/dtos/site/SiteDto';
import { SiteStatus } from '../../../domain/entities/constants';
import { POStatus } from '@prisma/client';
export class PrismaSiteRepository {
  constructor(private prisma: PrismaClient) {}

  
  private toDomainEntity(prismaSite: any): Site {
    return {
      id: prismaSite.id,
      name: prismaSite.name,
      code: prismaSite.code,
      location: prismaSite.location,
      zoneId: prismaSite.zoneId,
      zone: prismaSite.zone ? {
        id: prismaSite.zone.id,
        name: prismaSite.zone.name,
        headquarters: prismaSite.zone.headquarters,
      } : undefined,
      address: prismaSite.address,
      contactPerson: prismaSite.contactPerson,
      contactPhone: prismaSite.contactPhone,
      contactEmail: prismaSite.contactEmail,
      status: prismaSite.status,
      loas: prismaSite.loas?.map((loa: any) => ({
        id: loa.id,
        loaNumber: loa.loaNumber,
        loaValue: loa.loaValue,
        workDescription: loa.workDescription,
        deliveryPeriod: loa.deliveryPeriod,
        status: this.getLoaStatus(loa),
        createdAt: loa.createdAt
      })) || [],
      purchaseOrders: prismaSite.purchaseOrders?.map((po: any) => ({
        id: po.id,
        poNumber: po.poNumber,
        status: po.status,
        totalAmount: po.totalAmount,
        vendorName: po.vendor.name,
        createdAt: po.createdAt
      })) || [],
      stats: {
        totalLoas: prismaSite._count?.loas || 0,
        totalPurchaseOrders: prismaSite._count?.purchaseOrders || 0,
        totalValue: this.calculateTotalValue(prismaSite.purchaseOrders)
      },
      createdAt: prismaSite.createdAt,
      updatedAt: prismaSite.updatedAt
    };
  }

  private getLoaStatus(loa: any): string {
    // Logic to determine LOA status based on dates and POs
    const today = new Date();
    const endDate = new Date(loa.deliveryPeriod.end);
    
    if (endDate < today) return 'EXPIRED';
    if (loa.purchaseOrders?.length > 0) return 'ACTIVE';
    return 'PENDING';
  }

  private calculateTotalValue(purchaseOrders: any[]): number {
    return purchaseOrders?.reduce((sum, po) => sum + (po.totalAmount || 0), 0) || 0;
  }

  async create(data: CreateSiteDto): Promise<Site> {
    const prismaSite = await this.prisma.site.create({
      data: {
        ...data,
        status: SiteStatus.ACTIVE,
        code: data.code || "",
      }
    });

    return this.toDomainEntity(prismaSite);
  }

  async update(id: string, data: UpdateSiteDto): Promise<Site> {
    const prismaSite = await this.prisma.site.update({
      where: { id },
      data: {
        ...data,
        contactPerson: data.contactPerson || "",
        contactPhone: data.contactPhone || "",
        contactEmail: data.contactEmail || "",
        status: data.status || SiteStatus.ACTIVE,
      }
    });

    return this.toDomainEntity(prismaSite);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.site.delete({
      where: { id }
    });
  }

  async findById(id: string): Promise<Site | null> {
    const prismaSite = await this.prisma.site.findUnique({
      where: { id },
      include: {
        zone: true,  // Include customer/zone data
        loas: {
          include: {
            purchaseOrders: true
          }
        },
        purchaseOrders: {
          include: {
            vendor: true
          }
        },
        _count: {
          select: {
            loas: true,
            purchaseOrders: true
          }
        }
      }
    });

    return prismaSite ? this.toDomainEntity(prismaSite) : null;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    status?: string;
    zoneId?: string;
    searchTerm?: string;
  }): Promise<{ sites: Site[]; total: number }> {
    const { skip, take, status, zoneId, searchTerm } = params;

    const [sites, total] = await this.prisma.$transaction([
      this.prisma.site.findMany({
        skip,
        take,
        where: {
          AND: [
            status ? { status: status as SiteStatus } : {},
            zoneId ? { zoneId } : {},
            searchTerm ? {
              OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { code: { contains: searchTerm, mode: 'insensitive' } },
                { location: { contains: searchTerm, mode: 'insensitive' } },
              ]
            } : {}
          ]
        },
        include: {
          zone: true,  // Include customer/zone data
          loas: {
            include: {
              purchaseOrders: true
            }
          },
          purchaseOrders: {
            include: {
              vendor: true
            }
          },
          _count: {
            select: {
              loas: true,
              purchaseOrders: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      this.prisma.site.count({
        where: {
          AND: [
            status ? { status: status as SiteStatus } : {},
            zoneId ? { zoneId } : {},
            searchTerm ? {
              OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { code: { contains: searchTerm, mode: 'insensitive' } },
                { location: { contains: searchTerm, mode: 'insensitive' } },
              ]
            } : {}
          ]
        }
      })
    ]);

    return {
      sites: sites.map(site => this.toDomainEntity(site)),
      total
    };
  
  }

  async count(params: {
    status?: string;
    zoneId?: string;
    searchTerm?: string;
  }): Promise<number> {
    const { status, zoneId, searchTerm } = params;

    return this.prisma.site.count({
      where: {
        AND: [
          status ? { status: status as SiteStatus } : {},
          zoneId ? { zoneId } : {},
          searchTerm ? {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { location: { contains: searchTerm, mode: 'insensitive' } },
            ]
          } : {}
        ]
      }
    });
  }

  async findLatestSiteCode(zoneId: string): Promise<string | null> {
    const latestSite = await this.prisma.site.findFirst({
      where: { zoneId },
      orderBy: { code: 'desc' },
      select: { code: true }
    });
    
    return latestSite?.code || null;
  }

  async findByCode(code: string): Promise<Site | null> {
    const prismaSite = await this.prisma.site.findUnique({
      where: { code }
    });

    return prismaSite ? this.toDomainEntity(prismaSite) : null;
  }

  async getSiteStats(id: string): Promise<{
    totalLoas: number;
    totalPurchaseOrders: number;
    totalValue: number;
    pendingPOs: number;
  }> {
    const stats = await this.prisma.site.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            loas: true,
            purchaseOrders: true
          }
        },
        loas: {
          include: {
            purchaseOrders: true
          }
        },
        purchaseOrders: {
          select: {
            status: true,
            totalAmount: true
          }
        }
      }
    });

    if (!stats) throw new Error('Site not found');

    const pendingPOs = stats.purchaseOrders.filter(po => 
      po.status === 'PENDING_APPROVAL'
    ).length;

    return {
      totalLoas: stats._count.loas,
      totalPurchaseOrders: stats._count.purchaseOrders,
      totalValue: this.calculateTotalValue(stats.purchaseOrders),
      pendingPOs
    };
  }

  async getLoasForSite(siteId: string, params: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    return this.prisma.lOA.findMany({
      where: {
        siteId,
        ...(params.startDate && params.endDate ? {
          deliveryPeriod: {
            path: ['$.end'],
            gte: params.startDate,
            lte: params.endDate
          }
        } : {})
      },
      include: {
        purchaseOrders: {
          include: {
            vendor: true
          }
        }
      }
    });
  }

  async getPurchaseOrdersForSite(siteId: string, params: {
    status?: POStatus;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    return this.prisma.purchaseOrder.findMany({
      where: {
        siteId,
        ...(params.status ? { status: params.status } : {}),
        ...(params.startDate && params.endDate ? {
          createdAt: {
            gte: params.startDate,
            lte: params.endDate
          }
        } : {})
      },
      include: {
        vendor: true,
        loa: true
      }
    });
  }

  async getSiteCountsByZone(): Promise<Record<string, number>> {
    const results = await this.prisma.site.groupBy({
      by: ['zoneId'],
      _count: {
        id: true
      }
    });

    // Convert array to object with zoneId as key and count as value
    const siteCounts = results.reduce((acc, result) => {
      acc[result.zoneId] = result._count.id;
      return acc;
    }, {} as Record<string, number>);

    return siteCounts;
  }
}