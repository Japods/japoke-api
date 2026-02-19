import { Router } from 'express';
import * as purchasesCtrl from '../controllers/purchases.controller.js';
import { validate } from '../middleware/validate.js';
import {
  createPurchaseSchema,
  updatePurchaseSchema,
} from '../validators/purchases.validators.js';

const router = Router();

router.get('/stockable-items', purchasesCtrl.getStockableItems);
router.get('/', purchasesCtrl.getPurchases);
router.get('/:id', purchasesCtrl.getPurchaseById);
router.post('/', validate(createPurchaseSchema), purchasesCtrl.createPurchase);
router.patch('/:id', validate(updatePurchaseSchema), purchasesCtrl.updatePurchase);
router.delete('/:id', purchasesCtrl.deletePurchase);

export default router;
