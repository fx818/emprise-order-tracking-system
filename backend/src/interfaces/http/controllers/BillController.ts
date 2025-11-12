import { Request, Response, NextFunction } from 'express';
import { BillService } from '../../../application/services/BillService';
import { BillStatus } from '../../../domain/entities/Bill';

export class BillController {
  constructor(private service: BillService) {}

  createBill = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { loaId } = req.params;

      // Parse numeric values
      const invoiceAmount = req.body.invoiceAmount ? Number(req.body.invoiceAmount) : undefined;
      const amountReceived = req.body.amountReceived ? Number(req.body.amountReceived) : undefined;
      const amountDeducted = req.body.amountDeducted ? Number(req.body.amountDeducted) : undefined;

      // Process the uploaded file
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const invoicePdfFile = files?.invoicePdfFile?.[0];

      // Parse status
      const status = req.body.status as BillStatus | undefined;

      const result = await this.service.createBill(loaId, {
        invoiceNumber: req.body.invoiceNumber,
        invoiceAmount,
        amountReceived,
        amountDeducted,
        deductionReason: req.body.deductionReason,
        billLinks: req.body.billLinks,
        remarks: req.body.remarks,
        status,
        invoicePdfFile,
      });

      if (!result.isSuccess) {
        res.status(400).json({ message: result.error });
        return;
      }

      res.status(201).json(result.data);
    } catch (error) {
      console.error('BillController createBill error:', error);
      next(error);
    }
  };

  getBillsByLoaId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { loaId } = req.params;

      const result = await this.service.getBillsByLoaId(loaId);

      if (!result.isSuccess) {
        res.status(404).json({ message: result.error });
        return;
      }

      res.json(result.data);
    } catch (error) {
      console.error('BillController getBillsByLoaId error:', error);
      next(error);
    }
  };

  getBillById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const result = await this.service.getBillById(id);

      if (!result.isSuccess) {
        res.status(404).json({ message: result.error });
        return;
      }

      res.json(result.data);
    } catch (error) {
      console.error('BillController getBillById error:', error);
      next(error);
    }
  };

  updateBill = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Parse numeric values
      const invoiceAmount = req.body.invoiceAmount ? Number(req.body.invoiceAmount) : undefined;
      const amountReceived = req.body.amountReceived !== undefined ? Number(req.body.amountReceived) : undefined;
      const amountDeducted = req.body.amountDeducted !== undefined ? Number(req.body.amountDeducted) : undefined;

      // Process the uploaded file
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const invoicePdfFile = files?.invoicePdfFile?.[0];

      // Parse status
      const status = req.body.status as BillStatus | undefined;

      const result = await this.service.updateBill(id, {
        invoiceNumber: req.body.invoiceNumber,
        invoiceAmount,
        amountReceived,
        amountDeducted,
        deductionReason: req.body.deductionReason,
        billLinks: req.body.billLinks,
        remarks: req.body.remarks,
        status,
        invoicePdfFile,
      });

      if (!result.isSuccess) {
        res.status(400).json({ message: result.error });
        return;
      }

      res.json(result.data);
    } catch (error) {
      console.error('BillController updateBill error:', error);
      next(error);
    }
  };

  deleteBill = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const result = await this.service.deleteBill(id);

      if (!result.isSuccess) {
        res.status(400).json({ message: result.error });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('BillController deleteBill error:', error);
      next(error);
    }
  };
}
