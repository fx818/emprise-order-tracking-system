// interface/http/controllers/InspectionAgencyController.ts
import { Request, Response, NextFunction } from 'express';
import { InspectionAgencyService } from '../../../application/services/InspectionAgencyService';
import { AppError } from '../../../shared/errors/AppError';

export class InspectionAgencyController {
  constructor(private service: InspectionAgencyService) {}

  createInspectionAgency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('Create Inspection Agency request body:', req.body);
      const result = await this.service.createInspectionAgency(req.body);

      if (!result.isSuccess) {
        console.log('Inspection Agency creation failed:', result.error, result.data);
        res.status(400).json({
          status: 'fail',
          message: result.error,
          errors: result.data
        });
        return;
      }

      res.status(201).json({
        status: 'success',
        data: result.data
      });
    } catch (error) {
      console.error('Inspection Agency creation error:', error);
      if (error instanceof AppError) {
        next(error);
        return;
      }
      next(new AppError('Failed to create inspection agency'));
    }
  };

  updateInspectionAgency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.updateInspectionAgency(id, req.body);

      if (!result.isSuccess) {
        res.status(400).json({
          status: 'fail',
          message: result.error
        });
        return;
      }

      res.json({
        status: 'success',
        data: result.data
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
        return;
      }
      next(new AppError('Failed to update inspection agency'));
    }
  };

  deleteInspectionAgency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.deleteInspectionAgency(id);

      if (!result.isSuccess) {
        res.status(400).json({
          status: 'fail',
          message: result.error
        });
        return;
      }

      res.status(204).send();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
        return;
      }
      next(new AppError('Failed to delete inspection agency'));
    }
  };

  getInspectionAgency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.getInspectionAgency(id);

      if (!result.isSuccess) {
        res.status(404).json({
          status: 'fail',
          message: result.error || 'Inspection agency not found'
        });
        return;
      }

      res.json({
        status: 'success',
        data: result.data
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
        return;
      }
      next(new AppError('Inspection agency not found', 404));
    }
  };

  getAllInspectionAgencies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { search, page, limit } = req.query;

      const result = await this.service.getAllInspectionAgencies({
        searchTerm: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });

      if (!result.isSuccess) {
        res.status(400).json({
          status: 'fail',
          message: result.error
        });
        return;
      }

      res.json({
        status: 'success',
        data: result.data
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
        return;
      }
      next(new AppError('Failed to fetch inspection agencies'));
    }
  };
}
