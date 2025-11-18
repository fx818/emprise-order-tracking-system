import { Request, Response } from 'express';
import { PurchaseOrderService } from '../../../application/services/PurchaseOrderService';
import { AppError } from '../../../shared/errors/AppError';
import { POStatus } from '../../../domain/entities/constants';

export class PurchaseOrderController {
  constructor(private service: PurchaseOrderService) { }

  createPurchaseOrder = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('User ID not found', 401);
      }

      const purchaseOrder = await this.service.createPurchaseOrder({
        ...req.body,
        documentFile: req.file
      }, userId);

      res.status(201).json({
        status: 'success',
        data: purchaseOrder
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create purchase order');
    }
  };

  updatePurchaseOrder = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('User ID not found', 401);
      }

      const { id } = req.params;
      const updatedPO = await this.service.updatePurchaseOrder(id, {
        ...req.body,
        documentFile: req.file
      }, userId);

      res.json({
        status: 'success',
        data: updatedPO
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update purchase order');
    }
  };

  deletePurchaseOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ status: 'error', message: 'User ID not found' });
        return;
      }

      if (!id) {
        res.status(400).json({ status: 'error', message: 'Purchase order ID is required' });
        return;
      }

      await this.service.markAsDeletedPurchaseOrder(id, userId);

      res.status(200).json({
        status: 'success',
        message: 'Purchase order marked as deleted'
      });
      return;

    } catch (error: any) {
      const status = error instanceof AppError ? error.statusCode : 500;
      const message = error instanceof AppError ? error.message : 'Failed to delete purchase order';

      console.error('Delete PO Error:', { id: req.params.id, userId: req.user?.userId, error });

      res.status(status).json({ status: 'error', message });
    }
  };


  getPurchaseOrder = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const purchaseOrder = await this.service.getPurchaseOrder(id);

      res.json({
        status: 'success',
        data: purchaseOrder
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Purchase order not found', 404);
    }
  };

  getAllPurchaseOrders = async (req: Request, res: Response) => {
    try {
      const {
        page,
        limit,
        status,
        vendorId,
        loaId,
        createdById,
        approverId,
        search,
        sortBy,
        sortOrder
      } = req.query;

      const purchaseOrders = await this.service.getAllPurchaseOrders({
        status: status as POStatus,
        vendorId: vendorId as string,
        loaId: loaId as string,
        createdById: createdById as string,
        approverId: approverId as string,
        searchTerm: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      res.json({
        status: 'success',
        data: purchaseOrders
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch purchase orders');
    }
  };

  updateStatus = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('User ID not found', 401);
      }
      console.log("🔥 UPDATE STATUS REQ BODY:", req.body);
      const { id } = req.params;
      const { status } = req.body;

      const updatedPO = await this.service.updateStatus(id, status, userId);
      console.log("🔥 UPDATED PO AFTER STATUS CHANGE:", updatedPO);
      res.json({
        status: 'success',
        data: updatedPO
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update purchase order status here');
    }
  };

  generatePDF = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('User ID not found', 401);
      }

      const { id } = req.params;
      // 🔥 Extract the correct override payload
      const overrides = req.body?.overrides ?? req.body ?? {};

      console.log("🔥 FINAL OVERRIDES SENT TO SERVICE:", overrides);
      const result = await this.service.generatePDF(id, overrides);

      if (!result.isSuccess) {
        const errorMessage = Array.isArray(result.error)
          ? result.error.map(e => e.message).join(', ')
          : result.error || 'Failed to generate PDF';
        throw new AppError(errorMessage);
      }

      res.json({
        status: 'success',
        data: result.data
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to generate PDF');
    }
  };

  verifyDocument = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.service.verifyDocument(id);

      if (!result.isSuccess) {
        const errorMessage = Array.isArray(result.error)
          ? result.error.map(e => e.message).join(', ')
          : result.error || 'Failed to verify document';
        throw new AppError(errorMessage);
      }

      res.json({
        status: 'success',
        data: result.data
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to verify document');
    }
  };

  submitForApproval = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('User ID not found', 401);
      }

      const { id } = req.params;
      const result = await this.service.submitForApproval(id, userId);

      res.json({
        status: 'success',
        data: result
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to submit purchase order for approval');
    }
  };

  approveOrder = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('User ID not found', 401);
      }

      const { id } = req.params;
      const { comments } = req.body;

      const result = await this.service.approveOrder(id, userId, comments);
      res.json({
        status: 'success',
        data: result
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to approve purchase order');
    }
  };

  rejectOrder = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('User ID not found', 401);
      }

      const { id } = req.params;
      const { reason } = req.body;
      const result = await this.service.rejectOrder(id, userId, reason);

      res.json({
        status: 'success',
        data: result
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to reject purchase order');
    }
  };

  handleEmailApproval = async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { comments } = req.query;

      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
      );

      // If no comments provided, show the approval form
      if (!comments) {
        res.send(`
          <html>
          <head>
            <style>
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              
              .submit-button {
                position: relative;
                padding: 12px 24px;
                background-color: #28a745;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                min-width: 180px;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
              }
  
              .submit-button:hover {
                background-color: #218838;
              }
  
              .submit-button:disabled {
                background-color: #6c757d;
                cursor: not-allowed;
                opacity: 0.7;
              }
  
              .spinner {
                display: none;
                width: 20px;
                height: 20px;
                border: 3px solid #ffffff;
                border-radius: 50%;
                border-top-color: transparent;
                animation: spin 1s linear infinite;
              }
  
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
  
              .textarea-container {
                margin: 20px 0;
              }
  
              textarea {
                width: 100%;
                padding: 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                resize: vertical;
                min-height: 100px;
                margin-top: 8px;
              }
            </style>
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding-top: 50px;">
            <div class="container">
              <h2 style="color: #333; margin-bottom: 30px;">Approve Purchase Order</h2>
              
              <form id="approvalForm">
                <div class="textarea-container">
                  <label for="comments" style="display: block; text-align: left; margin-bottom: 8px;">
                    Approval Comments:
                  </label>
                  <textarea 
                    name="comments" 
                    id="comments"
                    placeholder="Enter any comments for this approval..."></textarea>
                </div>
                
                <button type="button" id="submitBtn" class="submit-button">
                  <span id="buttonText">Confirm Approval</span>
                  <div id="spinner" class="spinner"></div>
                </button>
              </form>
            </div>
  
            <script>
              document.getElementById('submitBtn').addEventListener('click', async function(e) {
                e.preventDefault();
                
                const button = document.getElementById('submitBtn');
                const buttonText = document.getElementById('buttonText');
                const spinner = document.getElementById('spinner');
                const comments = document.getElementById('comments').value;
                
                // Disable button and show spinner
                button.disabled = true;
                buttonText.textContent = 'Processing...';
                spinner.style.display = 'block';
  
                // Redirect with comments
                window.location.href = '/api/purchase-orders/email-approve/${token}?comments=' + encodeURIComponent(comments);
              });
            </script>
          </body>
          </html>
        `);
        return;
      }

      const result = await this.service.handleEmailApproval(token, comments as string);

      if (!result.isSuccess) {
        res.send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding-top: 50px;">
              <h2 style="color: #dc3545;">Error</h2>
              <p>${result.error}</p>
            </body>
          </html>
        `);
        return;
      }

      res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding-top: 50px;">
            <h2 style="color: #28a745;">Purchase Order Approved</h2>
            <p>The purchase order ${result.data?.poNumber ?? 'Unknown'} has been successfully approved.</p>
            <p style="color: #666;">Comments: ${comments || 'No comments provided'}</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Email approval error:', error);
      res.status(500).send('An error occurred');
    }
  };

  handleEmailRejection = async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { reason } = req.query;

      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
      );

      // If no reason provided, show the rejection form
      if (!reason) {
        res.send(`
          <html>
          <head>
            <style>
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              
              .submit-button {
                position: relative;
                padding: 12px 24px;
                background-color: #dc3545;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                min-width: 180px;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
              }
  
              .submit-button:hover {
                background-color: #c82333;
              }
  
              .submit-button:disabled {
                background-color: #6c757d;
                cursor: not-allowed;
                opacity: 0.7;
              }
  
              .spinner {
                display: none;
                width: 20px;
                height: 20px;
                border: 3px solid #ffffff;
                border-radius: 50%;
                border-top-color: transparent;
                animation: spin 1s linear infinite;
              }
  
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
  
              .textarea-container {
                margin: 20px 0;
              }
  
              textarea {
                width: 100%;
                padding: 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                resize: vertical;
                min-height: 100px;
                margin-top: 8px;
              }
            </style>
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding-top: 50px;">
            <div class="container">
              <h2 style="color: #333; margin-bottom: 30px;">Reject Purchase Order</h2>
              
              <form id="rejectionForm">
                <div class="textarea-container">
                  <label for="reason" style="display: block; text-align: left; margin-bottom: 8px;">
                    Rejection Reason:
                  </label>
                  <textarea 
                    name="reason" 
                    id="reason"
                    placeholder="Enter reason for rejection..."
                    required></textarea>
                </div>
                
                <button type="button" id="submitBtn" class="submit-button">
                  <span id="buttonText">Confirm Rejection</span>
                  <div id="spinner" class="spinner"></div>
                </button>
              </form>
            </div>
  
            <script>
              document.getElementById('submitBtn').addEventListener('click', async function(e) {
                e.preventDefault();
                
                const button = document.getElementById('submitBtn');
                const buttonText = document.getElementById('buttonText');
                const spinner = document.getElementById('spinner');
                const reason = document.getElementById('reason').value;
                
                if (!reason.trim()) {
                  alert('Please provide a rejection reason');
                  return;
                }
                
                // Disable button and show spinner
                button.disabled = true;
                buttonText.textContent = 'Processing...';
                spinner.style.display = 'block';
  
                // Redirect with reason
                window.location.href = '/api/purchase-orders/email-reject/${token}?reason=' + encodeURIComponent(reason);
              });
            </script>
          </body>
          </html>
        `);
        return;
      }

      const result = await this.service.handleEmailRejection(token, reason as string);

      if (!result.isSuccess) {
        res.send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding-top: 50px;">
              <h2 style="color: #dc3545;">Error</h2>
              <p>${result.error}</p>
            </body>
          </html>
        `);
        return;
      }

      res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding-top: 50px;">
            <h2 style="color: #dc3545;">Purchase Order Rejected</h2>
            <p>The purchase order ${result.data?.poNumber ?? 'Unknown'} has been rejected.</p>
            <p style="color: #666;">Reason: ${reason || 'No reason provided'}</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Email rejection error:', error);
      res.status(500).send('An error occurred');
    }
  };


  updateDocumentFields = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await this.service.updateDocumentFields(id, req.body);

      if (!result.isSuccess) {
        const message = Array.isArray(result.error)
          ? result.error.map(e => e.message).join(", ")
          : result.error;

        throw new AppError(message || "Failed to update document fields");
      }


      res.json({
        status: "success",
        data: result.data
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to update document fields");
    }
  };




}