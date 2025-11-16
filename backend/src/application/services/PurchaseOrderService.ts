// application/services/PurchaseOrderService.ts
import { PrismaPurchaseOrderRepository } from '../../infrastructure/persistence/repositories/PrismaPurchaseOrderRepository';
import { PrismaVendorItemRepository } from '../../infrastructure/persistence/repositories/PrismaVendorItemRepository';
import { PrismaLoaRepository } from '../../infrastructure/persistence/repositories/PrismaLoaRepository';
import { S3Service } from '../../infrastructure/services/S3Service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from '../dtos/purchaseOrder/PurchaseOrderDto';
import { ApprovalAction, POStatus } from '../../domain/entities/constants';
import { Result, ResultUtils } from '../../shared/types/common.types';
import { PurchaseOrderValidator } from '../validators/purchaseOrder.validator';
import { AppError } from '../../shared/errors/AppError';

import { POPDFService } from '../../infrastructure/services/POPdfService';
import { DocumentVerifierService } from '../../infrastructure/services/DocumentVerificationService';
import { PDFGenerationData, PurchaseOrder } from '../../domain/entities/PurchaseOrder';
import { EmailService } from '../../infrastructure/services/EmailService';
import { TokenService } from '../../infrastructure/services/TokenService';

export class PurchaseOrderService {
  private validator: PurchaseOrderValidator;

  constructor(
    private repository: PrismaPurchaseOrderRepository,
    private vendorItemRepository: PrismaVendorItemRepository,
    private loaRepository: PrismaLoaRepository,
    private storageService: S3Service,
    private pdfService: POPDFService,
    private documentVerifier: DocumentVerifierService,
    private emailService: EmailService,
    private tokenService: TokenService
  ) {
    this.validator = new PurchaseOrderValidator();
  }

