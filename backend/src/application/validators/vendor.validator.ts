import { Result, ResultUtils } from '../../shared/types/common.types';
import { CreateVendorDto, UpdateVendorDto } from '../dtos/vendor/CreateVendorDto';

interface ValidationError {
  field: string;
  message: string;
}

export class VendorValidator {
  validate(dto: CreateVendorDto): Result<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Name validation
    if (!dto.name?.trim()) {
      errors.push({ field: 'name', message: 'Name is required' });
    } else if (dto.name.length < 2 || dto.name.length > 100) {
      errors.push({ field: 'name', message: 'Name must be between 2 and 100 characters' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!dto.email?.trim()) {
      errors.push({ field: 'email', message: 'Email is required' });
    } else if (!emailRegex.test(dto.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    // Mobile validation
    const mobileRegex = /^\d{10}$/;
    if (!dto.mobile?.trim()) {
      errors.push({ field: 'mobile', message: 'Mobile number is required' });
    } else if (!mobileRegex.test(dto.mobile)) {
      errors.push({ field: 'mobile', message: 'Invalid mobile number format' });
    }

    // GSTIN validation (if provided)
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (dto.gstin && !gstinRegex.test(dto.gstin)) {
      errors.push({ field: 'gstin', message: 'Invalid GSTIN format' });
    }

    // Address validation
    if (!dto.address?.trim()) {
      errors.push({ field: 'address', message: 'Address is required' });
    } else if (dto.address.length < 10 || dto.address.length > 500) {
      errors.push({ field: 'address', message: 'Address must be between 10 and 500 characters' });
    }

    // Remarks validation (if provided)
    if (dto.remarks && (dto.remarks.length < 2 || dto.remarks.length > 300)) {
      errors.push({ field: 'remarks', message: 'Remarks must be between 2 and 300 characters' });
    }

    // Bank details validation
    if (!dto.bankDetails) {
      errors.push({ field: 'bankDetails', message: 'Bank details are required' });
    } else {
      const { accountNumber, accountName, bankName, branchName, ifscCode } = dto.bankDetails;

      if (!accountNumber?.trim()) {
        errors.push({ field: 'bankDetails.accountNumber', message: 'Account number is required' });
      }
      if (!accountName?.trim()) {
        errors.push({ field: 'bankDetails.accountName', message: 'Account name is required' });
      }
      if (!bankName?.trim()) {
        errors.push({ field: 'bankDetails.bankName', message: 'Bank name is required' });
      }
      if (!branchName?.trim()) {
        errors.push({ field: 'bankDetails.branchName', message: 'Branch name is required' });
      }
      if (!ifscCode?.trim()) {
        errors.push({ field: 'bankDetails.ifscCode', message: 'IFSC code is required' });
      } else {
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(ifscCode)) {
          errors.push({ field: 'bankDetails.ifscCode', message: 'Invalid IFSC code format' });
        }
      }
    }

    return errors.length === 0 ? ResultUtils.ok([]) : ResultUtils.ok(errors);
  }

  validateId(id: string): Result<ValidationError[]> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id) 
      ? ResultUtils.ok([]) 
      : ResultUtils.ok([{ field: 'id', message: 'Invalid ID format' }]);
  }
}
