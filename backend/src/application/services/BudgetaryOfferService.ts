import { PrismaBudgetaryOfferRepository } from '../../infrastructure/persistence/repositories/PrismaBudgetaryOfferRepository';
import { CreateBudgetaryOfferDto } from '../dtos/budgetaryOffer/CreateBudgetaryOfferDto';
import { UpdateBudgetaryOfferDto } from '../dtos/budgetaryOffer/UpdateBudgetaryOfferDto';
import { Result, ResultUtils } from '../../shared/types/common.types';
import { BudgetaryOffer, ApprovalAction, WorkItem } from '../../domain/entities/BudgetaryOffer';
import { BudgetaryOfferValidator } from '../validators/budgetaryOffer.validator';
import { BudgetaryOfferData, PDFService } from '../../infrastructure/services/PDFService';
import { DocumentVerifierService } from '../../infrastructure/services/DocumentVerificationService';
import { EmailService } from '../../infrastructure/services/EmailService';
import { EmailLog, EmailStatus } from '../../domain/entities/EmailLog';
import { TokenService } from '../../infrastructure/services/TokenService';
import { UserRole } from '../../domain/entities/User';
import { JsonValue } from '@prisma/client/runtime/library';

interface DocumentData {
  id: string;
  offerId: string;
  offerDate: Date;
  toAuthority: string;
  subject: string;
  workItems: WorkItem[];
  termsConditions: string;
  status: string;
  createdBy: {
    name: string;
    department: string;
    role: UserRole;
  };
  tags: string[];
}

export class BudgetaryOfferService {
  constructor(
    private repository: PrismaBudgetaryOfferRepository,
    private validator: BudgetaryOfferValidator,
    private pdfService: PDFService,
    private documentVerifier: DocumentVerifierService,
    private emailService: EmailService,
    private tokenService: TokenService
  ) { }

