import { Request, Response, NextFunction } from 'express';
import { LoaService } from '../../../application/services/LOAService';
import { BulkImportService } from '../../../application/services/BulkImportService';
import { AppError } from '../../../shared/errors/AppError';

export class LoaController {
  constructor(
    private service: LoaService,
    private bulkImportService: BulkImportService
  ) {}

  createLoa = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse delivery period from string to JSON if needed
      let deliveryPeriod;
      try {
        deliveryPeriod = typeof req.body.deliveryPeriod === 'string'
          ? JSON.parse(req.body.deliveryPeriod)
          : req.body.deliveryPeriod;
      } catch (error) {
        console.error('Error parsing delivery period:', error);
        res.status(400).json({ message: 'Invalid delivery period format' });
        return;
      }

      // Parse tags from string to JSON if needed
      let tags: string[] = [];
      if (req.body.tags) {
        try {
          tags = typeof req.body.tags === 'string'
            ? JSON.parse(req.body.tags)
            : req.body.tags;
        } catch (error) {
          console.error('Error parsing tags:', error);
        }
      }

      // Parse loaValue as number with default value of 0
      const loaValue = req.body.loaValue ? Number(req.body.loaValue) : 0;

      // Process the uploaded files
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Access the document file
      const documentFile = files?.documentFile?.[0];
      const securityDepositFile = files?.securityDepositFile?.[0];
      const performanceGuaranteeFile = files?.performanceGuaranteeFile?.[0];

      // Parse boolean values
      const hasEmd = req.body.hasEmd === 'true' || req.body.hasEmd === true;
      const hasSd = req.body.hasSd === 'true' || req.body.hasSd === true;
      const hasPg = req.body.hasPg === 'true' || req.body.hasPg === true;

      // Parse amount values
      const emdAmount = req.body.emdAmount ? Number(req.body.emdAmount) : undefined;
      const recoverablePending = req.body.recoverablePending ? Number(req.body.recoverablePending) : undefined;
      const paymentPending = req.body.paymentPending ? Number(req.body.paymentPending) : undefined;
      const manualTotalBilled = req.body.manualTotalBilled ? Number(req.body.manualTotalBilled) : undefined;
      const manualTotalReceived = req.body.manualTotalReceived ? Number(req.body.manualTotalReceived) : undefined;
      const manualTotalDeducted = req.body.manualTotalDeducted ? Number(req.body.manualTotalDeducted) : undefined;

      const result = await this.service.createLoa({
        loaNumber: req.body.loaNumber,
        loaValue: loaValue,
        deliveryPeriod: deliveryPeriod,
        workDescription: req.body.workDescription,
        siteId: req.body.siteId,
        tags,
        documentFile,
        // Tender fields
        tenderNo: req.body.tenderNo,
        tenderId: req.body.tenderId,
        orderPOC: req.body.orderPOC,
        pocId: req.body.pocId,
        inspectionAgencyId: req.body.inspectionAgencyId,
        fdBgDetails: req.body.fdBgDetails,
        // Financial fields
        hasEmd,
        emdAmount,
        hasSd,
        sdFdrId: req.body.sdFdrId,
        hasPg,
        pgFdrId: req.body.pgFdrId,
        // Warranty fields
        warrantyPeriodMonths: req.body.warrantyPeriodMonths ? Number(req.body.warrantyPeriodMonths) : undefined,
        warrantyPeriodYears: req.body.warrantyPeriodYears ? Number(req.body.warrantyPeriodYears) : undefined,
        warrantyStartDate: req.body.warrantyStartDate,
        warrantyEndDate: req.body.warrantyEndDate,
        // Pending breakdown fields
        recoverablePending,
        paymentPending,
        // Manual override fields
        manualTotalBilled,
        manualTotalReceived,
        manualTotalDeducted,
        remarks: req.body.remarks,
      });

      if (!result.isSuccess) {
        const statusCode = result.error && Array.isArray(result.error)
          ? 400 // Validation error
          : 500; // Server error

        res.status(statusCode).json({
          message: Array.isArray(result.error)
            ? result.error[0]?.message || 'Validation failed'
            : result.error || 'Failed to create LOA'
        });
        return;
      }

