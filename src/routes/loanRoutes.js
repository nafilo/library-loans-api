import { Router } from 'express';
import { createLoanController } from '../controllers/loanController.js';
import { validateId, validateLoan, validateQuery } from '../middleware/validation.js';

export function createLoanRouter(model) {
  const router = Router();
  const controller = createLoanController(model);
  router.get('/', validateQuery, controller.getAll);
  router.post('/', validateLoan(), controller.create);
  router.get('/:id', validateId, controller.getById);
  router.put('/:id', validateId, validateLoan(), controller.update);
  router.patch('/:id', validateId, validateLoan({ partial: true }), controller.update);
  router.delete('/:id', validateId, controller.remove);
  return router;
}
