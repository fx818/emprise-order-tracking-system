// interfaces/http/routes/loa.routes.ts
import { Router } from 'express';
import multer from 'multer';
import { LoaController } from '../controllers/LoaController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { UserRole } from '../../../domain/entities/User';

/**
 * @swagger
 * /loas:
 *   post:
 *     tags: [LOA]
 *     summary: Create new LOA
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - loaNumber
 *               - loaValue
 *               - deliveryPeriod
 *               - workDescription
 *               - documentFile
 *             properties:
 *               loaNumber:
 *                 type: string
 *               loaValue:
 *                 type: number
 *               deliveryPeriod:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date
 *                   end:
 *                     type: string
 *                     format: date
 *               workDescription:
 *                 type: string
 *               documentFile:
 *                 type: string
 *                 format: binary
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               hasEmd:
 *                 type: boolean
 *               emdAmount:
 *                 type: number
 *               hasSecurityDeposit:
 *                 type: boolean
 *               securityDepositAmount:
 *                 type: number
 *               securityDepositFile:
 *                 type: string
 *                 format: binary
 *               hasPerformanceGuarantee:
 *                 type: boolean
 *               performanceGuaranteeAmount:
 *                 type: number
 *               performanceGuaranteeFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: LOA created successfully
 * 
 *   get:
 *     tags: [LOA]
 *     summary: Get all LOAs
 *     parameters:
 *       - $ref: '#/components/parameters/paginationLimit'
 *       - $ref: '#/components/parameters/paginationOffset'
 *     responses:
 *       200:
 *         description: List of LOAs
 * 
 * /loas/{id}:
 *   get:
 *     tags: [LOA]
 *     summary: Get LOA by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: LOA details
 * 
 *   put:
 *     tags: [LOA]
 *     summary: Update LOA
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
 *             $ref: '#/components/schemas/UpdateLoaDto'
 * 
 * /loas/{loaId}/amendments:
 *   post:
 *     tags: [LOA]
 *     summary: Create amendment
 *     parameters:
 *       - in: path
 *         name: loaId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CreateAmendmentDto'
 * 
 * /loas/amendments/{id}:
 *   put:
 *     tags: [LOA]
 *     summary: Update amendment
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
 *             $ref: '#/components/schemas/UpdateAmendmentDto'
 * 
 *   delete:
 *     tags: [LOA]
 *     summary: Delete amendment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *
 * /loas/{id}/status:
 *   put:
 *     tags: [LOA]
 *     summary: Update LOA status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [DRAFT, ACTIVE, COMPLETED, CANCELLED, DELAYED]
 *                 description: The new status of the LOA
 *               reason:
 *                 type: string
 *                 description: Optional reason for status change
 *     responses:
 *       200:
 *         description: LOA status updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: LOA not found
 *       500:
 *         description: Server error
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

// Configure multer for Excel file upload
const excelUpload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit for Excel files
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed!'));
    }
  },
});

// Setup routes
export function loaRoutes(controller: LoaController) {
  const router = Router();
  
  // Create LOA
  router.post(
    '/',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]),
    upload.fields([
      { name: 'documentFile', maxCount: 1 },
      { name: 'securityDepositFile', maxCount: 1 },
      { name: 'performanceGuaranteeFile', maxCount: 1 }
    ]),
    controller.createLoa
  );

  // Get all LOAs
  router.get(
    '/',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.USER]),
    controller.getAllLoas
  );

  // Get LOA by ID
  router.get(
    '/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.USER]),
    controller.getLoa
  );

  // Update LOA
  router.put(
    '/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]),
    upload.fields([
      { name: 'documentFile', maxCount: 1 },
      { name: 'securityDepositFile', maxCount: 1 },
      { name: 'performanceGuaranteeFile', maxCount: 1 }
    ]),
    controller.updateLoa
  );

  // Delete LOA
  router.delete(
    '/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
    controller.deleteLoa
  );

  // Create amendment
  router.post(
    '/:loaId/amendments',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]),
    upload.single('documentFile'),
    controller.createAmendment
  );

  // Update amendment
  router.put(
    '/amendments/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]),
    upload.single('documentFile'),
    controller.updateAmendment
  );

  // Delete amendment
  router.delete(
    '/amendments/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
    controller.deleteAmendment
  );

  // Create other document
  router.post(
    '/:loaId/other-documents',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]),
    upload.single('documentFile'),
    controller.createOtherDocument
  );

  // Update other document
  router.put(
    '/other-documents/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]),
    upload.single('documentFile'),
    controller.updateOtherDocument
  );

  // Delete other document
  router.delete(
    '/other-documents/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
    controller.deleteOtherDocument
  );

  // Update LOA status
  router.put(
    '/:id/status',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]),
    controller.updateStatus
  );

  // Bulk import LOAs from Excel
  router.post(
    '/bulk-import',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
    excelUpload.single('file'),
    controller.bulkImport
  );

  return router;
}