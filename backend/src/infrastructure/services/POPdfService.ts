// src/services/POPDFService.ts
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import { S3Service } from './S3Service';
import { createHash } from 'crypto';
import path from 'path';
import fs from 'fs/promises';

export interface PDFItemData {
  id: string;
  item: {
    id: string;
    name: string;
    description: string;
    unitPrice: number;
    uom: string;
    hsnCode: string
  };
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface PDFGenerationData {
  id: string;
  poNumber: string;
  loaNumber: string;
  vendor: {
    name: string;
    email: string;
    mobile: string;
    gstin: string;
    address: string;
  };
  items: PDFItemData[];
  requirementDesc: string;
  termsConditions: string;
  shipToAddress: string;
  baseAmount: number;
  taxAmount: number;
  additionalCharges: Array<{
    description: string;
    amount: number;
  }>;
  totalAmount: number;
  notes: string;
  createdBy: {
    name: string;
    department: string;
  };
  createdAt: Date;
}

export class POPDFService {
  private templatePath: string;

  constructor(private s3Service: S3Service) {
    this.templatePath = path.join(__dirname, '../templates/purchase-order.hbs');
    this.registerHandlebarsHelpers();
  }

  private registerHandlebarsHelpers() {
    // Helper for adding numbers (used for index + 1)
    handlebars.registerHelper('add', (a: number, b: number) => {
      return (a || 0) + (b || 0);
    });

    // Helper for multiplication
    handlebars.registerHelper('multiply', (a: number, b: number) => {
      if (typeof a !== 'number' || typeof b !== 'number') return '0.00';
      return this.formatIndianNumber(a * b);
    });

    // Helper for currency formatting
    handlebars.registerHelper('formatCurrency', (amount: number) => {
      return this.formatCurrency(amount);
    });

    // Helper for number formatting
    handlebars.registerHelper('formatNumber', (num: number) => {
      return this.formatIndianNumber(num);
    });

    // Helper for date formatting
    handlebars.registerHelper('formatDate', (date: string | Date) => {
      return this.formatDate(date);
    });

    // Helper for safe HTML content
    handlebars.registerHelper('safe', (text: string) => {
      return new handlebars.SafeString(text);
    });

    // Add the numberToWords helper
    handlebars.registerHelper('numberToWords', (amount: number) => {
      return this.convertToWords(amount);
    });
  }

  private convertToWords(amount: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const convertLessThanThousand = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
    };

    if (amount === 0) return 'Zero Rupees';

    let result = '';
    const crores = Math.floor(amount / 10000000);
    const lakhs = Math.floor((amount % 10000000) / 100000);
    const thousands = Math.floor((amount % 100000) / 1000);
    const remainder = Math.floor(amount % 1000);
    const paise = Math.round((amount % 1) * 100);

    if (crores > 0) {
      result += convertLessThanThousand(crores) + ' Crore ';
    }
    if (lakhs > 0) {
      result += convertLessThanThousand(lakhs) + ' Lakh ';
    }
    if (thousands > 0) {
      result += convertLessThanThousand(thousands) + ' Thousand ';
    }
    if (remainder > 0) {
      result += convertLessThanThousand(remainder);
    }

    result += ' Rupees';

    if (paise > 0) {
      result += ' and ' + convertLessThanThousand(paise) + ' Paise';
    }

    return result.trim();
  }

  private formatIndianNumber(num: number | null | undefined): string {
    if (num === null || num === undefined) return '0.00';
    try {
      const numStr = Math.abs(num).toFixed(2);
      const parts = numStr.split('.');
      const integerPart = parts[0];
      const decimalPart = parts[1];
      
      // Format integer part with Indian numbering system
      let formattedInteger = '';
      const length = integerPart.length;
      
      for (let i = 0; i < length; i++) {
        if (i === 0) {
          formattedInteger = integerPart[length - 1 - i];
        } else if (i === 1 || i === 2) {
          formattedInteger = integerPart[length - 1 - i] + formattedInteger;
        } else if ((i - 2) % 2 === 1) {
          formattedInteger = integerPart[length - 1 - i] + ',' + formattedInteger;
        } else {
          formattedInteger = integerPart[length - 1 - i] + formattedInteger;
        }
      }

      return `${num < 0 ? '-' : ''}${formattedInteger}.${decimalPart}`;
    } catch (error) {
      console.error('Error formatting number:', error);
      return '0.00';
    }
  }

