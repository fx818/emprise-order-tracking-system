// interfaces/http/controllers/FdrController.ts
import { Request, Response } from 'express';
import { FDRStatus, FDRCategory } from '@prisma/client';
import { FdrService } from '../../../application/services/FdrService';
import { BulkImportFdrService } from '../../../application/services/BulkImportFdrService';
import { CreateFdrDto } from '../../../application/dtos/fdr/CreateFdrDto';
import { UpdateFdrDto } from '../../../application/dtos/fdr/UpdateFdrDto';

export class FdrController {
  constructor(
    private service: FdrService,
    private bulkImportService: BulkImportFdrService
  ) {}

  /**
   * Create a new FDR
   * POST /api/fdrs
   */
  createFdr = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto: CreateFdrDto = {
        category: req.body.category as 'FD' | 'BG' || 'FD',
        bankName: req.body.bankName || 'IDBI',
        accountNo: req.body.accountNo,
        fdrNumber: req.body.fdrNumber,
        accountName: req.body.accountName,
        depositAmount: parseFloat(req.body.depositAmount),
        dateOfDeposit: req.body.dateOfDeposit,
        maturityValue: req.body.maturityValue ? parseFloat(req.body.maturityValue) : undefined,
        maturityDate: req.body.maturityDate,
        contractNo: req.body.contractNo,
        contractDetails: req.body.contractDetails,
        poc: req.body.poc,
        location: req.body.location,
        documentFile: req.file,
        extractedData: req.body.extractedData ? JSON.parse(req.body.extractedData) : undefined,
        status: req.body.status as FDRStatus,
        // Filter out empty strings, "undefined" string, and whitespace
        offerId: req.body.offerId && req.body.offerId.trim() !== '' && req.body.offerId !== 'undefined' ? req.body.offerId : undefined,
        tags: req.body.tags,
      };

      const result = await this.service.createFdr(dto);

      if (!result.isSuccess) {
        res.status(400).json({
          status: 'error',
          message: result.error || 'Failed to create FDR',
          errors: result.data,
        });
        return;
      }

      res.status(201).json({
        status: 'success',
        message: 'FDR created successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Create FDR Error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Get all FDRs
   * GET /api/fdrs
   */
  getAllFdrs = async (req: Request, res: Response): Promise<void> => {
    try {
      const params = {
        searchTerm: req.query.searchTerm as string,
        category: req.query.category as FDRCategory,
        status: req.query.status as FDRStatus,
        offerId: req.query.offerId as string,
        loaId: req.query.loaId as string,
        tenderId: req.query.tenderId as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sortBy: req.query.sortBy as string,
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };

      const result = await this.service.getAllFdrs(params);

      if (!result.isSuccess) {
        res.status(400).json({
          status: 'error',
          message: result.error || 'Failed to fetch FDRs',
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: result.data,
      });
    } catch (error) {
      console.error('Get All FDRs Error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Get FDR by ID
   * GET /api/fdrs/:id
   */
  getFdrById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.getFdrById(id);

      if (!result.isSuccess) {
        res.status(404).json({
          status: 'error',
          message: result.error || 'FDR not found',
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: result.data,
      });
    } catch (error) {
      console.error('Get FDR By ID Error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Update an FDR
   * PUT /api/fdrs/:id
   */
  updateFdr = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const dto: UpdateFdrDto = {
        category: req.body.category as 'FD' | 'BG',
        bankName: req.body.bankName,
        accountNo: req.body.accountNo,
        fdrNumber: req.body.fdrNumber,
        accountName: req.body.accountName,
        depositAmount: req.body.depositAmount ? parseFloat(req.body.depositAmount) : undefined,
        dateOfDeposit: req.body.dateOfDeposit,
        maturityValue: req.body.maturityValue ? parseFloat(req.body.maturityValue) : undefined,
        maturityDate: req.body.maturityDate,
        contractNo: req.body.contractNo,
        contractDetails: req.body.contractDetails,
        poc: req.body.poc,
        location: req.body.location,
        documentFile: req.file,
        extractedData: req.body.extractedData ? JSON.parse(req.body.extractedData) : undefined,
        status: req.body.status as FDRStatus,
        offerId: req.body.offerId,
        tags: req.body.tags,
      };

      const result = await this.service.updateFdr(id, dto);

      if (!result.isSuccess) {
        res.status(400).json({
          status: 'error',
          message: result.error || 'Failed to update FDR',
          errors: result.data,
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        message: 'FDR updated successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Update FDR Error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Delete an FDR
   * DELETE /api/fdrs/:id
   */
  deleteFdr = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.deleteFdr(id);

      if (!result.isSuccess) {
        res.status(400).json({
          status: 'error',
          message: result.error || 'Failed to delete FDR',
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        message: 'FDR deleted successfully',
      });
    } catch (error) {
      console.error('Delete FDR Error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Update FDR status
   * PATCH /api/fdrs/:id/status
   */
  updateStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!Object.values(FDRStatus).includes(status)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid status value',
        });
        return;
      }

      const result = await this.service.updateStatus(id, status);

      if (!result.isSuccess) {
        res.status(400).json({
          status: 'error',
          message: result.error || 'Failed to update FDR status',
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        message: 'FDR status updated successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Update FDR Status Error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Get expiring FDRs
   * GET /api/fdrs/expiring/list
   */
  getExpiringFdrs = async (req: Request, res: Response): Promise<void> => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const result = await this.service.getExpiringFdrs(days);

      if (!result.isSuccess) {
        res.status(400).json({
          status: 'error',
          message: result.error || 'Failed to fetch expiring FDRs',
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: result.data,
      });
    } catch (error) {
      console.error('Get Expiring FDRs Error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Extract data from document using AI
   * POST /api/fdrs/extract
   */
  extractData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { extractedText } = req.body;

      if (!extractedText) {
        res.status(400).json({
          status: 'error',
          message: 'extractedText is required',
        });
        return;
      }

      const result = await this.service.extractDataFromDocument({ extractedText });

      if (!result.isSuccess) {
        res.status(400).json({
          status: 'error',
          message: result.error || 'Failed to extract data',
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: result.data,
      });
    } catch (error) {
      console.error('Extract Data Error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Extract data from file (PDF or image) - Complete OCR + AI pipeline
   * POST /api/fdrs/extract-from-file
   */
  extractFromFile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          status: 'error',
          message: 'File is required',
        });
        return;
      }

      const result = await this.service.extractDataFromFile(req.file);

      if (!result.isSuccess) {
        res.status(400).json({
          status: 'error',
          message: result.error || 'Failed to extract data from file',
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: result.data,
      });
    } catch (error) {
      console.error('Extract From File Error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Bulk import FDRs from Excel file
   * POST /api/fdrs/bulk-import
   */
  bulkImport = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          status: 'error',
          message: 'Excel file is required',
        });
        return;
      }

      const result = await this.bulkImportService.bulkImport(req.file);

      if (!result.isSuccess) {
        res.status(400).json({
          status: 'error',
          message: result.error || 'Failed to import FDRs',
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        message: `Successfully imported ${result.data?.successCount} FDRs`,
        data: result.data,
      });
    } catch (error) {
      console.error('Bulk Import FDRs Error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  };
}
