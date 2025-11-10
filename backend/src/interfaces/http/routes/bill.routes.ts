import { Router } from 'express';
import multer from 'multer';
import { BillController } from '../controllers/BillController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { UserRole } from '../../../domain/entities/User';

/**
 * @swagger
 * /loas/{loaId}/bills:
 *   post:
 *     tags: [Bills]
 *     summary: Create a new bill for an LOA
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loaId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               invoiceNumber:
 *                 type: string
 *               invoiceAmount:
 *                 type: number
 *               totalReceivables:
 *                 type: number
 *               actualAmountReceived:
 *                 type: number
 *               amountDeducted:
 *                 type: number
 *               amountPending:
 *                 type: number
 *               deductionReason:
 *                 type: string
 *               billLinks:
 *                 type: string
 *               remarks:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [REGISTERED, RETURNED, PAYMENT_MADE]
 *               invoicePdfFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Bill created successfully
 *       400:
 *         description: Invalid input
 *
 *   get:
 *     tags: [Bills]
 *     summary: Get all bills for an LOA
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loaId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of bills
 *
 * /bills/{id}:
 *   get:
 *     tags: [Bills]
 *     summary: Get bill by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bill details
 *       404:
 *         description: Bill not found
 *
 *   put:
 *     tags: [Bills]
 *     summary: Update bill
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               invoiceNumber:
 *                 type: string
 *               invoiceAmount:
 *                 type: number
 *               totalReceivables:
 *                 type: number
 *               actualAmountReceived:
 *                 type: number
 *               amountDeducted:
 *                 type: number
 *               amountPending:
 *                 type: number
 *               deductionReason:
 *                 type: string
 *               billLinks:
 *                 type: string
 *               remarks:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [REGISTERED, RETURNED, PAYMENT_MADE]
 *               invoicePdfFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Bill updated successfully
 *       404:
 *         description: Bill not found
 *
 *   delete:
 *     tags: [Bills]
 *     summary: Delete bill
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Bill deleted successfully
 *       404:
 *         description: Bill not found
 */

// Configure multer for file upload
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed!'));
    }
  },
});

// Setup routes
export function billRoutes(controller: BillController) {
  const router = Router();

  // Create bill for an LOA
  router.post(
    '/loas/:loaId/bills',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]),
    upload.fields([{ name: 'invoicePdfFile', maxCount: 1 }]),
    controller.createBill
  );

  // Get all bills for an LOA
  router.get(
    '/loas/:loaId/bills',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.USER]),
    controller.getBillsByLoaId
  );

  // Get bill by ID
  router.get(
    '/bills/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.USER]),
    controller.getBillById
  );

  // Update bill
  router.put(
    '/bills/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]),
    upload.fields([{ name: 'invoicePdfFile', maxCount: 1 }]),
    controller.updateBill
  );

  // Delete bill
  router.delete(
    '/bills/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
    controller.deleteBill
  );

  return router;
}
