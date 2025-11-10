// interface/http/controllers/PocController.ts
import { Request, Response, NextFunction } from 'express';
import { PocService } from '../../../application/services/PocService';
import { AppError } from '../../../shared/errors/AppError';

export class PocController {
  constructor(private service: PocService) {}

  createPoc = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('Create POC request body:', req.body);
      const result = await this.service.createPoc(req.body);

      if (!result.isSuccess) {
        console.log('POC creation failed:', result.error, result.data);
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
      console.error('POC creation error:', error);
      if (error instanceof AppError) {
        next(error);
        return;
      }
      next(new AppError('Failed to create POC'));
    }
  };

  updatePoc = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.updatePoc(id, req.body);

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
      next(new AppError('Failed to update POC'));
    }
  };

  deletePoc = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.deletePoc(id);

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
      next(new AppError('Failed to delete POC'));
    }
  };

  getPoc = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.getPoc(id);

      if (!result.isSuccess) {
        res.status(404).json({
          status: 'fail',
          message: result.error || 'POC not found'
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
      next(new AppError('POC not found', 404));
    }
  };

  getAllPocs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { search, page, limit } = req.query;

      const result = await this.service.getAllPocs({
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
      next(new AppError('Failed to fetch POCs'));
    }
  };
}
