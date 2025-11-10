import { PrismaClient } from '@prisma/client';
import { Bill, BillStatus } from '../../../domain/entities/Bill';

export class PrismaBillRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new bill for an LOA
   */
  async create(data: {
    loaId: string;
    invoiceNumber?: string;
    invoiceAmount?: number;
    billLinks?: string;
    remarks?: string;
    status?: BillStatus;
    invoicePdfUrl?: string;
  }): Promise<any> {
    try {
      const bill = await this.prisma.invoice.create({
        data: {
          loaId: data.loaId,
          invoiceNumber: data.invoiceNumber,
          invoiceAmount: data.invoiceAmount,
          billLinks: data.billLinks,
          remarks: data.remarks,
          status: data.status || 'REGISTERED',
          invoicePdfUrl: data.invoicePdfUrl,
        },
      });
      return bill;
    } catch (error) {
      console.error('PrismaBillRepository create error:', error);
      throw error;
    }
  }

  /**
   * Find all bills for a specific LOA
   */
  async findByLoaId(loaId: string): Promise<any[]> {
    try {
      const bills = await this.prisma.invoice.findMany({
        where: { loaId },
        orderBy: { createdAt: 'desc' },
      });
      return bills;
    } catch (error) {
      console.error('PrismaBillRepository findByLoaId error:', error);
      throw error;
    }
  }

  /**
   * Find a single bill by ID
   */
  async findById(id: string): Promise<any | null> {
    try {
      const bill = await this.prisma.invoice.findUnique({
        where: { id },
      });
      return bill;
    } catch (error) {
      console.error('PrismaBillRepository findById error:', error);
      throw error;
    }
  }

  /**
   * Update an existing bill
   */
  async update(
    id: string,
    data: {
      invoiceNumber?: string;
      invoiceAmount?: number;
      billLinks?: string;
      remarks?: string;
      status?: BillStatus;
      invoicePdfUrl?: string;
    }
  ): Promise<any> {
    try {
      const bill = await this.prisma.invoice.update({
        where: { id },
        data: {
          invoiceNumber: data.invoiceNumber,
          invoiceAmount: data.invoiceAmount,
          billLinks: data.billLinks,
          remarks: data.remarks,
          status: data.status,
          invoicePdfUrl: data.invoicePdfUrl,
        },
      });
      return bill;
    } catch (error) {
      console.error('PrismaBillRepository update error:', error);
      throw error;
    }
  }

  /**
   * Delete a bill
   */
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.invoice.delete({
        where: { id },
      });
    } catch (error) {
      console.error('PrismaBillRepository delete error:', error);
      throw error;
    }
  }

  /**
   * Check if a bill exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const count = await this.prisma.invoice.count({
        where: { id },
      });
      return count > 0;
    } catch (error) {
      console.error('PrismaBillRepository exists error:', error);
      throw error;
    }
  }
}