  private formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return '₹0.00';
    try {
      return `₹${this.formatIndianNumber(amount)}`;
    } catch (error) {
      console.error('Error formatting currency:', error);
      return `₹0.00`;
    }
  }

  private formatDate(date: string | Date): string {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return String(date);
    }
  }

  private processTemplateData(data: PDFGenerationData) {

    // Process vendor address correctly
    const vendor = {
      ...data.vendor,
      name: data.vendor.name || '',
      address: data.vendor.address || '',
      gstin: data.vendor.gstin || ''
    };

    // Process items to ensure all required fields
    const processedItems = data.items.map(item => ({
      ...item,
      item: {
        ...item.item,
        name: item.item.name || '',
        description: item.item.description || '',
        uom: item.item.uom || 'Units'
      },
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      totalAmount: Number(item.totalAmount) || (Number(item.quantity) * Number(item.unitPrice))
    }));

    // Calculate totals if not provided
    const additionalChargesTotal = (data.additionalCharges || [])
      .reduce((sum, charge) => sum + (Number(charge.amount) || 0), 0);
    const itemsTotal = processedItems.reduce((sum, item) => sum + item.totalAmount, 0);
    const baseAmount = itemsTotal + additionalChargesTotal;
    const taxAmount = data.taxAmount;
    const totalAmount = data.totalAmount || (baseAmount + taxAmount);

    return {
      ...data,
      vendor,
      items: processedItems,
      baseAmount,
      taxAmount,
      totalAmount,
      additionalCharges: data.additionalCharges || [],
    };
  }

  private async generateHTML(data: PDFGenerationData): Promise<string> {
    try {
      // Check if template path exists
      try {
        await fs.access(this.templatePath);
      } catch (err: any) {
        console.error(`Template file not found at path: ${this.templatePath}`);
        throw new Error(`Template file not found: ${err.message}`);
      }

      const templateContent = await fs.readFile(this.templatePath, 'utf-8');

      console.log('Template content loaded successfully.');
      
      // Process data before template compilation
      const processedData = this.processTemplateData(data);
      
      // Compile template
      try {
        const template = handlebars.compile(templateContent);
        const result = template(processedData);
        console.log('Template compiled successfully.', result);
        return result;
      } catch (compileError: any) {
        console.error('Template compilation error:', compileError);
        console.error('Data causing compilation error:', JSON.stringify(processedData, null, 2));
        throw new Error(`Failed to compile template: ${compileError.message}`);
      }
    } catch (error) {
      console.error('HTML Generation Error:', error);
      throw new Error('Failed to generate HTML template: ' + 
        (error instanceof Error ? error.message : String(error)));
    }
  }

  private async generatePDF(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      const pdfArray = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '12mm',
          right: '12mm',
          bottom: '12mm',
          left: '12mm'
        },
        preferCSSPageSize: true
      });

      return Buffer.from(pdfArray);
    } finally {
      await browser.close();
    }
  }

  public async generatePurchaseOrderPDF(data: PDFGenerationData): Promise<Buffer> {
    try {
      const html = await this.generateHTML(data);
      return await this.generatePDF(html);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      throw error;
    }
  }

  public async generateAndUploadPurchaseOrder(data: PDFGenerationData): Promise<{ url: string; hash: string }> {
    try {
      const pdfBuffer = await this.generatePurchaseOrderPDF(data);
      const hash = createHash('sha256').update(pdfBuffer).digest('hex');
      const fileName = `purchase-orders/${data.poNumber}_${Date.now()}.pdf`;
      const url = await this.s3Service.uploadFile(fileName, pdfBuffer, 'application/pdf');
      console.log("url is ", url);
      return { url, hash };
    } catch (error) {
      console.error('PDF Generation Error:', error);
      // More detailed error information
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      throw new Error('Failed to generate and upload purchase order PDF: ' + 
        (error instanceof Error ? error.message : String(error)));
    }
  }
}