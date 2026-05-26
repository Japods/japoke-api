import { Router } from 'express';
import * as yummyCtrl from '../controllers/yummy.controller.js';
import { validate } from '../middleware/validate.js';
import {
  createYummyOrderSchema,
  createYummyPayoutSchema,
} from '../validators/yummy.validators.js';

const router = Router();

// --- Orders ---
router.get('/orders', yummyCtrl.listOrders);
router.get('/orders/pending-payout', yummyCtrl.getPendingPayoutSummary);
router.post(
  '/orders',
  validate(createYummyOrderSchema),
  yummyCtrl.createOrder
);

// --- Dashboard ---
router.get('/dashboard-summary', yummyCtrl.getDashboardSummary);

// --- Payouts ---
router.get('/payouts', yummyCtrl.listPayouts);
router.get('/payouts/:id', yummyCtrl.getPayoutById);
router.post(
  '/payouts',
  validate(createYummyPayoutSchema),
  yummyCtrl.createPayout
);

export default router;
