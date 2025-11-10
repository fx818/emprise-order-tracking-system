// infrastructure/persistence/repositories/PrismaPocRepository.ts
import { PrismaClient } from '@prisma/client';
import { POC } from '../../../domain/entities/POC';

export interface CreatePocDto {
  name: string;
}

export interface UpdatePocDto {
  name?: string;
}

export class PrismaPocRepository {
  constructor(private prisma: PrismaClient) {}

  private toDomainEntity(prismaPoc: any): POC {
    return {
      id: prismaPoc.id,
      name: prismaPoc.name,
      loas: prismaPoc.loas,
      createdAt: prismaPoc.createdAt,
      updatedAt: prismaPoc.updatedAt
    };
  }

  async create(data: CreatePocDto): Promise<POC> {
    const prismaPoc = await this.prisma.pOC.create({
      data: {
        name: data.name
      }
    });

    return this.toDomainEntity(prismaPoc);
  }

  async update(id: string, data: UpdatePocDto): Promise<POC> {
    const prismaPoc = await this.prisma.pOC.update({
      where: { id },
      data: {
        name: data.name
      }
    });

    return this.toDomainEntity(prismaPoc);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.pOC.delete({
      where: { id }
    });
  }

  async findById(id: string): Promise<POC | null> {
    const prismaPoc = await this.prisma.pOC.findUnique({
      where: { id },
      include: {
        loas: true
      }
    });

    return prismaPoc ? this.toDomainEntity(prismaPoc) : null;
  }

  async findByName(name: string): Promise<POC | null> {
    const prismaPoc = await this.prisma.pOC.findUnique({
      where: { name }
    });

    return prismaPoc ? this.toDomainEntity(prismaPoc) : null;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    searchTerm?: string;
  }): Promise<{ pocs: POC[]; total: number }> {
    const { skip, take, searchTerm } = params;

    const [pocs, total] = await this.prisma.$transaction([
      this.prisma.pOC.findMany({
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
      this.prisma.pOC.count({
        where: searchTerm ? {
          name: { contains: searchTerm, mode: 'insensitive' }
        } : {}
      })
    ]);

    return {
      pocs: pocs.map(poc => this.toDomainEntity(poc)),
      total
    };
  }
}
