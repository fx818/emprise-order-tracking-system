import { Router } from 'express';
import { TenderController } from '../controllers/TenderController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { UserRole } from '../../../domain/entities/User';
import multer from 'multer';

/**
 * @swagger
 * /tenders:
 *   post:
 *     tags: [Tenders]
 *     summary: Create tender
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - tenderNumber
 *               - dueDate
 *               - description
 *               - hasEMD
 *             properties:
 *               tenderNumber:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *               hasEMD:
 *                 type: boolean
 *               emdAmount:
 *                 type: number
 *               documentFile:
 *                 type: string
 *                 format: binary
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Tender created
 * 
 *   get:
 *     tags: [Tenders]
 *     summary: Get all tenders
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, CLOSED, CANCELLED, AWARDED]
 *         description: Filter by tender status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by tender number or description
 *     responses:
 *       200:
 *         description: List of tenders
 * 
 * /tenders/{id}:
 *   get:
 *     tags: [Tenders]
 *     summary: Get tender by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tender details
 * 
 *   put:
 *     tags: [Tenders]
 *     summary: Update tender
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
 *               tenderNumber:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *               hasEMD:
 *                 type: boolean
 *               emdAmount:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, CLOSED, CANCELLED, AWARDED]
 *               documentFile:
 *                 type: string
 *                 format: binary
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Updated tender
 * 
 *   delete:
 *     tags: [Tenders]
 *     summary: Delete tender
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Tender deleted
 * 
 * /tenders/{id}/status:
 *   patch:
 *     tags: [Tenders]
 *     summary: Update tender status
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
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, CLOSED, CANCELLED, AWARDED]
 *     responses:
 *       200:
 *         description: Updated tender status
 */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed!'));
    }
  },
});

const uploadFields = upload.fields([
  { name: 'documentFile', maxCount: 1 },
  { name: 'nitDocumentFile', maxCount: 1 },
  { name: 'emdDocumentFile', maxCount: 1 }
]);

export function tenderRoutes(controller: TenderController) {
  const router = Router();

  router.post('/',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
    uploadFields,
    controller.createTender
  );

  router.put('/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
    uploadFields,
    controller.updateTender
  );

  router.delete('/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
    controller.deleteTender
  );

  router.get('/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.USER]),
    controller.getTender
  );

  router.get('/',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.USER]),
    controller.getAllTenders
  );

  router.patch('/:id/status',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
    controller.updateStatus
  );

  router.patch('/:id/emd-return-status',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
    controller.updateEMDReturnStatus
  );

  return router;
} 