      res.status(201).json(result.data);
    } catch (error) {
      next(error);
    }
  };

  updateLoa = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: 'LOA ID is required' });
        return;
      }

      // Parse delivery period from string to JSON if needed
      let deliveryPeriod = undefined;

      if (req.body.deliveryPeriod) {
        try {
          deliveryPeriod = typeof req.body.deliveryPeriod === 'string'
            ? JSON.parse(req.body.deliveryPeriod)
            : req.body.deliveryPeriod;
        } catch (error) {
          console.error('Error parsing delivery period:', error);
          res.status(400).json({ message: 'Invalid delivery period format' });
          return;
        }
      }

      // Parse tags from string to JSON if needed
      let tags: string[] | undefined = undefined;
      if (req.body.tags) {
        try {
          tags = typeof req.body.tags === 'string'
            ? JSON.parse(req.body.tags)
            : req.body.tags;
        } catch (error) {
          console.error('Error parsing tags:', error);
        }
      }

      // Parse loaValue as number if present
      const loaValue = req.body.loaValue ? Number(req.body.loaValue) : undefined;

      // Process the uploaded files
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Access the document file
      const documentFile = files?.documentFile?.[0];
      const securityDepositFile = files?.securityDepositFile?.[0];
      const performanceGuaranteeFile = files?.performanceGuaranteeFile?.[0];

      // Parse boolean values if present
      const hasEmd = req.body.hasEmd !== undefined ?
        (req.body.hasEmd === 'true' || req.body.hasEmd === true) :
        undefined;
      const hasSd = req.body.hasSd !== undefined ?
        (req.body.hasSd === 'true' || req.body.hasSd === true) :
        undefined;
      const hasPg = req.body.hasPg !== undefined ?
        (req.body.hasPg === 'true' || req.body.hasPg === true) :
        undefined;

      // Parse amount values if present
      const emdAmount = req.body.emdAmount ? Number(req.body.emdAmount) : undefined;
      const recoverablePending = req.body.recoverablePending ? Number(req.body.recoverablePending) : undefined;
      const paymentPending = req.body.paymentPending ? Number(req.body.paymentPending) : undefined;
      const manualTotalBilled = req.body.manualTotalBilled ? Number(req.body.manualTotalBilled) : undefined;
      const manualTotalReceived = req.body.manualTotalReceived ? Number(req.body.manualTotalReceived) : undefined;
      const manualTotalDeducted = req.body.manualTotalDeducted ? Number(req.body.manualTotalDeducted) : undefined;

      const result = await this.service.updateLoa(id, {
        loaNumber: req.body.loaNumber,
        loaValue: loaValue,
        deliveryPeriod,
        workDescription: req.body.workDescription,
        siteId: req.body.siteId,
        tags,
        documentFile,
        status: req.body.status, // Add status field
        // Tender fields
        tenderNo: req.body.tenderNo,
        tenderId: req.body.tenderId,
        orderPOC: req.body.orderPOC,
        pocId: req.body.pocId,
        inspectionAgencyId: req.body.inspectionAgencyId,
        fdBgDetails: req.body.fdBgDetails,
        // Financial fields
        hasEmd,
        emdAmount,
        hasSd,
        sdFdrId: req.body.sdFdrId,
        hasPg,
        pgFdrId: req.body.pgFdrId,
        // Warranty fields
        warrantyPeriodMonths: req.body.warrantyPeriodMonths ? Number(req.body.warrantyPeriodMonths) : undefined,
        warrantyPeriodYears: req.body.warrantyPeriodYears ? Number(req.body.warrantyPeriodYears) : undefined,
        warrantyStartDate: req.body.warrantyStartDate,
        warrantyEndDate: req.body.warrantyEndDate,
        // Pending breakdown fields
        recoverablePending,
        paymentPending,
        // Manual override fields
        manualTotalBilled,
        manualTotalReceived,
        manualTotalDeducted,
        remarks: req.body.remarks,
      });

      if (!result.isSuccess) {
        const statusCode = result.error && Array.isArray(result.error)
          ? 400 // Validation error
          : 500; // Server error

        res.status(statusCode).json({
          message: Array.isArray(result.error)
            ? result.error[0]?.message || 'Validation failed'
            : result.error || 'Failed to update LOA'
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  };
  
  deleteLoa = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.service.deleteLoa(id);

      if (!result.isSuccess) {
        const errorMessage = Array.isArray(result.error) 
          ? result.error[0]?.message || 'Failed to delete LOA'
          : result.error || 'Failed to delete LOA';
        throw new AppError(errorMessage);
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  getLoa = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.service.getLoaWithFinancials(id);

      if (!result.isSuccess) {
        const errorMessage = Array.isArray(result.error)
          ? result.error[0]?.message || 'LOA not found'
          : result.error || 'LOA not found';
        throw new AppError(errorMessage, 404);
      }

      res.json({
        status: 'success',
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  };

  getAllLoas = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        page,
        limit,
        search,
        siteId,
        zoneId,
        tenderId,
        status,
        minValue,
        maxValue,
        hasEMD,
        hasSecurity,
        hasPerformanceGuarantee,
        sortBy,
        sortOrder
      } = req.query;

      const result = await this.service.getAllLoas({
        searchTerm: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        siteId: siteId as string,
        zoneId: zoneId as string,
        tenderId: tenderId as string,
        status: status as string,
        minValue: minValue ? parseFloat(minValue as string) : undefined,
        maxValue: maxValue ? parseFloat(maxValue as string) : undefined,
        hasEMD: hasEMD === 'true' ? true : hasEMD === 'false' ? false : undefined,
        hasSecurity: hasSecurity === 'true' ? true : hasSecurity === 'false' ? false : undefined,
        hasPerformanceGuarantee: hasPerformanceGuarantee === 'true' ? true : hasPerformanceGuarantee === 'false' ? false : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      if (!result.isSuccess) {
        const errorMessage = Array.isArray(result.error)
          ? result.error[0]?.message || 'Failed to fetch LOAs'
          : result.error || 'Failed to fetch LOAs';
        throw new AppError(errorMessage);
      }

      res.json({
        status: 'success',
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  };

  createAmendment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { loaId } = req.params;
      const result = await this.service.createAmendment(loaId, {
        ...req.body,
        documentFile: req.file
      });

      if (!result.isSuccess) {
        const errorMessage = Array.isArray(result.error) 
          ? result.error[0]?.message || 'Failed to create amendment'
          : result.error || 'Failed to create amendment';
        throw new AppError(errorMessage);
      }

      res.status(201).json({
        status: 'success',
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  };

  updateAmendment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.service.updateAmendment(id, {
        ...req.body,
        documentFile: req.file
      });

      if (!result.isSuccess) {
        const errorMessage = Array.isArray(result.error) 
          ? result.error[0]?.message || 'Failed to update amendment'
          : result.error || 'Failed to update amendment';
        throw new AppError(errorMessage);
      }

      res.json({
        status: 'success',
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  };

  deleteAmendment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.service.deleteAmendment(id);

      if (!result.isSuccess) {
        const errorMessage = Array.isArray(result.error)
          ? result.error[0]?.message || 'Failed to delete amendment'
          : result.error || 'Failed to delete amendment';
        throw new AppError(errorMessage);
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  createOtherDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { loaId } = req.params;
      const result = await this.service.createOtherDocument(loaId, {
        ...req.body,
        documentFile: req.file
      });

      if (!result.isSuccess) {
        const errorMessage = Array.isArray(result.error)
          ? result.error[0]?.message || 'Failed to create other document'
          : result.error || 'Failed to create other document';
        throw new AppError(errorMessage);
      }

      res.status(201).json({
        status: 'success',
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  };

  updateOtherDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.service.updateOtherDocument(id, {
        ...req.body,
        documentFile: req.file
      });

      if (!result.isSuccess) {
        const errorMessage = Array.isArray(result.error)
          ? result.error[0]?.message || 'Failed to update other document'
          : result.error || 'Failed to update other document';
        throw new AppError(errorMessage);
      }

      res.json({
        status: 'success',
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  };

  deleteOtherDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.service.deleteOtherDocument(id);

      if (!result.isSuccess) {
        const errorMessage = Array.isArray(result.error)
          ? result.error[0]?.message || 'Failed to delete other document'
          : result.error || 'Failed to delete other document';
        throw new AppError(errorMessage);
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: 'LOA ID is required' });
        return;
      }

      const { status, reason } = req.body;

      if (!status) {
        res.status(400).json({ message: 'Status is required' });
        return;
      }

      console.log(`Updating LOA ${id} status to ${status}`);

      const result = await this.service.updateStatus(id, { status, reason });

      if (!result.isSuccess) {
        const statusCode = result.error && Array.isArray(result.error)
          ? 400 // Validation error
          : 500; // Server error

        res.status(statusCode).json({
          message: Array.isArray(result.error)
            ? result.error[0]?.message || 'Validation failed'
            : result.error || 'Failed to update LOA status'
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  };

  bulkImport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if file was uploaded
      if (!req.file) {
        res.status(400).json({
          status: 'error',
          message: 'Excel file is required'
        });
        return;
      }

      // Validate file type
      const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
      ];

      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        res.status(400).json({
          status: 'error',
          message: 'Only Excel files (.xlsx, .xls) are allowed'
        });
        return;
      }

      console.log(`Processing bulk import from file: ${req.file.originalname}`);

      // Process the bulk import
      const result = await this.bulkImportService.bulkImport(req.file);

      if (!result.isSuccess) {
        res.status(500).json({
          status: 'error',
          message: result.error || 'Failed to process bulk import'
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: result.data
      });
    } catch (error) {
      console.error('Bulk import error:', error);
      next(error);
    }
  };

  /**
   * Get LOA with complete financial calculations
   */
  getLoaWithFinancials = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const result = await this.service.getLoaWithFinancials(id);

      if (!result.isSuccess) {
        res.status(404).json({ message: result.error });
        return;
      }

      res.json(result.data);
    } catch (error) {
      console.error('LoaController getLoaWithFinancials error:', error);
      next(error);
    }
  };

  /**
   * Update pending split (recoverable vs payment pending)
   */
  updatePendingSplit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Parse numeric values
      const recoverablePending = req.body.recoverablePending !== undefined
        ? Number(req.body.recoverablePending)
        : 0;
      const paymentPending = req.body.paymentPending !== undefined
        ? Number(req.body.paymentPending)
        : 0;

      const result = await this.service.updatePendingSplit(
        id,
        recoverablePending,
        paymentPending
      );

      if (!result.isSuccess) {
        res.status(400).json({ message: result.error });
        return;
      }

      res.json(result.data);
    } catch (error) {
      console.error('LoaController updatePendingSplit error:', error);
      next(error);
    }
  };

  updateManualFinancials = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Parse numeric values
      const manualTotalBilled = req.body.manualTotalBilled !== undefined
        ? Number(req.body.manualTotalBilled)
        : undefined;
      const manualTotalReceived = req.body.manualTotalReceived !== undefined
        ? Number(req.body.manualTotalReceived)
        : undefined;
      const manualTotalDeducted = req.body.manualTotalDeducted !== undefined
        ? Number(req.body.manualTotalDeducted)
        : undefined;
      const recoverablePending = req.body.recoverablePending !== undefined
        ? Number(req.body.recoverablePending)
        : undefined;

      const result = await this.service.updateManualFinancials(
        id,
        manualTotalBilled,
        manualTotalReceived,
        manualTotalDeducted,
        recoverablePending
      );

      if (!result.isSuccess) {
        res.status(400).json({ message: result.error });
        return;
      }

      res.json(result.data);
    } catch (error) {
      console.error('LoaController updateManualFinancials error:', error);
      next(error);
    }
  };

  /**
   * Get general FDRs linked to an LOA
   */
  getGeneralFdrs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const result = await this.service.getGeneralFdrsForLoa(id);

      if (!result.isSuccess) {
        res.status(404).json({ message: result.error });
        return;
      }

      res.json({ data: result.data });
    } catch (error) {
      console.error('LoaController getGeneralFdrs error:', error);
      next(error);
    }
  };

  /**
   * Link an existing FDR to an LOA
   */
  linkGeneralFdr = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, fdrId } = req.params;
      const userId = (req as any).user?.id; // Get user ID from auth middleware

      const result = await this.service.linkGeneralFdr(id, fdrId, userId);

      if (!result.isSuccess) {
        res.status(400).json({ message: result.error });
        return;
      }

      res.status(201).json({ message: 'FDR linked successfully to LOA' });
    } catch (error) {
      console.error('LoaController linkGeneralFdr error:', error);
      next(error);
    }
  };

  /**
   * Unlink an FDR from an LOA
   */
  unlinkGeneralFdr = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, fdrId } = req.params;

      const result = await this.service.unlinkGeneralFdr(id, fdrId);

      if (!result.isSuccess) {
        res.status(400).json({ message: result.error });
        return;
      }

      res.status(200).json({ message: 'FDR unlinked successfully from LOA' });
    } catch (error) {
      console.error('LoaController unlinkGeneralFdr error:', error);
      next(error);
    }
  };
}