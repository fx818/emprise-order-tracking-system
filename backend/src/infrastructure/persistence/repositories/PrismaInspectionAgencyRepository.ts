// infrastructure/persistence/repositories/PrismaInspectionAgencyRepository.ts
import { PrismaClient } from '@prisma/client';
import { InspectionAgency } from '../../../domain/entities/InspectionAgency';

export interface CreateInspectionAgencyDto {
  name: string;
}

export interface UpdateInspectionAgencyDto {
  name?: string;
}

export class PrismaInspectionAgencyRepository {
  constructor(private prisma: PrismaClient) {}

  private toDomainEntity(prismaInspectionAgency: any): InspectionAgency {
    return {
      id: prismaInspectionAgency.id,
      name: prismaInspectionAgency.name,
      loas: prismaInspectionAgency.loas,
      createdAt: prismaInspectionAgency.createdAt,
      updatedAt: prismaInspectionAgency.updatedAt
    };
  }

  async create(data: CreateInspectionAgencyDto): Promise<InspectionAgency> {
    const prismaInspectionAgency = await this.prisma.inspectionAgency.create({
      data: {
        name: data.name
      }
    });

    return this.toDomainEntity(prismaInspectionAgency);
  }

  async update(id: string, data: UpdateInspectionAgencyDto): Promise<InspectionAgency> {
    const prismaInspectionAgency = await this.prisma.inspectionAgency.update({
      where: { id },
      data: {
        name: data.name
      }
    });

    return this.toDomainEntity(prismaInspectionAgency);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.inspectionAgency.delete({
      where: { id }
    });
  }

  async findById(id: string): Promise<InspectionAgency | null> {
    const prismaInspectionAgency = await this.prisma.inspectionAgency.findUnique({
      where: { id },
      include: {
        loas: true
      }
    });

    return prismaInspectionAgency ? this.toDomainEntity(prismaInspectionAgency) : null;
  }

  async findByName(name: string): Promise<InspectionAgency | null> {
    const prismaInspectionAgency = await this.prisma.inspectionAgency.findUnique({
      where: { name }
    });

    return prismaInspectionAgency ? this.toDomainEntity(prismaInspectionAgency) : null;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    searchTerm?: string;
  }): Promise<{ inspectionAgencies: InspectionAgency[]; total: number }> {
    const { skip, take, searchTerm } = params;

    const [inspectionAgencies, total] = await this.prisma.$transaction([
      this.prisma.inspectionAgency.findMany({
        skip,
        take,
        where: searchTerm ? {
          name: { contains: searchTerm, mode: 'insensitive' }
        } : {},
        include: {
          _count: {
            select: {
              loas: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      }),
      this.prisma.inspectionAgency.count({
        where: searchTerm ? {
          name: { contains: searchTerm, mode: 'insensitive' }
        } : {}
      })
    ]);

    return {
      inspectionAgencies: inspectionAgencies.map(ia => this.toDomainEntity(ia)),
      total
    };
  }
}