  private convertToBudgetaryOffer(data: any): BudgetaryOffer {
    return {
      id: data.id,
      offerId: data.offerId,
      offerDate: new Date(data.offerDate),
      toAuthority: data.toAuthority,
      subject: data.subject,
      workItems: Array.isArray(data.workItems)
        ? data.workItems.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unitOfMeasurement: item.unitOfMeasurement,
          baseRate: item.baseRate,
          taxRate: item.taxRate
        }))
        : [],
      termsConditions: data.termsConditions,
      status: data.status,
      createdById: data.createdById,
      approverId: data.approverId,
      tags: data.tags,
      documentUrl: data.documentUrl,
      documentHash: data.documentHash,
      approvalComments: data.approvalComments,
      approvalHistory: Array.isArray(data.approvalHistory) ? data.approvalHistory : [],
      emailLogs: data.emailLogs,
      customerId: data.customerId || '',
    };
  }
  async sendOfferByEmail(params: {
    offerId: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    content: string;
  }): Promise<Result<{ success: boolean; messageId?: string }>> {
    try {
      // --- Validate Input ---
      if (!params.offerId || !Array.isArray(params.to) || params.to.length === 0) {
        return ResultUtils.fail('Invalid request: offerId and recipients are required.');
      }
      if (!params.subject?.trim()) {
        return ResultUtils.fail('Email subject is required.');
      }
      if (!params.content?.trim()) {
        return ResultUtils.fail('Email content is required.');
      }

      // --- Fetch offer details ---
      let offer;
      try {
        offer = await this.repository.findById(params.offerId);
      } catch (dbError) {
        console.error('Database error while fetching offer:', dbError);
        return ResultUtils.fail('Database error while fetching offer. Please try again later.');
      }

      if (!offer) {
        return ResultUtils.fail('Budgetary offer not found.');
      }

      if (!offer.createdBy) {
        return ResultUtils.fail('Creator details are missing for this offer.');
      }

      // --- Parse work items safely ---
      let workItems;
      try {
        workItems = typeof offer.workItems === 'string'
          ? JSON.parse(offer.workItems)
          : offer.workItems;
      } catch (parseError) {
        console.error('Error parsing workItems JSON:', parseError);
        workItems = []; // fallback
      }

      // --- Prepare document data ---
      const documentData = {
        id: offer.id,
        offerId: offer.offerId,
        offerDate: offer.offerDate,
        toAuthority: offer.toAuthority,
        subject: offer.subject,
        workItems,
        termsConditions: offer.termsConditions,
        status: offer.status,
        createdBy: {
          name: offer.createdBy.name,
          department: offer.createdBy.department || 'N/A',
          role: offer.createdBy.role
        },
        tags: offer.tags || [],
        customerId: offer.customerId || '',
      };

      // --- Send Email ---
      let emailResult;
      try {
        emailResult = await this.emailService.sendBudgetaryOfferEmail({
          to: params.to,
          cc: params.cc,
          bcc: params.bcc,
          subject: params.subject,
          html: params.content,
          offerData: documentData as BudgetaryOfferData
        });
      } catch (emailError) {
        console.error('Email service error:', emailError);
        return ResultUtils.fail('Email service failed. Please check configuration or try again.');
      }

      if (!emailResult || !emailResult.success) {
        const reason = emailResult?.error || 'Unknown email sending failure.';
        console.warn('Email sending failed:', reason);
        return ResultUtils.fail(`Failed to send email: ${reason}`);
      }

      // --- Log email attempt ---
      try {
        await this.repository.logEmail({
          budgetaryOfferId: params.offerId,
          to: params.to,
          cc: params.cc || [],
          bcc: params.bcc || [],
          subject: params.subject,
          content: params.content,
          messageId: emailResult.messageId,
          status: EmailStatus.SENT
        });
      } catch (logError) {
        console.error('Error logging email attempt:', logError);
        // Don’t fail the request just because logging failed
      }

      // --- Success ---
      return ResultUtils.ok({
        success: true,
        messageId: emailResult.messageId
      });
    } catch (error) {
      // --- Global Fallback ---
      console.error('Unexpected error in sendOfferByEmail:', error);

      let message = 'An unexpected error occurred while processing your request.';
      if (error instanceof Error) message += ` ${error.message}`;

      return ResultUtils.fail(message);
    }
  }

  async getEmailLogs(
    offerId: string,
    params?: {
      page?: number;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      status?: EmailStatus;
    }
  ): Promise<Result<{ logs: EmailLog[]; total: number; pages: number }>> {
    try {
      // --- 1️⃣ Validate Input ---
      if (!offerId || typeof offerId !== 'string') {
        return ResultUtils.fail('Invalid offer ID provided.');
      }

      // Validate pagination parameters
      const page = Math.max(1, Number(params?.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(params?.limit) || 10)); // max limit = 100
      const skip = (page - 1) * limit;

      // Validate date range if provided
      if (params?.startDate && params?.endDate) {
        if (params.startDate > params.endDate) {
          return ResultUtils.fail('Start date cannot be after end date.');
        }
      }

      // --- 2️⃣ Verify Offer Exists ---
      let offer;
      try {
        offer = await this.repository.findById(offerId);
      } catch (dbError) {
        console.error('Database error while fetching offer:', dbError);
        return ResultUtils.fail('Database error while verifying offer existence.');
      }

      if (!offer) {
        return ResultUtils.fail('Budgetary offer not found.');
      }

      // --- 3️⃣ Fetch Logs with Pagination ---
      let logs: EmailLog[] = [];
      try {
        logs = await this.repository.getEmailLogs(offerId, {
          skip,
          take: limit,
          startDate: params?.startDate,
          endDate: params?.endDate,
          status: params?.status,
        });
      } catch (logError) {
        console.error('Error fetching email logs from DB:', logError);
        return ResultUtils.fail('Database error while fetching email logs.');
      }

      // --- 4️⃣ Count Total Logs ---
      let total = 0;
      try {
        total = await this.repository.countEmailLogs(offerId, {
          startDate: params?.startDate,
          endDate: params?.endDate,
          status: params?.status,
        });
      } catch (countError) {
        console.error('Error counting email logs:', countError);
        // Even if count fails, return partial logs for user
        return ResultUtils.ok({
          logs,
          total: logs.length,
          pages: 1,
        });
      }

      // --- 5️⃣ Return Successful Result ---
      return ResultUtils.ok({
        logs,
        total,
        pages: Math.ceil(total / limit) || 1,
      });
    } catch (error) {
      // --- 6️⃣ Catch Unexpected Runtime Errors ---
      console.error('Unexpected error in getEmailLogs:', error);

      let message = 'An unexpected error occurred while fetching email logs.';
      if (error instanceof Error) message += ` ${error.message}`;

      return ResultUtils.fail(message);
    }
  }

  // import { JsonValue } from '@prisma/client/runtime/library'; // ✅ Import this at the top

  async approveOffer(
    id: string,
    userId: string,
    comments?: string
  ): Promise<Result<BudgetaryOffer>> {
    try {
      // --- 1️⃣ Input Validation ---
      if (!id || !userId) {
        return ResultUtils.fail('Offer ID and user ID are required for approval.');
      }

      // --- 2️⃣ Fetch Offer Safely ---
      let offerResult;
      try {
        offerResult = await this.repository.findById(id);
      } catch (dbError) {
        console.error('Database error while fetching offer:', dbError);
        return ResultUtils.fail('Database error while fetching offer.');
      }

      if (!offerResult) {
        return ResultUtils.fail('Budgetary offer not found.');
      }

      // --- 3️⃣ Business Rules ---
      if (offerResult.status !== 'PENDING_APPROVAL') {
        return ResultUtils.fail('Only PENDING_APPROVAL offers can be approved.');
      }

      if (offerResult.approverId && offerResult.approverId !== userId) {
        return ResultUtils.fail('Only the assigned approver can approve this offer.');
      }

      // --- 4️⃣ Construct Approval Action (proper Date type) ---
      const approvalAction: ApprovalAction = {
        actionType: 'APPROVE',
        userId,
        timestamp: new Date(), // ✅ use Date instead of string
        comments: comments || 'No comments provided.',
        previousStatus: offerResult.status,
        newStatus: 'APPROVED',
      };

      const now = new Date();
      const currentHistory: ApprovalAction[] = Array.isArray(offerResult.approvalHistory)
        ? (offerResult.approvalHistory as unknown as ApprovalAction[])
        : [];

      // --- 5️⃣ Update Offer Status ---
      let updatedOffer;
      try {
        updatedOffer = await this.repository.update(id, {
          status: 'APPROVED',
          approverId: userId,
          approvalComments: comments,
          approvalDate: now,
          approvalHistory: [...currentHistory, approvalAction] as ApprovalAction[],
        });
      } catch (updateError) {
        console.error('Error updating offer to APPROVED:', updateError);
        return ResultUtils.fail('Failed to update offer status during approval.');
      }

      // --- 6️⃣ Generate PDF ---
      let pdfResult;
      try {
        pdfResult = await this.generatePDF(id);
      } catch (pdfError) {
        console.error('Error during PDF generation:', pdfError);
        return ResultUtils.fail('PDF generation service failed.');
      }

      if (!pdfResult?.isSuccess || !pdfResult?.data) {
        return ResultUtils.fail('Failed to generate approved document.');
      }

      // --- 7️⃣ Update Offer with PDF URL and Hash ---
      try {
        await this.repository.update(id, {
          documentUrl: pdfResult.data.url,
          documentHash: pdfResult.data.hash,
        });
      } catch (pdfUpdateError) {
        console.error('Error updating offer with PDF URL/hash:', pdfUpdateError);
        // Non-critical — log only
      }

      // --- 8️⃣ Return Result ---
      return ResultUtils.ok(this.convertToBudgetaryOffer(updatedOffer));
    } catch (error) {
      console.error('Unexpected error in approveOffer:', error);
      return ResultUtils.fail(
        'Failed to approve offer: ' +
        (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }



  async rejectOffer(
    id: string,
    userId: string,
    comments?: string
  ): Promise<Result<BudgetaryOffer>> {
    try {
      // --- 1️⃣ Input Validation ---
      if (!id || !userId) {
        return ResultUtils.fail('Offer ID and user ID are required for rejection.');
      }

      // --- 2️⃣ Fetch Offer ---
      let offerResult;
      try {
        offerResult = await this.repository.findById(id);
      } catch (dbError) {
        console.error('Database error while fetching offer:', dbError);
        return ResultUtils.fail('Database error while fetching offer.');
      }

      if (!offerResult) {
        return ResultUtils.fail('Budgetary offer not found.');
      }

      // --- 3️⃣ Business Rules ---
      if (offerResult.status !== 'PENDING_APPROVAL') {
        return ResultUtils.fail('Only PENDING_APPROVAL offers can be rejected.');
      }

      if (offerResult.approverId && offerResult.approverId !== userId) {
        return ResultUtils.fail('Only the assigned approver can reject this offer.');
      }

      // --- 4️⃣ Build Rejection Action ---
      const approvalAction: ApprovalAction = {
        actionType: 'REJECT',
        userId,
        // use Date object for consistency with approveOffer's ApprovalAction
        timestamp: new Date(),
        comments: comments || 'No comments provided.',
        previousStatus: offerResult.status,
        newStatus: 'REJECTED',
      };

      const now = new Date();
      const currentHistory: ApprovalAction[] = Array.isArray(offerResult.approvalHistory)
        ? (offerResult.approvalHistory as unknown as ApprovalAction[])
        : [];

      // --- 5️⃣ Update Offer ---
      let updatedOffer;
      try {
        updatedOffer = await this.repository.update(id, {
          status: 'REJECTED',
          approverId: userId,
          approvalComments: comments,
          approvalDate: now,
          approvalHistory: [...currentHistory, approvalAction] as ApprovalAction[],
        });
      } catch (updateError) {
        console.error('Error updating offer to REJECTED:', updateError);
        return ResultUtils.fail('Failed to update offer status during rejection.');
      }

      // --- 6️⃣ Return Final Offer ---
      return ResultUtils.ok(this.convertToBudgetaryOffer(updatedOffer));
    } catch (error) {
      console.error('Unexpected error in rejectOffer:', error);
      return ResultUtils.fail(
        'Failed to reject offer: ' +
        (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  async createOffer(
    dto: CreateBudgetaryOfferDto,
    userId: string
  ): Promise<Result<BudgetaryOffer>> {
    try {
      // --- 1️⃣ Basic Input Validation ---
      if (!userId || typeof userId !== "string") {
        return ResultUtils.fail("Invalid user: userId is required.");
      }

      if (!dto || typeof dto !== "object") {
        return ResultUtils.fail("Invalid request: offer data (DTO) is required.");
      }

      // --- 2️⃣ DTO Validation ---
      const validation = this.validator.validate(dto);
      if (
        validation &&
        Array.isArray((validation as any).data) &&
        (validation as any).data.length > 0
      ) {
        const errors = (validation as any).data
          .map((err: any) => `${err.field}: ${err.message}`)
          .join(", ");
        return ResultUtils.fail(`Validation failed:\n${errors}`);

      }

      // --- 3️⃣ Business Rule Checks ---
      if (!Array.isArray(dto.workItems) || dto.workItems.length === 0) {
        return ResultUtils.fail("At least one work item is required.");
      }

      if (!dto.subject?.trim()) {
        return ResultUtils.fail("Offer subject cannot be empty.");
      }

      if (!dto.toAuthority?.trim()) {
        return ResultUtils.fail("To Authority must be specified.");
      }

      // --- 4️⃣ Safe Work Item Mapping ---
      const workItems = dto.workItems.map((item: any, index: number) => {
        const description = item?.description?.trim();
        const quantity = Number(item?.quantity) || 0;
        const baseRate = Number(item?.baseRate ?? item?.rate ?? 0);
        const taxRate = Number(item?.taxRate ?? 0);
        const unitOfMeasurement = item?.unitOfMeasurement || item?.unit || "unit";

        if (!description) {
          throw new Error(`Work item #${index + 1} is missing a description.`);
        }

        return { description, quantity, baseRate, taxRate, unitOfMeasurement };
      });

      // --- 5️⃣ Generate Offer ID Safely ---
      const offerId = `BO/${new Date().getFullYear()}/${Math.floor(
        1000 + Math.random() * 9000
      )}`;

      // --- 6️⃣ Create Offer Record ---
      const offer = await this.repository.create({
        offerId,
        offerDate: dto.offerDate ? new Date(dto.offerDate) : new Date(),
        toAuthority: dto.toAuthority.trim(),
        subject: dto.subject.trim(),
        workItems,
        termsConditions: dto.termsConditions || "",
        status: "DRAFT",
        tags: dto.tags || [],
        createdById: userId,
        approverId: dto.approverId ?? undefined,
        documentUrl: "",
        documentHash: "",
        approvalHistory: [] as ApprovalAction[],
        customerId: dto.customerId || "",
      });

      if (!offer) {
        return ResultUtils.fail("Offer creation failed: repository returned no data.");
      }

      // --- 7️⃣ Return Success ---
      return ResultUtils.ok(this.convertToBudgetaryOffer(offer));
    } catch (error) {
      // --- 8️⃣ Error Handling ---
      console.error("Error in createOffer:", error);

      // Normalize message
      let errorMessage = "Unknown error occurred while creating the offer.";
      if (error instanceof Error) errorMessage = error.message;
      else if (typeof error === "string") errorMessage = error;
      else if (typeof error === "object" && error !== null) {
        try {
          errorMessage = JSON.stringify(error);
        } catch {
          errorMessage = "Non-serializable error encountered.";
        }
      }

      // Detect Prisma or known DB errors
      const errorCode =
        typeof error === "object" && error !== null && "code" in error
          ? (error as any).code
          : undefined;

      const prismaDetails =
        errorCode === "P2002"
          ? "Duplicate entry (unique constraint violation)."
          : errorCode === "P2003"
            ? "Invalid foreign key reference."
            : errorCode === "P2025"
              ? "Database record not found."
              : undefined;

      const safeMessage = prismaDetails
        ? `Failed to create budgetary offer: ${prismaDetails}`
        : `Failed to create budgetary offer: ${errorMessage}${errorCode ? ` (code=${errorCode})` : ""
        }`;

      return ResultUtils.fail(safeMessage);
    }
  }

  async updateOffer(id: string, dto: UpdateBudgetaryOfferDto, userId: string): Promise<Result<BudgetaryOffer>> {
    try {
      const existingOffer = await this.repository.findById(id);
      if (!existingOffer) {
        return ResultUtils.fail('Budgetary offer not found');
      }

      // Check if user has permission to update
      if (existingOffer.createdById !== userId && existingOffer.approverId !== userId) {
        return ResultUtils.fail('You do not have permission to update this offer');
      }

      const updatedOffer = await this.repository.update(id, {
        ...dto,
        offerDate: dto.offerDate ? new Date(dto.offerDate) : undefined,
        workItems: dto.workItems?.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitOfMeasurement: item.unit,
          baseRate: item.rate,
          taxRate: 0 // Set appropriate default or get from DTO
        })),
        customerId: dto.customerId,
      });

      return ResultUtils.ok(this.convertToBudgetaryOffer(updatedOffer));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResultUtils.fail('Failed to update budgetary offer: ' + errorMessage);
    }
  }

  async deleteOffer(id: string, userId: string): Promise<Result<void>> {
    try {
      const existingOffer = await this.repository.findById(id);
      if (!existingOffer) {
        return ResultUtils.fail('Budgetary offer not found');
      }

      // Check if user has permission to delete
      if (existingOffer.createdById !== userId) {
        return ResultUtils.fail('You do not have permission to delete this offer');
      }

      await this.repository.delete(id);
      return ResultUtils.ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResultUtils.fail('Failed to delete budgetary offer: ' + errorMessage);
    }
  }

  async getOffer(id: string): Promise<Result<BudgetaryOffer>> {
    try {
      const offer = await this.repository.findById(id);
      if (!offer) {
        return ResultUtils.fail('Budgetary offer not found');
      }

      return ResultUtils.ok(this.convertToBudgetaryOffer(offer));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResultUtils.fail('Failed to fetch budgetary offer: ' + errorMessage);
    }
  }

  async getOffers(params: {
    status?: string;
    createdById?: string;
    approverId?: string;
  }): Promise<Result<{ offers: BudgetaryOffer[]; total: number }>> {
    try {
      const [rawOffers, total] = await Promise.all([
        this.repository.findAll({
          status: params.status,
          createdById: params.createdById,
          approverId: params.approverId
        }),
        this.repository.count({
          status: params.status,
          createdById: params.createdById,
          approverId: params.approverId
        })
      ]);

      return ResultUtils.ok({
        offers: rawOffers.map((offer: any) => this.convertToBudgetaryOffer(offer)),
        total
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResultUtils.fail('Failed to fetch budgetary offers: ' + errorMessage);
    }
  }

  async generatePDF(id: string): Promise<Result<{ url: string; hash: string }>> {
    try {
      const offer = await this.repository.findById(id);
      if (!offer) {
        return ResultUtils.fail('Budgetary offer not found');
      }

      if (!offer.createdBy) {
        return ResultUtils.fail('Creator details not found');
      }

      const documentData = {
        id: offer.id,
        offerId: offer.offerId,
        offerDate: offer.offerDate,
        toAuthority: offer.toAuthority,
        subject: offer.subject,
        workItems: typeof offer.workItems === 'string'
          ? JSON.parse(offer.workItems)
          : offer.workItems,
        termsConditions: offer.termsConditions,
        status: offer.status,
        createdBy: {
          name: offer.createdBy.name,
          department: offer.createdBy.department || 'N/A',
          role: offer.createdBy.role
        },
        tags: offer.tags || [],
        customerId: offer.customerId || '',
      };

      const { url, hash } = await this.pdfService.generateAndUploadBudgetaryOffer(documentData);

      // Update offer with document URL and hash, but preserve existing workItems
      const updatedOffer = await this.repository.update(id, {
        documentUrl: url,
        documentHash: hash,
        workItems: typeof offer.workItems === 'string'
          ? JSON.parse(offer.workItems)
          : (Array.isArray(offer.workItems) ? offer.workItems : [])
      });

      if (!updatedOffer) {
        return ResultUtils.fail('Failed to update offer with document details');
      }

      return ResultUtils.ok({ url, hash });
    } catch (error) {
      console.error('PDF Generation Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return ResultUtils.fail('Failed to generate PDF: ' + errorMessage);
    }
  }

  async verifyDocument(id: string): Promise<Result<{
    isValid: boolean;
    currentHash?: string;
    error?: string;
  }>> {
    try {
      const offer = await this.repository.findById(id);
      if (!offer) {
        return ResultUtils.fail('Budgetary offer not found');
      }

      if (!offer.documentUrl || !offer.documentHash) {
        return ResultUtils.fail('Document or hash not found');
      }

      const verificationResult = await this.documentVerifier.verifyDocument(
        offer.documentUrl,
        offer.documentHash
      );

      return ResultUtils.ok(verificationResult);
    } catch (error) {
      console.error('Document verification error:', error);
      return ResultUtils.fail('Failed to verify document: ' +
        (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async handleEmailApproval(token: string, comments: string): Promise<Result<BudgetaryOffer>> {
    console.log('Starting handleEmailApproval with token:', token);

    const tokenData = this.tokenService.verifyApprovalToken(token);
    console.log('Verified token data:', tokenData);

    if (!tokenData) {
      console.log('Token verification failed');
      return ResultUtils.fail('Invalid or expired approval link');
    }

    if (tokenData.action !== 'approve') {
      console.log('Invalid action type:', tokenData.action);
      return ResultUtils.fail('Invalid action type');
    }

    console.log('Proceeding to approve offer with:', {
      offerId: tokenData.poId,
      userId: tokenData.userId
    });

    const approvalResult = await this.approveOffer(tokenData.poId, tokenData.userId, comments);
    console.log('Approval result:', approvalResult);

    return approvalResult;
  }

  async handleEmailRejection(token: string, reason: string): Promise<Result<BudgetaryOffer>> {
    console.log('Starting handleEmailRejection with token:', token);

    const tokenData = this.tokenService.verifyApprovalToken(token);
    console.log('Verified token data:', tokenData);

    if (!tokenData) {
      console.log('Token verification failed');
      return ResultUtils.fail('Invalid or expired rejection link');
    }

    if (tokenData.action !== 'reject') {
      console.log('Invalid action type:', tokenData.action);
      return ResultUtils.fail('Invalid action type');
    }

    console.log('Proceeding to reject offer with:', {
      offerId: tokenData.poId,
      userId: tokenData.userId,
      reason
    });

    const rejectionResult = await this.rejectOffer(tokenData.poId, tokenData.userId, reason);
    console.log('Rejection result:', rejectionResult);

    return rejectionResult;
  }

  async submitForApproval(id: string, userId: string): Promise<Result<BudgetaryOffer>> {
    try {
      const offerResult = await this.repository.findById(id);
      if (!offerResult) {
        return ResultUtils.fail('Budgetary offer not found');
      }

      if (offerResult.createdById !== userId) {
        return ResultUtils.fail('Only the creator can submit the offer for approval');
      }

      if (offerResult.status !== 'DRAFT') {
        return ResultUtils.fail('Only DRAFT offers can be submitted for approval');
      }

      // Check creator's role directly from the offer's createdBy relation
      if (!offerResult.createdBy) {
        return ResultUtils.fail('Creator information not found');
      }

      // Handle admin auto-approval
      if (offerResult.createdBy.role === 'ADMIN') {
        const approvalAction = {
          actionType: 'AUTO_APPROVED',
          userId,
          timestamp: new Date().toISOString(),
          previousStatus: 'DRAFT',
          newStatus: 'APPROVED',
          comments: 'Auto-approved by admin'
        };

        const currentHistory = (offerResult.approvalHistory || []) as any[];

        const updatedOffer = await this.repository.update(id, {
          status: 'APPROVED',
          approvalDate: new Date(),
          approvalComments: 'Auto-approved by admin',
          approvalHistory: [...currentHistory, approvalAction] as any
        });

        // Generate PDF after admin auto-approval
        const pdfResult = await this.generatePDF(id);
        if (!pdfResult.isSuccess || !pdfResult.data) {
          return ResultUtils.fail('Failed to generate approved document');
        }

        // Update offer with the generated PDF URL and hash
        await this.repository.update(id, {
          documentUrl: pdfResult.data.url,
          documentHash: pdfResult.data.hash
        });

        return ResultUtils.ok(this.convertToBudgetaryOffer(updatedOffer));
      }

      // Regular submission process for non-admin users
      // Generate approval tokens
      const approveToken = this.tokenService.generateApprovalToken(
        id,
        offerResult.approverId!,
        'MANAGER',
        offerResult.approver?.email || '',
        'approve'
      );

      const rejectToken = this.tokenService.generateApprovalToken(
        id,
        offerResult.approverId!,
        'MANAGER',
        offerResult.approver?.email || '',
        'reject'
      );

      // Create approval URLs
      const baseUrl = process.env.BASE_URL || 'https://client.prossimatech.com';
      const approveUrl = `${baseUrl}/api/budgetary-offers/email-approve/${approveToken}`;
      const rejectUrl = `${baseUrl}/api/budgetary-offers/email-reject/${rejectToken}`;

      const approvalAction = {
        actionType: 'SUBMIT',
        userId,
        timestamp: new Date().toISOString(),
        previousStatus: 'DRAFT',
        newStatus: 'PENDING_APPROVAL'
      };

      const currentHistory = (offerResult.approvalHistory || []) as any[];

      const updatedOffer = await this.repository.update(id, {
        status: 'PENDING_APPROVAL',
        approvalHistory: [...currentHistory, approvalAction] as any
      });

      // Send email notification to approver only for non-admin submissions
      if (offerResult.approver?.email) {
        try {
          const documentData: BudgetaryOfferData = {
            id: updatedOffer.id,
            offerId: updatedOffer.offerId,
            offerDate: updatedOffer.offerDate,
            toAuthority: updatedOffer.toAuthority,
            subject: updatedOffer.subject,
            workItems: typeof updatedOffer.workItems === 'string'
              ? JSON.parse(updatedOffer.workItems)
              : updatedOffer.workItems,
            termsConditions: updatedOffer.termsConditions,
            status: updatedOffer.status,
            createdBy: {
              name: offerResult.createdBy?.name || 'Unknown',
              department: offerResult.createdBy?.department || 'N/A',
              role: (offerResult.createdBy?.role as UserRole) || UserRole.STAFF
            },
            tags: updatedOffer.tags || [],
            customerId: updatedOffer.customerId || '',
          };

          await this.emailService.sendBudgetaryOfferApproveEmail({
            to: [offerResult.approver.email],
            subject: `Budgetary Offer ${updatedOffer.offerId} - Approval Required`,
            html: '',
            offerData: documentData,
            type: 'SUBMIT',
            approveUrl,
            rejectUrl
          });
        } catch (emailError) {
          console.error('Failed to send approval notification email:', emailError);
        }
      }

      return ResultUtils.ok(this.convertToBudgetaryOffer(updatedOffer));
    } catch (error) {
      return ResultUtils.fail('Failed to submit offer for approval: ' +
        (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // async findByTags(tags: string[]): Promise<Result<BudgetaryOffer[]>> {
  //   try {
  //     const offers = await this.repository.findByTags(tags);
  //     return ResultUtils.ok(offers.map((offer: any) => this.convertToBudgetaryOffer(offer)));
  //   } catch (error) {
  //     const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  //     return ResultUtils.fail('Failed to fetch offers by tags: ' + errorMessage);
  //   }
  // }


}