import { Router } from 'express';
import * as invCtrl from '../controllers/inventory.controller.js';
import { validate } from '../middleware/validate.js';
import { purchaseSchema, adjustmentSchema } from '../validators/inventory.validators.js';
import { createSupplySchema, updateSupplySchema } from '../validators/supply.validators.js';

const router = Router();

// Inventory
router.get('/', invCtrl.getInventory);
router.get('/alerts', invCtrl.getAlerts);
router.get('/movements', invCtrl.getMovements);
router.post('/purchase', validate(purchaseSchema), invCtrl.recordPurchase);
router.post('/adjustment', validate(adjustmentSchema), invCtrl.adjustStock);

// Supplies
router.get('/supplies', invCtrl.getSupplies);
router.post('/supplies', validate(createSupplySchema), invCtrl.createSupply);
router.patch('/supplies/:id', validate(updateSupplySchema), invCtrl.updateSupply);

export default router;
