import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import { FDRImportRow, BulkImportFdrResult } from '../dtos/fdr/BulkImportFdrDto';
import { Result, ResultUtils } from '../../shared/types/common.types';

export class BulkImportFdrService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Map Excel status to database enum
   */
  private mapStatus(excelStatus?: string): 'RUNNING' | 'COMPLETED' | 'CANCELLED' | 'RETURNED' {
    if (!excelStatus) return 'RUNNING';

    const statusMap: Record<string, 'RUNNING' | 'COMPLETED' | 'CANCELLED' | 'RETURNED'> = {
      'Running': 'RUNNING',
      'Completed': 'COMPLETED',
      'Cancelled': 'CANCELLED',
      'FD Cancelled': 'CANCELLED',
      'FD Cancelled - new one made instead': 'CANCELLED',
      'Returned': 'RETURNED',
      'returned': 'RETURNED',
    };

    return statusMap[excelStatus] || 'RUNNING';
  }

  /**
   * Map Excel category to database enum
   */
  private mapCategory(excelCategory?: string): 'FD' | 'BG' {
    if (!excelCategory) return 'FD';
    const normalized = excelCategory.trim().toUpperCase();
    return normalized === 'BG' ? 'BG' : 'FD';
  }

  /**
   * Parse Excel date to JavaScript Date
   */
  private parseExcelDate(value: any): Date | undefined {
    if (!value) return undefined;

    // If it's already a Date object
    if (value instanceof Date) {
      const year = value.getFullYear();
      if (year > 3000) {
        const correctedYear = parseInt(year.toString().substring(0, 4));
        value.setFullYear(correctedYear);
      }
      return value;
    }

    // If it's an Excel serial number
    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value);
      return new Date(date.y, date.m - 1, date.d);
    }

    // If it's a string, try to parse it
    if (typeof value === 'string') {
      let cleanedValue = value;
      const yearMatch = value.match(/\b(20\d{3,})\b/);
      if (yearMatch) {
        const typoYear = yearMatch[1];
        const correctedYear = '20' + typoYear.substring(2, 4);
        cleanedValue = value.replace(typoYear, correctedYear);
      }

      const parsed = new Date(cleanedValue);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        if (year > 3000) {
          const correctedYear = parseInt(year.toString().substring(0, 4));
          parsed.setFullYear(correctedYear);
        }
        return parsed;
      }
      return undefined;
    }

    return undefined;
  }

  /**
   * Parse numeric value, handling currency symbols and NaN
   */
  private parseNumber(value: any): number | undefined {
    if (value === null || value === undefined || value === '' || value === '-' || value === 'N/A') {
      return undefined;
    }

    // Handle strings with currency symbols like "₹ 1,722,000.00"
    if (typeof value === 'string') {
      const cleaned = value
        .replace(/₹/g, '')          // Remove rupee symbol
        .replace(/,/g, '')          // Remove commas
        .replace(/\s+/g, '')        // Remove spaces
        .trim();

      const num = Number(cleaned);
      return isNaN(num) ? undefined : num;
    }

    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Parse Excel file and extract FDR rows
   */
  private async parseExcelFile(filePath: string): Promise<FDRImportRow[]> {
    const fileBuffer = await fs.readFile(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });

    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

    // Map to FDRImportRow
    const rows: FDRImportRow[] = jsonData.map((row) => ({
      category: row['Category']?.toString().trim() || 'FD',
      bank: row['Bank']?.toString().trim() || 'IDBI',
      accountNo: row['Account No.']?.toString().trim(),
      fdrNumber: row['FD/BG No.']?.toString().trim(),
      accountName: row['Account Name']?.toString().trim(),
      depositAmount: this.parseNumber(row['Deposit Amount']) || 0,
      dateOfDeposit: this.parseExcelDate(row['Date of Deposit']),
      maturityValue: this.parseNumber(row['Maturity Value']),
      contractNo: row['Contract No.']?.toString().trim(),
      contractDetails: row['Contract Details']?.toString().trim(),
      poc: row['POC']?.toString().trim(),
      location: row['Location']?.toString().trim(),
      emd: this.parseNumber(row['EMD']),
      sd: this.parseNumber(row['SD']),
      status: row['Status']?.toString().trim(),
    }));

    return rows;
  }

  /**
   * Validate a single row
   */
  private validateRow(row: FDRImportRow, rowIndex: number): string | null {
    // Required fields validation
    if (!row.bank) {
      return `Row ${rowIndex}: Bank name is required`;
    }

    if (!row.depositAmount || row.depositAmount <= 0) {
      return `Row ${rowIndex}: Deposit Amount must be a positive number`;
    }

    if (!row.dateOfDeposit) {
      return `Row ${rowIndex}: Date of Deposit is required`;
    }

    return null;
  }

  /**
   * Bulk import FDRs from Excel file
   */
  async bulkImport(file: Express.Multer.File): Promise<Result<BulkImportFdrResult>> {
    try {
      // Step 1: Parse Excel file
      const rows = await this.parseExcelFile(file.path);

      if (rows.length === 0) {
        return ResultUtils.fail('No data found in Excel file');
      }

      console.log(`Found ${rows.length} rows in Excel file`);

      // Step 2: Process each row
      const result: BulkImportFdrResult = {
        totalRows: rows.length,
        successCount: 0,
        failureCount: 0,
        skippedCount: 0,
        errors: [],
        createdFdrs: []
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // Excel row number (accounting for header)

        try {
          // Validate row
          const validationError = this.validateRow(row, rowNumber);
          if (validationError) {
            result.errors.push({
              row: rowNumber,
              fdrNumber: row.fdrNumber || 'N/A',
              error: validationError
            });
            result.failureCount++;
            continue;
          }

          // Check if FDR already exists (if fdrNumber is provided)
          if (row.fdrNumber) {
            const existingFdr = await this.prisma.fDR.findFirst({
              where: { fdrNumber: row.fdrNumber }
            });

            if (existingFdr) {
              result.errors.push({
                row: rowNumber,
                fdrNumber: row.fdrNumber,
                error: 'FDR number already exists'
              });
              result.skippedCount++;
              continue;
            }
          }

          // Map category and status
          const category = this.mapCategory(row.category);
          const status = this.mapStatus(row.status);

          // Create FDR
          const createdFdr = await this.prisma.fDR.create({
            data: {
              category: category,
              bankName: row.bank,
              accountNo: row.accountNo,
              fdrNumber: row.fdrNumber,
              accountName: row.accountName,
              depositAmount: row.depositAmount,
              dateOfDeposit: row.dateOfDeposit!,
              maturityValue: row.maturityValue,
              maturityDate: undefined, // Not in Excel format, can be calculated if needed
              contractNo: row.contractNo,
              contractDetails: row.contractDetails,
              poc: row.poc,
              location: row.location,
              status: status,
              tags: [category], // Tag with FD or BG
            }
          });

          result.successCount++;
          result.createdFdrs.push({
            fdrNumber: createdFdr.fdrNumber ?? undefined,
            depositAmount: createdFdr.depositAmount,
            bankName: createdFdr.bankName ?? '',
            location: createdFdr.location ?? undefined,
          });

        } catch (error) {
          console.error(`Error processing row ${rowNumber}:`, error);
          result.errors.push({
            row: rowNumber,
            fdrNumber: row.fdrNumber || 'N/A',
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          });
          result.failureCount++;
        }
      }

      return ResultUtils.ok(result);

    } catch (error) {
      console.error('Bulk import error:', error);
      return ResultUtils.fail('Failed to process Excel file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      // Clean up uploaded file
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.error('Error deleting temp file:', error);
      }
    }
  }
}
