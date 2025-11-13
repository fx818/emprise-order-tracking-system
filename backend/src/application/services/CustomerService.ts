// application/services/CustomerService.ts
import { PrismaClient, Prisma } from '@prisma/client';
import { Result, ResultUtils } from '../../shared/types/common.types';
import { AppError } from '../../shared/errors/AppError';

export type Customer = {
  id: string;
  name: string;
  headquarters: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CreateCustomerDto = {
  id: string;
  name: string;
  headquarters: string;
};

export class CustomerService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ------------------- Get All Customers -------------------
  async getAllCustomers(): Promise<Result<Customer[]>> {
    try {
      const customers = await this.prisma.customer.findMany({
        orderBy: { name: 'asc' },
      });
      return ResultUtils.ok(customers);
    } catch (error: any) {
      this.handlePrismaError(error, 'getAllCustomers');
      throw new AppError('Failed to get customers', 500, undefined, undefined, error);
    }
  }

  // ------------------- Get Customer By ID -------------------
  async getCustomerById(id: string): Promise<Result<Customer | null>> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id },
      });

      if (!customer) {
        return ResultUtils.fail('Customer not found');
      }

      return ResultUtils.ok(customer);
    } catch (error: any) {
      this.handlePrismaError(error, 'getCustomerById');
      throw new AppError('Failed to get customer', 500, undefined, undefined, error);
    }
  }

  // ------------------- Add Customer -------------------
  async addCustomer(dto: CreateCustomerDto): Promise<Result<Customer>> {
    try {
      const existingCustomer = await this.prisma.customer.findUnique({
        where: { id: dto.id },
      });

      if (existingCustomer) {
        return ResultUtils.fail('Customer with this ID already exists');
      }

      const newCustomer = await this.prisma.customer.create({
        data: {
          id: dto.id,
          name: dto.name,
          headquarters: dto.headquarters,
        },
      });

      return ResultUtils.ok(newCustomer);
    } catch (error: any) {
      this.handlePrismaError(error, 'addCustomer');
      throw new AppError('Failed to add customer', 500, undefined, undefined, error);
    }
  }

  // ------------------- Update Customer -------------------
  async updateCustomer(id: string, dto: Partial<CreateCustomerDto>): Promise<Result<Customer>> {
    try {
      const existingCustomer = await this.prisma.customer.findUnique({
        where: { id },
      });

      if (!existingCustomer) {
        return ResultUtils.fail('Customer not found');
      }

      const updatedCustomer = await this.prisma.customer.update({
        where: { id },
        data: {
          name: dto.name !== undefined ? dto.name : undefined,
          headquarters: dto.headquarters !== undefined ? dto.headquarters : undefined,
        },
      });

      return ResultUtils.ok(updatedCustomer);
    } catch (error: any) {
      this.handlePrismaError(error, 'updateCustomer');
      throw new AppError('Failed to update customer', 500, undefined, undefined, error);
    }
  }

  // ------------------- Delete Customer -------------------
  async deleteCustomer(id: string): Promise<Result<void>> {
    try {
      const existingCustomer = await this.prisma.customer.findUnique({
        where: { id },
      });

      if (!existingCustomer) {
        return ResultUtils.fail('Customer not found');
      }

      const sitesWithCustomer = await this.prisma.site.count({
        where: { zoneId: id },
      });

      if (sitesWithCustomer > 0) {
        return ResultUtils.fail('Cannot delete customer that is used by sites');
      }

      await this.prisma.customer.delete({
        where: { id },
      });

      return ResultUtils.ok(undefined);
    } catch (error: any) {
      this.handlePrismaError(error, 'deleteCustomer');
      throw new AppError('Failed to delete customer', 500, undefined, undefined, error);
    }
  }

  // ------------------- Centralized Prisma Error Handler -------------------
  /**
   * Handles all Prisma-related errors and logs them meaningfully.
   * Does NOT throw — use this inside a catch and then throw your AppError.
   */
  private handlePrismaError(error: any, context: string): void {
    console.error(`[${context}] Prisma Error:`, error);

    // Prisma known request errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002': // Unique constraint violation
          console.warn(`[${context}] Duplicate entry detected.`);
          throw new AppError(
            'Duplicate entry: a record with this identifier already exists.',
            409,
            error.code,
            undefined,
            error
          );
        case 'P2025': // Record not found
          throw new AppError(
            'Record not found in the database.',
            404,
            error.code,
            undefined,
            error
          );
        case 'P2003': // Foreign key constraint
          throw new AppError(
            'Cannot delete record because it is referenced elsewhere.',
            400,
            error.code,
            undefined,
            error
          );
        default:
          throw new AppError(
            `Database operation failed (${error.code})`,
            500,
            error.code,
            undefined,
            error
          );
      }
    }

    // Prisma validation errors
    if (error instanceof Prisma.PrismaClientValidationError) {
      console.warn(`[${context}] Validation error: ${error.message}`);
      throw new AppError(
        'Invalid data provided for database operation.',
        400,
        undefined,
        undefined,
        error
      );
    }

    // Prisma initialization / connection errors
    if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error(`[${context}] Database connection error.`);
      throw new AppError(
        'Database connection failed. Please check your connection.',
        503,
        undefined,
        undefined,
        error
      );
    }

    // Prisma transaction errors or unknowns
    if (error instanceof Prisma.PrismaClientRustPanicError) {
      console.error(`[${context}] Prisma internal panic.`);
      throw new AppError(
        'Database internal error (Rust panic).',
        500,
        undefined,
        undefined,
        error
      );
    }

    // Any other unexpected runtime errors
    if (error instanceof Error) {
      throw new AppError(`Unexpected error: ${error.message}`, 500, undefined, undefined, error);
    }

    throw new AppError('An unknown error occurred during the operation.', 500);
  }
}
