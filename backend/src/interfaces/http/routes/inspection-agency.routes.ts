// interface/http/routes/inspection-agency.routes.ts
import { Router } from 'express';
import { InspectionAgencyController } from '../controllers/InspectionAgencyController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { UserRole } from '../../../domain/entities/User';

export function inspectionAgencyRoutes(controller: InspectionAgencyController) {
  const router = Router();

  // POST route for creating an inspection agency
  router.post('/',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.BO_SPECIALIST, UserRole.PO_SPECIALIST]),
    controller.createInspectionAgency
  );

  // GET routes for inspection agency collections
  router.get('/',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.BO_SPECIALIST, UserRole.PO_SPECIALIST]),
    controller.getAllInspectionAgencies
  );

  // Routes with :id parameter
  router.put('/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.BO_SPECIALIST, UserRole.PO_SPECIALIST]),
    controller.updateInspectionAgency
  );

  router.delete('/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.BO_SPECIALIST, UserRole.PO_SPECIALIST]),
    controller.deleteInspectionAgency
  );

  router.get('/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.BO_SPECIALIST, UserRole.PO_SPECIALIST]),
    controller.getInspectionAgency
  );

  return router;
}
