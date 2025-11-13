// application/validators/item.validator.ts
import { Result, ResultUtils } from '../../shared/types/common.types';
import { CreateItemDto, UpdateItemDto } from '../dtos/item/CreateItemDto';

interface ValidationError {
  field: string;
  message: string;
}

export class ItemValidator {
  validate(dto: CreateItemDto): Result<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Name validation
    if (!dto.name?.trim()) {
      errors.push({ field: 'name', message: 'Name is required' });
    } else if (dto.name.length < 2 || dto.name.length > 100) {
      errors.push({ field: 'name', message: 'Name must be between 2 and 100 characters' });
    }

    // Description validation (if provided)
    if (dto.description && (dto.description.length < 10 || dto.description.length > 500)) {
      errors.push({ field: 'description', message: 'Description must be between 10 and 500 characters' });
    }

    // Unit Price validation
    // if (dto.unitPrice === undefined || dto.unitPrice <= 0) {
    //   errors.push({ field: 'unitPrice', message: 'Unit price must be a positive number' });
    // }

    // Unit of Measurement validation
    if (!dto.uom?.trim()) {
      errors.push({ field: 'uom', message: 'Unit of measurement is required' });
    }

    // HSN Code validation (if provided)
    const hsnRegex = /^\d{4,8}$/;
    if (dto.hsnCode && !hsnRegex.test(dto.hsnCode)) {
      errors.push({ field: 'hsnCode', message: 'Invalid HSN code format' });
    }

    // Tax Rates validation
    // if (!dto.taxRates) {
    //   errors.push({ field: 'taxRates', message: 'Tax rates are required' });
    // } else {
    //   const { igst, sgst, ugst } = dto.taxRates;
      
      // At least one tax rate should be provided
    //   if (igst === undefined && sgst === undefined && ugst === undefined) {
    //     errors.push({ field: 'taxRates', message: 'At least one tax rate must be provided' });
    //   }

      // Validate each provided tax rate
    //   if (igst !== undefined && (igst < 0 || igst > 100)) {
    //     errors.push({ field: 'taxRates.igst', message: 'IGST must be between 0 and 100' });
    //   }

    //   if (sgst !== undefined && (sgst < 0 || sgst > 100)) {
    //     errors.push({ field: 'taxRates.sgst', message: 'SGST must be between 0 and 100' });
    //   }

    //   if (ugst !== undefined && (ugst < 0 || ugst > 100)) {
    //     errors.push({ field: 'taxRates.ugst', message: 'UGST must be between 0 and 100' });
    //   }
    // }

    return errors.length === 0 ? ResultUtils.ok([]) : ResultUtils.ok(errors);
  }

  validateId(id: string): Result<ValidationError[]> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id) 
      ? ResultUtils.ok([]) 
      : ResultUtils.ok([{ field: 'id', message: 'Invalid ID format' }]);
  }
}


// export class ItemValidator {
//   validate(dto: CreateItemDto): Result<ValidationError[]> {
//     const errors: ValidationError[] = [];

//     // Name validation
//     if (!dto.name?.trim()) {
//       errors.push({ field: "name", message: "Name is required" });
//     } else if (dto.name.length < 2 || dto.name.length > 100) {
//       errors.push({
//         field: "name",
//         message: "Name must be between 2 and 100 characters",
//       });
//     }

//     // Description validation (optional)
//     if (dto.description && (dto.description.length < 10 || dto.description.length > 500)) {
//       errors.push({
//         field: "description",
//         message: "Description must be between 10 and 500 characters",
//       });
//     }

//     // Unit of Measurement
//     if (!dto.uom?.trim()) {
//       errors.push({
//         field: "uom",
//         message: "Unit of measurement is required",
//       });
//     }

//     // HSN Code validation (optional)
//     const hsnRegex = /^\d{4,8}$/;
//     if (dto.hsnCode && !hsnRegex.test(dto.hsnCode)) {
//       errors.push({
//         field: "hsnCode",
//         message: "Invalid HSN code format",
//       });
//     }

//     // -------------------------
//     // Return Result Correctly
//     // -------------------------
//     if (errors.length > 0) {
//       return ResultUtils.fail("Validation failed", errors);
//     }

//     return ResultUtils.ok([]);
//   }

//   validateId(id: string): Result<ValidationError[]> {
//     const uuidRegex =
//       /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

//     if (!uuidRegex.test(id)) {
//       return ResultUtils.fail("Validation failed", [
//         { field: "id", message: "Invalid ID format" },
//       ]);
//     }

//     return ResultUtils.ok([]);
//   }
// }