  async createPurchaseOrder(dto: CreatePurchaseOrderDto, userId: string): Promise<Result<any>> {
    try {

      // Validate input
      const validationResult = this.validator.validate(dto);
      if (!validationResult.isSuccess || (validationResult.data && validationResult.data.length > 0)) {
        return ResultUtils.fail('Validation failed', validationResult.data);
      }

      // Check LOA exists and has sufficient value
      const loa = await this.loaRepository.findById(dto.loaId);
      if (!loa) {
        return ResultUtils.fail('LOA not found');
      }

      // Validate and process items
      const itemsResult = await this.validateItems(dto.vendorId, dto.items);
      if (!itemsResult.isSuccess) {
        return ResultUtils.fail('Failed to validate items', itemsResult.error as any);
      }

      // Generate PO number
      const poNumber = await this.generatePoNumber();

      // Handle document upload if provided
      let documentUrl: string | undefined;
      if (dto.documentFile) {
        const fileName = `purchase-orders/${poNumber}_${Date.now()}_${dto.documentFile.originalname}`;
        documentUrl = await this.storageService.uploadFile(
          fileName,
          dto.documentFile.buffer,
          dto.documentFile.mimetype
        );
      }

      // Calculate base amount from items
      const baseAmount = itemsResult.data!.reduce((total, item) => {
        return total + (item.quantity * item.unitPrice);
      }, 0);

      // Calculate additional charges total
      const additionalChargesTotal = dto.additionalCharges?.reduce((total, charge) => {
        return total + charge.amount;
      }, 0) || 0;

      // Calculate final total amount
      const totalAmount = baseAmount + dto.taxAmount + additionalChargesTotal;

      // Create PO

      const po = await this.repository.create({
        poNumber,
        loaId: dto.loaId,
        vendorId: dto.vendorId,
        items: itemsResult.data!.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalAmount: item.quantity * item.unitPrice,
          // taxRate: item.taxRates?.igst + item.taxRates?.sgst + item.taxRates?.ugst
        })),
        siteId: loa.siteId,
        baseAmount: baseAmount,
        taxAmount: dto.taxAmount,
        additionalCharges: dto.additionalCharges || [],
        totalAmount: totalAmount,
        requirementDesc: dto.requirementDesc,
        termsConditions: dto.termsConditions,
        shipToAddress: dto.shipToAddress,
        notes: dto.notes,
        documentUrl,
        status: POStatus.DRAFT,
        createdById: userId,
        approverId: dto.approverId,
        tags: dto.tags || []
      });

      // Generate PDF after admin auto-approval
      const pdfResult = await this.generatePDF(po.id);
      if (!pdfResult.isSuccess || !pdfResult.data) {
        console.error('PDF generation failed:', {
          error: pdfResult.error,
          isSuccess: pdfResult.isSuccess,
          hasData: !!pdfResult.data
        });
        return ResultUtils.fail(`Failed to generate approved document: ${pdfResult.error || 'Unknown error'}`);
      }

      // Update PO with the generated PDF URL and hash
      await this.repository.update(po.id, {
        documentUrl: pdfResult.data.url,
        documentHash: pdfResult.data.hash
      });

      return ResultUtils.ok(po);
    } catch (error) {
      console.error('PO Creation Error:', error);
      throw new AppError('Failed to create purchase order');
    }
  }

  async updatePurchaseOrder(id: string, dto: UpdatePurchaseOrderDto, userId: string): Promise<Result<any>> {
    try {
      const po = await this.repository.findById(id);
      if (!po) {
        return ResultUtils.fail('Purchase order not found');
      }

      // Only creator or approver can update
      if (po.createdById !== userId && po.approverId !== userId) {
        return ResultUtils.fail('You do not have permission to update this purchase order');
      }

      // Can't update if already approved/rejected
      if (po.status === POStatus.APPROVED || po.status === POStatus.REJECTED) {
        return ResultUtils.fail('Cannot update approved or rejected purchase order');
      }

      let documentUrl = po.documentUrl;
      let documentHash = po.documentHash;

      if (dto.documentFile) {
        // Delete old document if exists
        if (po.documentUrl) {
          const fileKey = this.extractFileKeyFromUrl(po.documentUrl);
          await this.storageService.deleteFile(fileKey);
        }

        const fileName = `purchase-orders/${po.poNumber}_${Date.now()}_${dto.documentFile.originalname}`;
        documentUrl = await this.storageService.uploadFile(
          fileName,
          dto.documentFile.buffer,
          dto.documentFile.mimetype
        );
        // Clear the hash since this is a new uploaded document
        documentHash = undefined;
      }

      // If updating amounts or additional charges, recalculate total
      if (dto.baseAmount !== undefined || dto.taxAmount !== undefined || dto.additionalCharges !== undefined) {
        const currentPO = await this.repository.findById(id);
        if (!currentPO) {
          return ResultUtils.fail('Purchase order not found');
        }

        const baseAmount = dto.baseAmount ?? currentPO.baseAmount;
        const taxAmount = dto.taxAmount ?? currentPO.taxAmount;
        const additionalCharges = dto.additionalCharges ?? currentPO.additionalCharges;

        const additionalChargesTotal = additionalCharges.reduce((total, charge) => {
          return total + charge.amount;
        }, 0);

        dto.totalAmount = baseAmount + taxAmount + additionalChargesTotal;
      }

      const updatedPo = await this.repository.update(id, {
        ...dto,
        documentUrl,
        documentHash
      });

      return ResultUtils.ok(updatedPo);
    } catch (error) {
      console.error('PO Update Error:', error);
      throw new AppError('Failed to update purchase order');
    }
  }
  async deletePurchaseOrder(id: string, userId: string): Promise<void> {
    try {
      // 1️⃣ Validate existence
      const po = await this.repository.findById(id);
      if (!po) {
        throw new AppError('The requested purchase order does not exist or may have already been deleted.', 404);
      }

      // 2️⃣ Permission check
      if (po.createdById !== userId) {
        throw new AppError('You do not have permission to delete this purchase order. Only the creator can delete it.', 403);
      }

      // 3️⃣ Cannot delete approved PO
      if (po.status === POStatus.APPROVED) {
        throw new AppError('This purchase order has already been approved and cannot be deleted.', 400);
      }

      // 4️⃣ Attempt to delete related file if exists
      if (po.documentUrl) {
        try {
          const fileKey = this.extractFileKeyFromUrl(po.documentUrl);
          await this.storageService.deleteFile(fileKey);
        } catch (fileErr: any) {
          console.error('❌ Storage deletion failed:', { error: fileErr });
          throw new AppError('Failed to remove the attached document from storage. Please try again.', 500);
        }
      }

      // 5️⃣ Attempt DB deletion
      try {
        await this.repository.delete(id);
      } catch (dbErr: any) {
        console.error('❌ Database deletion error:', dbErr);

        const msg = dbErr?.message?.toLowerCase() || '';

        if (msg.includes('foreign key') || msg.includes('constraint')) {
          throw new AppError(
            'This purchase order has related items or linked records and cannot be deleted. Remove dependent data first.',
            409
          );
        }

        throw new AppError(
          'Failed to delete the purchase order due to a database error. Please try again.',
          500
        );
      }

    } catch (error: any) {

      // if error is already AppError, forward it
      if (error instanceof AppError) {
        throw error;
      }

      // unexpected — convert to safe AppError
      console.error('🔥 Unexpected deletion failure:', {
        poId: id,
        userId,
        error: error?.message || error
      });

      throw new AppError(
        'An unexpected error occurred while deleting the purchase order. Please retry or contact support.',
        500
      );
    }
  }

  async getPurchaseOrder(id: string): Promise<Result<any>> {
    try {
      const po = await this.repository.findById(id);
      if (!po) {
        return ResultUtils.fail('Purchase order not found');
      }

      return ResultUtils.ok(po);
    } catch (error) {
      console.error('PO Fetch Error:', error);
      throw new AppError('Failed to fetch purchase order');
    }
  }

  async getAllPurchaseOrders(params: {
    status?: POStatus;
    vendorId?: string;
    loaId?: string;
    createdById?: string;
    approverId?: string;
    searchTerm?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Result<{ purchaseOrders: any[]; total: number; page: number; limit: number; totalPages: number }>> {
    try {
      // Default pagination values
      const page = params.page || 1;
      const limit = params.limit || 10;
      const skip = (page - 1) * limit;

      const [pos, total] = await Promise.all([
        this.repository.findAll({
          ...params,
          skip,
          take: limit,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder
        }),
        this.repository.count(params)
      ]);

      const totalPages = Math.ceil(total / limit);

      return ResultUtils.ok({
        purchaseOrders: pos,
        total,
        page,
        limit,
        totalPages
      });
    } catch (error) {
      console.error('POs Fetch Error:', error);
      throw new AppError('Failed to fetch purchase orders');
    }
  }

  async updateStatus(id: string, status: POStatus, userId: string): Promise<Result<any>> {
    try {
      const po = await this.repository.findById(id);
      console.log("the purchase order is", po);
      if (!po) {
        return ResultUtils.fail('Purchase order not found');
      }

      // Only approver can change status
      // added the approver from history incase the po.approverId is null
      const approver = po.approverId || po.approvalHistory[0].userId
      if (po.approvalHistory && approver !== userId) {
        return ResultUtils.fail('You do not have permission to change the status');
      }

      // Can't change status if already approved/rejected
      if (po.status === POStatus.APPROVED || po.status === POStatus.REJECTED) {
        return ResultUtils.fail('Cannot change status of approved or rejected purchase order');
      }

      const updatedPo = await this.repository.update(id, { status });
      return ResultUtils.ok(updatedPo);
    } catch (error) {
      console.error('PO Status Update Error:', error);
      throw new AppError('Failed to update purchase order status');
    }
  }

  private extractFileKeyFromUrl(url: string): string {
    try {
      // The URL will be something like https://bucket.s3.region.amazonaws.com/purchase-orders/filename.pdf
      // or a signed URL with additional parameters
      const urlObj = new URL(url);
      // Remove the leading slash
      return urlObj.pathname.substring(1);
    } catch (error) {
      console.error('Error extracting file key from URL:', error);
      throw new Error('Invalid document URL');
    }
  }

  // async generatePDF(id: string): Promise<Result<{ url: string; hash: string }>> {
  //   try {
  //     const po = await this.repository.findById(id);
  //     if (!po) {
  //       return ResultUtils.fail('Purchase order not found');
  //     }

  //     if (!po.createdBy) {
  //       return ResultUtils.fail('Creator details not found');
  //     }

  //     const documentData: PDFGenerationData = {
  //       id: po.id,
  //       poNumber: po.poNumber,
  //       loaNumber: po.loaId ? (await this.loaRepository.findById(po.loaId))?.loaNumber || '' : '',
  //       createdAt: po.createdAt,
  //       totalAmount: po.totalAmount,
  //       vendor: {
  //         name: po.vendor.name,
  //         email: po.vendor.email,
  //         address: po.vendor.address,
  //         gstin: po.vendor.gstin || '',
  //         mobile: po.vendor.mobile || ''
  //       },
  //       additionalCharges: po.additionalCharges,
  //       items: po.items.map(item => ({
  //         id: item.id,
  //         item: {
  //           id: item.item.id,
  //           name: item.item.name || '',
  //           description: item.item.description || '',
  //           unitPrice: item.unitPrice,
  //           uom: item.item.uom || '',
  //           hsnCode: item.item.hsnCode || ''
  //         },
  //         quantity: item.quantity,
  //         unitPrice: item.unitPrice,
  //         totalAmount: item.totalAmount
  //       })),
  //       requirementDesc: po.requirementDesc,
  //       termsConditions: po.termsConditions,
  //       shipToAddress: po.shipToAddress,
  //       notes: po.notes || '',
  //       baseAmount: po.baseAmount,
  //       taxAmount: po.taxAmount,
  //       createdBy: {
  //         name: po.createdBy.name,
  //         department: po.createdBy.department || 'N/A',
  //       }
  //     };

  //     try {
  //       const { url, hash } = await this.pdfService.generateAndUploadPurchaseOrder(documentData);

  //       // Update PO with document URL and hash
  //       const updatedPo = await this.repository.update(id, {
  //         documentUrl: url,
  //         documentHash: hash
  //       });

  //       if (!updatedPo) {
  //         return ResultUtils.fail('Failed to update purchase order with document details');
  //       }

  //       return ResultUtils.ok({ url, hash });
  //     } catch (pdfError: any) {
  //       console.error('PDF generation error:', pdfError);
  //       console.error('Error details:', {
  //         message: pdfError.message,
  //         stack: pdfError.stack,
  //         name: pdfError.name
  //       });
  //       return ResultUtils.fail(`Failed to generate PDF: ${pdfError.message}`);
  //     }
  //   } catch (error) {
  //     console.error('PDF Generation Error:', error);
  //     const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  //     return ResultUtils.fail('Failed to generate PDF: ' + errorMessage);
  //   }
  // }

  async generatePDF(id: string, overrides: any = {}): Promise<Result<{ url: string; hash: string }>> {
    try {
      const po = await this.repository.findById(id);
      if (!po) return ResultUtils.fail("Purchase order not found");
      if (!po.createdBy) return ResultUtils.fail("Creator details not found");

      // ----------------------------
      // Build Base PDF Data
      // ----------------------------
      const documentData: PDFGenerationData = {
        id: po.id,
        poNumber: po.poNumber,
        loaNumber: po.loaId ? (await this.loaRepository.findById(po.loaId))?.loaNumber || "" : "",
        createdAt: po.createdAt,
        totalAmount: po.totalAmount,
        vendor: {
          name: po.vendor.name,
          email: po.vendor.email,
          address: po.vendor.address,
          gstin: po.vendor.gstin || "",
          mobile: po.vendor.mobile || "",
        },
        additionalCharges: po.additionalCharges,
        items: po.items.map((item) => ({
          id: item.id,
          item: {
            id: item.item.id,
            name: item.item.name || "",
            description: item.item.description || "",
            unitPrice: item.unitPrice,
            uom: item.item.uom || "",
            hsnCode: item.item.hsnCode || "",
          },
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalAmount: item.totalAmount,
        })),
        requirementDesc: po.requirementDesc,
        termsConditions: po.termsConditions,
        shipToAddress: po.shipToAddress,
        notes: po.notes || "",
        baseAmount: po.baseAmount,
        taxAmount: po.taxAmount,
        createdBy: {
          name: po.createdBy.name,
          department: po.createdBy.department || "N/A",
        },
      };

      console.log("🟡 DATA BEFORE MERGE:", documentData);

      // ----------------------------
      // Apply Overrides Correctly
      // ----------------------------
      const finalData: PDFGenerationData = {
        ...documentData,

        // TEXT
        requirementDesc: overrides.requirementDesc ?? documentData.requirementDesc,
        termsConditions: overrides.termsConditions ?? documentData.termsConditions,
        notes: overrides.notes ?? documentData.notes,
        shipToAddress: overrides.shipToAddress ?? documentData.shipToAddress,

        // AMOUNTS
        taxAmount: overrides.taxAmount ?? documentData.taxAmount,
        totalAmount: overrides.totalAmount ?? (
          overrides.baseAmount ?? documentData.baseAmount
        ) + (
            overrides.taxAmount ?? documentData.taxAmount
          ) + (
            (overrides.additionalCharges ?? documentData.additionalCharges)?.reduce((sum: number, c: any) => sum + (c.amount || 0), 0)
          ),

        // Vendor
        vendor: overrides.vendor ?? overrides.vendorOverride ?? documentData.vendor,

        // Items
        items: overrides.items ?? overrides.itemsOverride ?? documentData.items,

        // Charges
        additionalCharges: overrides.additionalCharges ?? overrides.chargesOverride ?? documentData.additionalCharges,
      };


      console.log("🟢 FINAL DATA SENT TO PDF:", finalData);

      // ----------------------------
      // Generate and Upload PDF
      // ----------------------------
      const { url, hash } = await this.pdfService.generateAndUploadPurchaseOrder(finalData);

      const updatedPo = await this.repository.update(id, {
        documentUrl: url,
        documentHash: hash,
      });

      console.log("🟣 Updated PO:", updatedPo);
      console.log("🔵 Generated PDF URL:", url);

      return ResultUtils.ok({ url, hash });
    } catch (err: any) {
      console.error("❌ PDF Generation Error:", err);
      return ResultUtils.fail(`Failed to generate PDF: ${err.message}`);
    }
  }


  async updateDocumentFields(
    id: string,
    payload: {
      requirementDesc: string;
      termsConditions: string;
      notes: string;
      shipToAddress: string;
    }
  ): Promise<Result<any>> {
    try {
      const updated = await this.repository.update(id, payload);

      if (!updated) {
        return ResultUtils.fail("Failed to update document fields");
      }

      return ResultUtils.ok(updated);
    } catch (error: any) {
      return ResultUtils.fail(error.message || "Update failed");
    }
  }



  async verifyDocument(id: string): Promise<Result<{
    isValid: boolean;
    currentHash?: string;
    error?: string;
  }>> {
    try {
      const po = await this.repository.findById(id);
      if (!po) {
        return ResultUtils.fail('Purchase order not found');
      }

      if (!po.documentUrl || !po.documentHash) {
        return ResultUtils.fail('Document or hash not found');
      }

      const verificationResult = await this.documentVerifier.verifyDocument(
        po.documentUrl,
        po.documentHash
      );

      return ResultUtils.ok(verificationResult);
    } catch (error) {
      console.error('Document verification error:', error);
      return ResultUtils.fail('Failed to verify document: ' +
        (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private async generatePoNumber(): Promise<string> {
    const latestPo = await this.repository.findLatestPoNumber();
    const currentYear = new Date().getFullYear();

    if (!latestPo) {
      return `PO/${currentYear}/0001`;
    }

    const [, year, number] = latestPo.split('/');
    if (parseInt(year) === currentYear) {
      const nextNumber = (parseInt(number) + 1).toString().padStart(4, '0');
      return `PO/${currentYear}/${nextNumber}`;
    }

    return `PO/${currentYear}/0001`;
  }

  private async validateItems(vendorId: string, items: CreatePurchaseOrderDto['items']): Promise<Result<Array<{
    itemId: string;
    quantity: number;
    unitPrice: number;
    // taxRates: {
    //   igst: number;
    //   sgst: number;
    //   ugst: number;
    // };
    totalAmount: number;
  }>>> {
    const validatedItems = [];

    for (const item of items) {
      const vendorItem = await this.vendorItemRepository.findByVendorAndItem(vendorId, item.itemId);
      if (!vendorItem) {
        return ResultUtils.fail(`Item ${item.itemId} is not associated with this vendor`);
      }

      // Get vendor-specific price and item tax rates
      // const unitPrice = vendorItem.unitPrice;
      const unitPrice = item.unitPrice;
      // const taxRates = vendorItem.item.taxRates;

      // Calculate total amount including tax
      const baseAmount = item.quantity * unitPrice;
      // const totalTaxRate = (taxRates.igst || 0) + (taxRates.sgst || 0) + (taxRates.ugst || 0);
      const totalAmount = baseAmount;

      validatedItems.push({
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice,
        // taxRates,
        totalAmount
      });
    }

    // Convert tax rates to required format with non-nullable numbers
    const validatedItemsWithNonNullableTaxRates = validatedItems.map(item => ({
      ...item,
      // taxRates: {
      //   igst: item.taxRates.igst || 0,
      //   sgst: item.taxRates.sgst || 0, 
      //   ugst: item.taxRates.ugst || 0
      // }
    }));

    return ResultUtils.ok(validatedItemsWithNonNullableTaxRates);
  }

  private async prepareDocumentData(po: PurchaseOrder): Promise<PDFGenerationData> {
    return {
      id: po.id,
      poNumber: po.poNumber,
      loaNumber: po.loaNumber || '',
      createdAt: po.createdAt,
      totalAmount: po.totalAmount,
      vendor: {
        name: po.vendor.name,
        email: po.vendor.email,
        address: po.vendor.address,
        gstin: po.vendor.gstin || '',
        remarks: po.vendor.remarks || '',
        mobile: po.vendor.mobile || ''
      },
      additionalCharges: po.additionalCharges,
      items: po.items.map(item => ({
        id: item.id,
        item: {
          id: item.item.id,
          name: item.item.name,
          description: item.item.description || '',
          unitPrice: item.unitPrice,
          uom: item.item.uom,
          hsnCode: item.item.hsnCode || ''
        },
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalAmount: item.totalAmount
      })),
      requirementDesc: po.requirementDesc,
      termsConditions: po.termsConditions,
      shipToAddress: po.shipToAddress,
      notes: po.notes || '',
      baseAmount: po.baseAmount,
      taxAmount: po.taxAmount,
      createdBy: {
        name: po.createdBy.name,
        department: po.createdBy.department || 'N/A',
      }
    };
  }

  async submitForApproval(id: string, userId: string): Promise<Result<PurchaseOrder>> {
    try {
      const po = await this.repository.findById(id);
      if (!po) {
        return ResultUtils.fail('Purchase order not found');
      }

      if (po.createdById !== userId) {
        return ResultUtils.fail('Only the creator can submit the order for approval');
      }

      if (po.status !== POStatus.DRAFT) {
        return ResultUtils.fail('Only DRAFT orders can be submitted for approval');
      }

      // Check if creator is admin
      if (!po.createdBy) {
        return ResultUtils.fail('Creator information not found');
      }

      // Handle admin auto-approval
      if (po.createdBy.role === 'ADMIN') {
        const approvalAction = {
          actionType: 'AUTO_APPROVED',
          userId,
          timestamp: new Date().toISOString(),
          previousStatus: POStatus.DRAFT,
          newStatus: POStatus.APPROVED,
          comments: 'Auto-approved by admin'
        };

        const currentHistory = (po.approvalHistory || []) as any[];

        const updatedPO = await this.repository.update(id, {
          status: POStatus.APPROVED,
          // approvalDate: new Date(),
          approvalComments: 'Auto-approved by admin',
          approvalHistory: [...currentHistory, approvalAction] as any
        });

        // Generate PDF after admin auto-approval
        const pdfResult = await this.generatePDF(id);
        if (!pdfResult.isSuccess || !pdfResult.data) {
          console.error('PDF generation failed:', {
            error: pdfResult.error,
            isSuccess: pdfResult.isSuccess,
            hasData: !!pdfResult.data
          });
          return ResultUtils.fail(`Failed to generate approved document: ${pdfResult.error || 'Unknown error'}`);
        }

        // Update PO with the generated PDF URL and hash
        await this.repository.update(id, {
          documentUrl: pdfResult.data.url,
          documentHash: pdfResult.data.hash
        });

        return ResultUtils.ok(updatedPO);
      }

      // Regular submission process for non-admin users
      const approveToken = this.tokenService.generateApprovalToken(
        id,
        po.approverId!,
        po.approver?.role || 'ADMIN',
        po.approver?.email || '',
        'approve'
      );

      const rejectToken = this.tokenService.generateApprovalToken(
        id,
        po.approverId!,
        po.approver?.role || 'ADMIN',
        po.approver?.email || '',
        'reject'
      );

      const baseUrl = process.env.BASE_URL || 'https://client.prossimatech.com';
      const approveUrl = `${baseUrl}/api/purchase-orders/email-approve/${approveToken}`;
      const rejectUrl = `${baseUrl}/api/purchase-orders/email-reject/${rejectToken}`;

      const approvalAction = {
        actionType: 'SUBMIT',
        userId,
        timestamp: new Date().toISOString(),
        previousStatus: POStatus.DRAFT,
        newStatus: POStatus.PENDING_APPROVAL
      };

      const currentHistory = (po.approvalHistory || []) as any[];

      const updatedPO = await this.repository.update(id, {
        status: POStatus.PENDING_APPROVAL,
        approvalHistory: [...currentHistory, approvalAction] as any
      });

      // Send email notification to approver only for non-admin submissions
      if (updatedPO.approver?.email) {
        try {
          const documentData = await this.prepareDocumentData(updatedPO);

          await this.emailService.sendPurchaseOrderApproveEmail({
            to: [updatedPO.approver.email],
            poData: documentData,
            type: 'SUBMIT',
            approveUrl,
            rejectUrl
          });
        } catch (emailError) {
          console.error('Failed to send approval notification email:', emailError);
        }
      }

      return ResultUtils.ok(updatedPO);
    } catch (error) {
      console.error('PO Submit Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError(`Failed to submit purchase order for approval: ${errorMessage}`);
    }
  }

  async approveOrder(id: string, userId: string, comments?: string): Promise<Result<PurchaseOrder>> {
    try {
      const po = await this.repository.findById(id);
      if (!po) {
        return ResultUtils.fail('Purchase order not found');
      }

      if (po.approverId && po.approverId !== userId) {
        return ResultUtils.fail('Only the assigned approver can approve this order');
      }

      if (po.status !== POStatus.PENDING_APPROVAL) {
        return ResultUtils.fail('Only PENDING_APPROVAL orders can be approved');
      }

      const approvalAction: ApprovalAction = {
        actionType: 'APPROVE',
        userId,
        timestamp: new Date().toISOString(),
        comments,
        previousStatus: po.status,
        newStatus: POStatus.APPROVED
      };

      const currentHistory = po.approvalHistory || [];

      const updateData = {
        status: POStatus.APPROVED,
        approverId: userId,
        approvalComments: comments,
        approvalHistory: [...currentHistory, approvalAction]
      };

      const updatedPO = await this.repository.update(id, updateData);

      // Generate PDF after approval
      const pdfResult = await this.generatePDF(id);
      if (!pdfResult.isSuccess || !pdfResult.data) {
        return ResultUtils.fail('Failed to generate approved document');
      }

      // Update PO with the generated PDF URL and hash
      await this.repository.update(id, {
        documentUrl: pdfResult.data.url,
        documentHash: pdfResult.data.hash
      });

      // Send email notification to creator with the newly generated PDF
      if (po.createdBy?.email) {
        try {
          const documentData = await this.prepareDocumentData(updatedPO);
          await this.emailService.sendPurchaseOrderApproveEmail({
            to: [po.createdBy.email],
            poData: documentData,
            type: 'APPROVE',
            comments
          });
        } catch (emailError) {
          console.error('Failed to send approval notification email:', emailError);
        }
      }

      return ResultUtils.ok(updatedPO);
    } catch (error) {
      console.error('PO Approval Error:', error);
      throw new AppError('Failed to approve purchase order');
    }
  }

  async rejectOrder(id: string, userId: string, reason?: string): Promise<Result<PurchaseOrder>> {
    try {
      const po = await this.repository.findById(id);
      if (!po) {
        return ResultUtils.fail('Purchase order not found');
      }

      if (po.approverId && po.approverId !== userId) {
        return ResultUtils.fail('Only the assigned approver can reject this order');
      }

      if (po.status !== POStatus.PENDING_APPROVAL) {
        return ResultUtils.fail('Only PENDING_APPROVAL orders can be rejected');
      }

      const approvalAction: ApprovalAction = {
        actionType: 'REJECT',
        userId,
        timestamp: new Date().toISOString(),
        comments: reason,
        previousStatus: po.status,
        newStatus: POStatus.REJECTED
      };

      const currentHistory = po.approvalHistory || [];

      const updateData = {
        status: POStatus.REJECTED,
        approverId: userId,
        // approvalComments: reason, // Aligned with approval flow
        rejectionReason: reason,  // Keep for backward compatibility if needed
        approvalHistory: [...currentHistory, approvalAction]
      };

      const updatedPO = await this.repository.update(id, updateData);

      // Send rejection email
      if (po.createdBy?.email) {
        try {
          const documentData = await this.prepareDocumentData(updatedPO);
          await this.emailService.sendPurchaseOrderApproveEmail({
            to: [po.createdBy.email],
            poData: documentData,
            type: 'REJECT',
            comments: reason
          });
        } catch (emailError) {
          console.error('Failed to send rejection notification email:', emailError);
        }
      }

      return ResultUtils.ok(updatedPO);
    } catch (error) {
      console.error('PO Rejection Error:', error);
      throw new AppError('Failed to reject purchase order');
    }
  }

  async handleEmailApproval(token: string, p0: string): Promise<Result<PurchaseOrder>> {
    const tokenData = this.tokenService.verifyApprovalToken(token);

    if (!tokenData) {
      return ResultUtils.fail('Invalid or expired approval link');
    }

    if (tokenData.action !== 'approve') {
      return ResultUtils.fail('Invalid action type');
    }

    const approvalResult = await this.approveOrder(tokenData.poId, tokenData.userId);
    return approvalResult;
  }

  async handleEmailRejection(token: string, reason: string): Promise<Result<PurchaseOrder>> {
    const tokenData = this.tokenService.verifyApprovalToken(token);

    if (!tokenData) {
      return ResultUtils.fail('Invalid or expired rejection link');
    }

    if (tokenData.action !== 'reject') {
      return ResultUtils.fail('Invalid action type');
    }

    const rejectionResult = await this.rejectOrder(tokenData.poId, tokenData.userId, reason);
    return rejectionResult;
  }

}