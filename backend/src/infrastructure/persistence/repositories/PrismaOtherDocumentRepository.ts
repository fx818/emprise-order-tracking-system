// infrastructure/persistence/repositories/PrismaOtherDocumentRepository.ts
import { PrismaClient, OtherDocument as PrismaOtherDocument } from '@prisma/client';
import { OtherDocument } from '../../../domain/entities/LOA';

export class PrismaOtherDocumentRepository {
  constructor(private prisma: PrismaClient) {}

  private mapPrismaOtherDocumentToOtherDocument(prismaOtherDocument: PrismaOtherDocument): OtherDocument {
    return {
      id: prismaOtherDocument.id,
      title: prismaOtherDocument.title,
      documentUrl: prismaOtherDocument.documentUrl,
      loaId: prismaOtherDocument.loaId,
      createdAt: prismaOtherDocument.createdAt,
      updatedAt: prismaOtherDocument.updatedAt
    };
  }

  async create(data: {
    title: string;
    documentUrl: string;
    loaId: string;
  }): Promise<OtherDocument> {
    const prismaOtherDocument = await this.prisma.otherDocument.create({
      data
    });

    return this.mapPrismaOtherDocumentToOtherDocument(prismaOtherDocument);
  }

  async update(id: string, data: Partial<{
    title: string;
    documentUrl: string;
  }>): Promise<OtherDocument> {
    const prismaOtherDocument = await this.prisma.otherDocument.update({
      where: { id },
      data
    });

    return this.mapPrismaOtherDocumentToOtherDocument(prismaOtherDocument);
  }

  async delete(id: string): Promise<OtherDocument> {
    const prismaOtherDocument = await this.prisma.otherDocument.delete({
      where: { id }
    });

    return this.mapPrismaOtherDocumentToOtherDocument(prismaOtherDocument);
  }

  async findById(id: string): Promise<OtherDocument | null> {
    const prismaOtherDocument = await this.prisma.otherDocument.findUnique({
      where: { id }
    });

    if (!prismaOtherDocument) return null;
    return this.mapPrismaOtherDocumentToOtherDocument(prismaOtherDocument);
  }

  async findByLoaId(loaId: string): Promise<OtherDocument[]> {
    const prismaOtherDocuments = await this.prisma.otherDocument.findMany({
      where: { loaId },
      orderBy: { createdAt: 'desc' }
    });

    return prismaOtherDocuments.map(doc => this.mapPrismaOtherDocumentToOtherDocument(doc));
  }
}
