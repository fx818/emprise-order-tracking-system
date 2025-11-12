import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import { LOAImportRow, BulkImportResult } from '../dtos/loa/BulkImportLoaDto';
import { Result, ResultUtils } from '../../shared/types/common.types';

export class BulkImportService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Map Excel status to database enum
   * Maps from your sheet's status format to database LOAStatus enum
   */
  private mapStatus(excelStatus?: string): 'NOT_STARTED' | 'IN_PROGRESS' | 'SUPPLY_WORK_DELAYED' | 'SUPPLY_WORK_COMPLETED' | 'APPLICATION_PENDING' | 'UPLOAD_BILL' | 'CHASE_PAYMENT' | 'RETRIEVE_EMD_SECURITY' | 'CLOSED' {
    if (!excelStatus) return 'NOT_STARTED';

    const statusMap: Record<string, 'NOT_STARTED' | 'IN_PROGRESS' | 'SUPPLY_WORK_DELAYED' | 'SUPPLY_WORK_COMPLETED' | 'APPLICATION_PENDING' | 'UPLOAD_BILL' | 'CHASE_PAYMENT' | 'RETRIEVE_EMD_SECURITY' | 'CLOSED'> = {
      // Excel Status → Database Status (exact match)
      '1. Not Started': 'NOT_STARTED',
      '2. In Progress': 'IN_PROGRESS',
      '3. Supply/Work Delayed': 'SUPPLY_WORK_DELAYED',
      '4. Supply/Work Completed': 'SUPPLY_WORK_COMPLETED',
      '5. Application Pending': 'APPLICATION_PENDING',
      '6. Upload Bill': 'UPLOAD_BILL',
      '7. Chase Payment': 'CHASE_PAYMENT',
      '8. Retrieve EMD/Security': 'RETRIEVE_EMD_SECURITY',
      '9. Closed': 'CLOSED',
    };

    return statusMap[excelStatus] || 'NOT_STARTED';
  }

  /**
   * Parse Excel date to JavaScript Date
   */
  private parseExcelDate(value: any): Date | undefined {
    if (!value) return undefined;

    // If it's already a Date object
    if (value instanceof Date) {
      // Check for unrealistic years and auto-correct
      const year = value.getFullYear();
      if (year > 3000) {
        // Likely a typo like 20025 instead of 2025
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
      // Check for year typos in string format (e.g., "17 July 20025")
      let cleanedValue = value;
      const yearMatch = value.match(/\b(20\d{3,})\b/); // Match years starting with "20" and having extra digits
      if (yearMatch) {
        const typoYear = yearMatch[1];
        // If year starts with "20" and has extra digits, it's likely "20025" → "2025"
        const correctedYear = '20' + typoYear.substring(2, 4); // Take "20" + next 2 digits
        cleanedValue = value.replace(typoYear, correctedYear);
      }

      const parsed = new Date(cleanedValue);
      if (!isNaN(parsed.getTime())) {
        // Additional check for unrealistic years
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
   * Parse string value, treating N/A, NA, empty, and dash as undefined
   */
  private parseStringValue(value: any): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    const strValue = value.toString().trim();
    // Treat N/A, NA, dash, and empty string as undefined
    if (strValue === '' || strValue === '-' || strValue.toUpperCase() === 'N/A' || strValue.toUpperCase() === 'NA') {
      return undefined;
    }
    return strValue;
  }

  /**
   * Parse numeric value, handling NaN, empty values, and N/A
   */
  private parseNumber(value: any): number | undefined {
    if (value === null || value === undefined || value === '' || value === '-') {
      return undefined;
    }
    // Check if value is N/A or NA
    const strValue = value.toString().trim().toUpperCase();
    if (strValue === 'N/A' || strValue === 'NA') {
      return undefined;
    }
    // Remove commas before parsing (handles Indian number format like 2,29,04,712.22)
    const cleanValue = value.toString().replace(/,/g, '');
    const num = Number(cleanValue);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Parse "Days to due date" column from Excel
   * Handles: "Completed", "(2,182)" for overdue, "5" for remaining days
   */
  private parseDaysToDueDate(value: any): number | null {
    if (!value) return null;

    const strValue = this.parseStringValue(value);
    if (!strValue) return null;

    // Handle "Completed" status
    if (strValue.toUpperCase().includes('COMPLETED')) {
      return null; // Completed LOAs don't have days to due date
    }

    // Handle parentheses (negative numbers like "(2,182)" meaning overdue)
    if (strValue.includes('(') && strValue.includes(')')) {
      const numStr = strValue.replace(/[()]/g, '').replace(/,/g, '').trim();
      const num = Number(numStr);
      return isNaN(num) ? null : -num; // Negative for overdue
    }

    // Handle positive numbers with commas (like "2,182" or "5")
    const cleanValue = strValue.replace(/,/g, '').trim();
    const num = Number(cleanValue);
    return isNaN(num) ? null : num;
  }

  /**
   * Parse Excel file and extract LOA rows
   */
  private async parseExcelFile(filePath: string): Promise<LOAImportRow[]> {
    const fileBuffer = await fs.readFile(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });

    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

    // Map to LOAImportRow
    const rows: LOAImportRow[] = jsonData.map((row) => ({
      loaNumber: this.parseStringValue(row['PO/LOA Number']) || '',
      site: this.parseStringValue(row['Site']) || '',
      customerName: this.parseStringValue(row['Customer Name']),
      orderValue: this.parseNumber(row['Order Value']) || 0,
      workDescription: this.parseStringValue(row['Description of Work']) || '',
      orderReceivedDate: this.parseExcelDate(row['Order Received Date']),
      deliveryDate: this.parseExcelDate(row['Delivery Date']),
      orderDueDate: this.parseExcelDate(row['Order Due date']),
      orderStatus: this.parseStringValue(row['Order Status']),
      emd: this.parseNumber(row['EMD']),
      securityDeposit: this.parseNumber(row['Security Deposit']),
      performanceGuarantee: this.parseNumber(row['Performance Guarantee']),
      // Additional fields
      tenderNo: this.parseStringValue(row['Tender No.']),
      orderPOC: this.parseStringValue(row['Order POC']),
      fdBgDetails: this.parseStringValue(row['FD/BG Details']),
      // Billing fields (try multiple column name variations)
      lastInvoiceNo: this.parseStringValue(row['Last Invoice No.'] || row['Last Invoice No'] || row['Last Invoice Number']),
      lastInvoiceAmount: this.parseNumber(row['Last Invoice Amount'] || row['Last Invoice Value']),
      totalReceivables: this.parseNumber(row['Total Receivables '] || row['Total Receivables']),
      actualAmountReceived: this.parseNumber(row['Actual Amount Received']),
      amountDeducted: this.parseNumber(row['Amount Deducted']),
      amountPending: this.parseNumber(row['Amount Pending']),
      reasonForDeduction: this.parseStringValue(row['Reason for deduction']),
      billLinks: this.parseStringValue(row['Bill Links']),
      remarks: this.parseStringValue(row['Remarks']),
      daysToDueDate: this.parseStringValue(row['Days to due date']),
    }));

    return rows;
  }

  /**
   * Normalize string for comparison (lowercase, remove extra spaces)
   */
  private normalizeString(str: string): string {
    return str.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Find or create customer with case-insensitive matching and ID collision detection
   */
  private async findOrCreateCustomer(customerName: string): Promise<string> {
    const normalizedName = this.normalizeString(customerName);

    // Try to find existing customer with case-insensitive match on name
    const existingCustomers = await this.prisma.customer.findMany();
    const matchingCustomer = existingCustomers.find(
      c => this.normalizeString(c.name) === normalizedName
    );

    if (matchingCustomer) {
      console.log(`Found existing customer: ${matchingCustomer.name} (ID: ${matchingCustomer.id})`);
      return matchingCustomer.id;
    }

    // Create new customer if not found
    // Generate base ID from name (uppercase, no spaces, max 18 chars to leave room for suffix)
    const baseId = customerName
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 18); // Limit to 18 chars to allow for 2-digit suffix

    // Check for ID collision and append number if needed
    let customerId = baseId;
    let counter = 1;

    while (await this.prisma.customer.findUnique({ where: { id: customerId } })) {
      customerId = `${baseId}${counter}`;
      counter++;

      // Safety check: prevent infinite loop
      if (counter > 99) {
        throw new Error(`Unable to generate unique ID for customer: ${customerName}`);
      }
    }

    const newCustomer = await this.prisma.customer.create({
      data: {
        id: customerId,
        name: customerName,
        headquarters: 'India' // Default placeholder
      }
    });

    if (customerId !== baseId) {
      console.log(`Created new customer with collision-resolved ID: ${newCustomer.name} (ID: ${newCustomer.id}, originally tried: ${baseId})`);
    } else {
      console.log(`Created new customer: ${newCustomer.name} (ID: ${newCustomer.id})`);
    }

    return newCustomer.id;
  }

  /**
   * Find or create POC with case-insensitive matching
   */
  private async findOrCreatePoc(pocName: string): Promise<string> {
    const normalizedName = this.normalizeString(pocName);

    // Try to find existing POC with case-insensitive match on name
    const existingPocs = await this.prisma.pOC.findMany();
    const matchingPoc = existingPocs.find(
      p => this.normalizeString(p.name) === normalizedName
    );

    if (matchingPoc) {
      console.log(`Found existing POC: ${matchingPoc.name} (ID: ${matchingPoc.id})`);
      return matchingPoc.id;
    }

    // Create new POC if not found (use original case from Excel)
    const newPoc = await this.prisma.pOC.create({
      data: {
        name: pocName.trim()
      }
    });

    console.log(`Created new POC: ${newPoc.name} (ID: ${newPoc.id})`);
    return newPoc.id;
  }

  /**
   * Find or create site with customer-scoped duplicate prevention
   * @param siteCodeCache - Map to track site codes generated in current batch
   */
  private async findOrCreateSite(
    siteName: string,
    customerId: string,
    siteCodeCache: Map<string, Set<string>> = new Map()
  ): Promise<string> {
    // Try to find existing site for THIS specific customer with case-insensitive match
    const existingSite = await this.prisma.site.findFirst({
      where: {
        zoneId: customerId,
        name: {
          equals: siteName,
          mode: 'insensitive'
        }
      }
    });

    if (existingSite) {
      console.log(`Found existing site: ${existingSite.name} (ID: ${existingSite.id}) for customer ${customerId}`);
      return existingSite.id;
    }

    // Create new site if not found
    // Generate site code by finding the highest number for this customer
    const existingSitesForCustomer = await this.prisma.site.findMany({
      where: { zoneId: customerId },
      orderBy: { code: 'desc' },
      take: 1
    });

    let siteNumber = 1;
    if (existingSitesForCustomer.length > 0) {
      const latestCode = existingSitesForCustomer[0].code;
      const match = latestCode.match(/(\d+)$/);
      if (match) {
        siteNumber = parseInt(match[1]) + 1;
      }
    }

    // Check cache for codes already generated in this batch
    const cachedCodes = siteCodeCache.get(customerId);
    if (cachedCodes) {
      // Find the highest number in cached codes
      for (const code of cachedCodes) {
        const match = code.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1]);
          if (num >= siteNumber) {
            siteNumber = num + 1;
          }
        }
      }
    }

    // Generate unique site code
    const codePrefix = customerId.substring(0, 5);
    let siteCode = `${codePrefix}/SITE/${siteNumber.toString().padStart(3, '0')}`;

    // Ensure code is unique (check both DB and cache)
    while (
      (cachedCodes && cachedCodes.has(siteCode)) ||
      (await this.prisma.site.findUnique({ where: { code: siteCode } }))
    ) {
      siteNumber++;
      siteCode = `${codePrefix}/SITE/${siteNumber.toString().padStart(3, '0')}`;
    }

    // Add to cache
    if (!siteCodeCache.has(customerId)) {
      siteCodeCache.set(customerId, new Set());
    }
    siteCodeCache.get(customerId)!.add(siteCode);

    const newSite = await this.prisma.site.create({
      data: {
        name: siteName,
        code: siteCode,
        zoneId: customerId,
        location: siteName, // Use site name as location
        address: `${siteName}, India`, // Default address
        status: 'ACTIVE'
      }
    });

    console.log(`Created new site: ${newSite.name} (ID: ${newSite.id}, Code: ${newSite.code})`);
    return newSite.id;
  }

  /**
   * Validate a single row
   */
  private validateRow(row: LOAImportRow, rowIndex: number): string | null {
    // Required fields validation
    // Note: Customer Name is checked separately in processing loop to allow skipping

    if (!row.loaNumber) {
      return `Row ${rowIndex}: LOA Number is required`;
    }

    if (!row.site) {
      return `Row ${rowIndex}: Site is required`;
    }

    if (!row.orderValue || row.orderValue <= 0) {
      return `Row ${rowIndex}: Order Value must be a positive number`;
    }

    // Work description is optional now - no minimum length required

    // Date validation removed - allow any date combinations

    return null;
  }

  /**
   * Bulk import LOAs from Excel file
   */
  async bulkImport(file: Express.Multer.File): Promise<Result<BulkImportResult>> {
    try {
      // Step 1: Parse Excel file
      const rows = await this.parseExcelFile(file.path);

      if (rows.length === 0) {
        return ResultUtils.fail('No data found in Excel file');
      }

      // Step 2: Build customer-site mapping from Excel data
      // Create a map of: customerName -> siteName -> siteId
      const customerSiteMapping = new Map<string, Map<string, string>>();

      // Cache for tracking site codes generated in this batch to prevent duplicates
      const siteCodeCache = new Map<string, Set<string>>();

      // Collect unique customer-site combinations
      interface CustomerSitePair {
        customerName: string;
        siteName: string;
      }
      const uniquePairs = new Map<string, CustomerSitePair>();

      rows.forEach(row => {
        if (row.customerName && row.site) {
          const key = `${row.customerName.trim()}::${row.site.trim()}`;
          if (!uniquePairs.has(key)) {
            uniquePairs.set(key, {
              customerName: row.customerName.trim(),
              siteName: row.site.trim()
            });
          }
        }
      });

      console.log(`Found ${uniquePairs.size} unique customer-site combinations in Excel`);

      // Step 3: Create all customers and sites
      for (const pair of uniquePairs.values()) {
        try {
          // Find or create customer
          const customerId = await this.findOrCreateCustomer(pair.customerName);

          // Ensure customer has a site map
          if (!customerSiteMapping.has(customerId)) {
            customerSiteMapping.set(customerId, new Map());
          }

          const siteMap = customerSiteMapping.get(customerId)!;

          // Find or create site for this customer
          if (!siteMap.has(pair.siteName.toLowerCase())) {
            try {
              const siteId = await this.findOrCreateSite(pair.siteName, customerId, siteCodeCache);
              siteMap.set(pair.siteName.toLowerCase(), siteId);
            } catch (error) {
              // Handle site creation errors (e.g., duplicate site name across customers)
              console.warn(`Warning: Could not create site '${pair.siteName}' for customer '${pair.customerName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
              // Site will be looked up again during row processing
            }
          }
        } catch (error) {
          console.error(`Error processing customer-site pair (${pair.customerName}, ${pair.siteName}):`, error);
        }
      }

      // Step 5: Process each row
      const result: BulkImportResult = {
        totalRows: rows.length,
        successCount: 0,
        failureCount: 0,
        skippedCount: 0,
        errors: [],
        createdLoas: []
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // Excel row number (accounting for header)

        try {
          // Skip rows with missing customer name
          if (!row.customerName || row.customerName.trim() === '') {
            result.errors.push({
              row: rowNumber,
              loaNumber: row.loaNumber || 'N/A',
              error: 'Customer Name is missing - row skipped'
            });
            result.skippedCount++;
            continue;
          }

          // Validate row
          const validationError = this.validateRow(row, rowNumber);
          if (validationError) {
            result.errors.push({
              row: rowNumber,
              loaNumber: row.loaNumber || 'N/A',
              error: validationError
            });
            result.failureCount++;
            continue;
          }

          // Check if LOA already exists
          const existingLoa = await this.prisma.lOA.findUnique({
            where: { loaNumber: row.loaNumber }
          });

          if (existingLoa) {
            result.errors.push({
              row: rowNumber,
              loaNumber: row.loaNumber,
              error: 'LOA number already exists'
            });
            result.skippedCount++;
            continue;
          }

          // Get customer ID for this row
          const customerId = await this.findOrCreateCustomer(row.customerName!);

          // Get site ID from customer-site mapping
          const siteMap = customerSiteMapping.get(customerId);
          let siteId = siteMap?.get(row.site.toLowerCase().trim());

          // If site not found in pre-created map, try to find or create it now
          if (!siteId) {
            try {
              siteId = await this.findOrCreateSite(row.site, customerId, siteCodeCache);
              // Update the mapping
              if (!customerSiteMapping.has(customerId)) {
                customerSiteMapping.set(customerId, new Map());
              }
              customerSiteMapping.get(customerId)!.set(row.site.toLowerCase().trim(), siteId);
            } catch (error) {
              console.error(`Error creating site '${row.site}' for customer '${row.customerName}':`, error);
              result.errors.push({
                row: rowNumber,
                loaNumber: row.loaNumber,
                error: `Could not create site '${row.site}': ${error instanceof Error ? error.message : 'Unknown error'}`
              });
              result.failureCount++;
              continue;
            }
          }

          // Determine delivery period
          // Start date = Order Received Date
          // End date = Order Due Date (same as Delivery Date in the sheet)
          const deliveryPeriodStart = row.orderReceivedDate || new Date();
          const deliveryPeriodEnd = row.orderDueDate || row.deliveryDate || new Date(deliveryPeriodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

          // Map status
          const status = this.mapStatus(row.orderStatus);

          // Get or create POC if orderPOC is provided
          let pocId: string | null = null;
          if (row.orderPOC) {
            try {
              pocId = await this.findOrCreatePoc(row.orderPOC);
            } catch (error) {
              console.warn(`Warning: Could not create POC '${row.orderPOC}':`, error);
              // Continue without POC if creation fails
            }
          }

          // Create LOA with Invoice in a transaction
          const createdLoa = await this.prisma.$transaction(async (tx): Promise<any> => {
            // Create LOA with LOA-level billing fields
            const loa = await tx.lOA.create({
              data: {
                loaNumber: row.loaNumber,
                loaValue: row.orderValue,
                site: {
                  connect: { id: siteId }
                },
                deliveryPeriod: {
                  start: deliveryPeriodStart.toISOString(),
                  end: deliveryPeriodEnd.toISOString()
                },
                dueDate: row.orderDueDate || null, // Add due date from Excel
                orderReceivedDate: row.orderReceivedDate || null, // Add order received date from Excel
                workDescription: row.workDescription,
                documentUrl: 'pending', // Will be updated later if document is uploaded
                status: status,
                tags: [],
                remarks: row.remarks || null, // Map remarks from Excel to LOA remarks
                hasEmd: !!row.emd,
                emdAmount: row.emd,
                // New fields from bulk import
                tenderNo: row.tenderNo || null,
                ...(pocId && { poc: { connect: { id: pocId } } }), // Link to POC table via relation
                fdBgDetails: row.fdBgDetails || null,
                daysToDueDateFromExcel: this.parseDaysToDueDate(row.daysToDueDate),
                // LOA-level financial data (historical data from bulk import)
                // These are totals for the entire LOA, not individual bills
                manualTotalBilled: row.lastInvoiceAmount || null,
                manualTotalReceived: row.actualAmountReceived || null,
                manualTotalDeducted: row.amountDeducted || null,
                // Pending breakdown fields (initialized to 0, can be updated later)
                recoverablePending: 0,
                paymentPending: 0,
              },
              include: {
                site: true
              }
            });

            // Note: For bulk import, financial data (actualAmountReceived, amountDeducted)
            // represents LOA-level totals, not individual bill data.
            // Bills can be added manually later for ongoing work.
            console.log(`Created LOA ${row.loaNumber} with LOA-level financial data:`, {
              loaValue: row.orderValue,
              manualTotalBilled: row.lastInvoiceAmount,
              manualTotalReceived: row.actualAmountReceived,
              manualTotalDeducted: row.amountDeducted,
            });

            return loa;
          });

          result.successCount++;
          result.createdLoas.push({
            loaNumber: createdLoa.loaNumber,
            loaValue: createdLoa.loaValue,
            site: createdLoa.site?.name || row.site
          });

        } catch (error) {
          console.error(`Error processing row ${rowNumber}:`, error);
          result.errors.push({
            row: rowNumber,
            loaNumber: row.loaNumber || 'N/A',
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
