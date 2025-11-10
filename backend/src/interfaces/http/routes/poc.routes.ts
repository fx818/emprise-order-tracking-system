// interface/http/routes/poc.routes.ts
import { Router } from 'express';
import { PocController } from '../controllers/PocController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { UserRole } from '../../../domain/entities/User';

export function pocRoutes(controller: PocController) {
  const router = Router();

  // POST route for creating a POC
  router.post('/',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.BO_SPECIALIST, UserRole.PO_SPECIALIST]),
    controller.createPoc
  );

  // GET routes for POC collections
  router.get('/',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.BO_SPECIALIST, UserRole.PO_SPECIALIST]),
    controller.getAllPocs
  );

  // Routes with :id parameter
  router.put('/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.BO_SPECIALIST, UserRole.PO_SPECIALIST]),
    controller.updatePoc
  );

  router.delete('/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.BO_SPECIALIST, UserRole.PO_SPECIALIST]),
    controller.deletePoc
  );

  router.get('/:id',
    authMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.BO_SPECIALIST, UserRole.PO_SPECIALIST]),
    controller.getPoc
  );

  return router;
}
