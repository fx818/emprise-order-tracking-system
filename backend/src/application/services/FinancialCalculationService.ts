import { Bill } from '../../domain/entities/Bill';
import { PrismaBillRepository } from '../../infrastructure/persistence/repositories/PrismaBillRepository';

export interface InvoiceTotals {
  totalBilled: number;
  totalReceived: number;
  totalDeducted: number;
  totalPending: number;
}

export class FinancialCalculationService {
  constructor(private billRepository: PrismaBillRepository) {}

  /**
   * Calculate pending amount for a single invoice
   * Formula: Pending = Invoice Amount - Received - Deducted
   * Note: Can return negative values for overpayment scenarios
   */
  calculateInvoicePending(
    invoiceAmount: number,
    amountReceived: number,
    amountDeducted: number
  ): number {
    return invoiceAmount - amountReceived - amountDeducted;
  }

  /**
   * Validate invoice amounts
   * Ensures: received + deducted <= invoice amount
   */
  validateInvoiceAmounts(
    invoiceAmount: number,
    amountReceived: number,
    amountDeducted: number
  ): { valid: boolean; error?: string } {
    if (amountReceived < 0) {
      return { valid: false, error: 'Amount received cannot be negative' };
    }

    if (amountDeducted < 0) {
      return { valid: false, error: 'Amount deducted cannot be negative' };
    }

    if (invoiceAmount < 0) {
      return { valid: false, error: 'Invoice amount cannot be negative' };
    }

    const total = amountReceived + amountDeducted;
    if (total > invoiceAmount) {
      return {
        valid: false,
        error: `Total of received (${amountReceived}) and deducted (${amountDeducted}) cannot exceed invoice amount (${invoiceAmount})`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate LOA pending split
   * Ensures: recoverable + payment = total pending
   */
  validatePendingSplit(
    totalPending: number,
    recoverablePending: number,
    paymentPending: number
  ): { valid: boolean; error?: string } {
    if (recoverablePending < 0) {
      return { valid: false, error: 'Recoverable pending cannot be negative' };
    }

    if (paymentPending < 0) {
      return { valid: false, error: 'Payment pending cannot be negative' };
    }

    const sum = recoverablePending + paymentPending;
    // Allow small floating point differences
    if (Math.abs(sum - totalPending) > 0.01) {
      return {
        valid: false,
        error: `Recoverable pending (${recoverablePending}) + Payment pending (${paymentPending}) must equal total pending (${totalPending})`,
      };
    }

    return { valid: true };
  }

  /**
   * Aggregate invoice totals for an LOA
   * Returns: total billed, received, deducted, and pending
   */
  async aggregateInvoiceTotals(loaId: string): Promise<InvoiceTotals> {
    const bills = await this.billRepository.findByLoaId(loaId);

    const totals = bills.reduce(
      (acc, bill) => {
        const invoiceAmount = bill.invoiceAmount || 0;
        const amountReceived = bill.amountReceived || 0;
        const amountDeducted = bill.amountDeducted || 0;
        const amountPending = this.calculateInvoicePending(
          invoiceAmount,
          amountReceived,
          amountDeducted
        );

        return {
          totalBilled: acc.totalBilled + invoiceAmount,
          totalReceived: acc.totalReceived + amountReceived,
          totalDeducted: acc.totalDeducted + amountDeducted,
          totalPending: acc.totalPending + amountPending,
        };
      },
      {
        totalBilled: 0,
        totalReceived: 0,
        totalDeducted: 0,
        totalPending: 0,
      }
    );

    return totals;
  }

  /**
   * Calculate percentage split for pending amounts
   */
  calculatePendingPercentages(
    totalPending: number,
    recoverablePending: number,
    paymentPending: number
  ): { recoverablePercentage: number; paymentPercentage: number } {
    if (totalPending === 0) {
      return { recoverablePercentage: 0, paymentPercentage: 0 };
    }

    return {
      recoverablePercentage: (recoverablePending / totalPending) * 100,
      paymentPercentage: (paymentPending / totalPending) * 100,
    };
  }
}
