// interfaces/http/routes/purchaseOrder.routes.ts
import { Router } from 'express';
import { PurchaseOrderController } from '../controllers/PurchaseOrderController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { UserRole } from '../../../domain/entities/User';
import multer from 'multer';

/**
 * @swagger
 * /purchase-orders:
 *   post:
 *     tags: [Purchase Orders]
 *     summary: Create purchase order
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - loaId
 *               - vendorId
 *               - items
 *               - requirementDesc
 *               - termsConditions
 *               - shipToAddress
 *             properties:
 *               loaId:
 *                 type: string
 *               vendorId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/PurchaseOrderItemDto'
 *               requirementDesc:
 *                 type: string
 *               termsConditions:
 *                 type: string
 *               shipToAddress:
 *                 type: string
 *               notes:
 *                 type: string
 *               documentFile:
 *                 type: string
 *                 format: binary
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               approverId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Purchase order created
 * 
 *   get:
 *     tags: [Purchase Orders]
 *     summary: Get all purchase orders
 *     parameters:
 *       - $ref: '#/components/parameters/paginationLimit'
 *       - $ref: '#/components/parameters/paginationOffset'
 *     responses:
 *       200:
 *         description: List of purchase orders
 * 
 * /purchase-orders/{id}:
 *   get:
 *     tags: [Purchase Orders]
 *     summary: Get purchase order by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Purchase order details
 * 
 *   put:
 *     tags: [Purchase Orders]
 *     summary: Update purchase order
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
 *             $ref: '#/components/schemas/UpdatePurchaseOrderDto'
 * 
 * /purchase-orders/{id}/submit:
 *   post:
 *     tags: [Purchase Orders]
 *     summary: Submit for approval
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitForApprovalDto'
 * 
 * /purchase-orders/email-approve/{token}:
 *   get:
 *     tags: [Purchase Orders]
 *     summary: Handle email approval
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Offer approved via email
 * 
 * /purchase-orders/email-reject/{token}:
 *   get:
 *     tags: [Purchase Orders]
 *     summary: Handle email rejection
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Offer rejected via email
 *
 * /purchase-orders/{id}/generate-pdf:
 *   post:
 *     tags: [Purchase Orders]
 *     summary: Generate PDF
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 * 
 * /purchase-orders/{id}/verify-document:
 *   get:
 *     tags: [Purchase Orders]
 *     summary: Verify document
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 * 
 */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed!'));
    }
  },
});

export function purchaseOrderRoutes(controller: PurchaseOrderController) {
  const router = Router();

  router.get('/email-approve/:token', (req, res, next) => {
    console.log('Email approve route hit. Params:', req.params);
    return controller.handleEmailApproval(req, res);
  });

  router.get('/email-reject/:token', (req, res, next) => {
    console.log('Email reject route hit');  // Debug log
    controller.handleEmailRejection(req, res);
  });

  router.post('/',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.PO_SPECIALIST]),
    upload.single('document'),
    controller.createPurchaseOrder
  );

  router.put('/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.PO_SPECIALIST]),
    upload.single('document'),
    controller.updatePurchaseOrder
  );

  router.delete('/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.PO_SPECIALIST]),
    controller.deletePurchaseOrder
  );

  router.get('/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.PO_SPECIALIST]),
    controller.getPurchaseOrder
  );

  router.get('/',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.PO_SPECIALIST]),
    controller.getAllPurchaseOrders
  );

  router.patch('/:id/status',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
    controller.updateStatus
  );

  router.post('/:id/generate-pdf',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.PO_SPECIALIST]),
    controller.generatePDF
  );

  router.get('/:id/verify-document',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.PO_SPECIALIST]),
    controller.verifyDocument
  );

  router.post('/:id/submit',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.PO_SPECIALIST]),
    controller.submitForApproval
  );

  router.put('/:id/update-document',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.PO_SPECIALIST]),
    controller.updateDocumentFields
  );


  // router.post('/:id/approve',
  //   authMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
  //   controller.approveOrder
  // );

  // router.post('/:id/reject',
  //   authMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
  //   controller.rejectOrder
  // );
  return router;
}