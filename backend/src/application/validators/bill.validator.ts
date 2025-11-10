import { Result, ResultUtils } from '../../shared/types/common.types';
import { CreateBillDto } from '../dtos/bill/CreateBillDto';
import { UpdateBillDto } from '../dtos/bill/UpdateBillDto';
import { BillStatus } from '../../domain/entities/Bill';

interface ValidationError {
  field: string;
  message: string;
}

export class BillValidator {
  private validateStatus(status?: BillStatus): ValidationError | null {
    if (status && !['REGISTERED', 'RETURNED', 'PAYMENT_MADE'].includes(status)) {
      return { field: 'status', message: 'Invalid status. Must be REGISTERED, RETURNED, or PAYMENT_MADE' };
    }
    return null;
  }

  private validateAmounts(dto: CreateBillDto | UpdateBillDto): ValidationError[] {
    const errors: ValidationError[] = [];

    if (dto.invoiceAmount !== undefined && dto.invoiceAmount < 0) {
      errors.push({ field: 'invoiceAmount', message: 'Invoice amount cannot be negative' });
    }

    return errors;
  }

  validateCreate(dto: CreateBillDto): Result<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Status validation
    const statusError = this.validateStatus(dto.status);
    if (statusError) {
      errors.push(statusError);
    }

    // Amount validations
    errors.push(...this.validateAmounts(dto));

    if (errors.length > 0) {
      return ResultUtils.fail('Validation failed', errors);
    }

    return ResultUtils.ok([]);
  }

  validateUpdate(dto: UpdateBillDto): Result<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Status validation
    const statusError = this.validateStatus(dto.status);
    if (statusError) {
      errors.push(statusError);
    }

    // Amount validations
    errors.push(...this.validateAmounts(dto));

    if (errors.length > 0) {
      return ResultUtils.fail('Validation failed', errors);
    }

    return ResultUtils.ok([]);
  }
}
