import { Router } from 'express';
import * as adminCtrl from '../controllers/admin.controller.js';
import { deleteOrder } from '../controllers/order.controller.js';
import { validate } from '../middleware/validate.js';
import {
  createCategorySchema,
  updateCategorySchema,
  createItemSchema,
  updateItemSchema,
  createPokeTypeSchema,
  updatePokeTypeSchema,
  updateOrderStatusSchema,
} from '../validators/admin.validators.js';

const router = Router();

// Orders
router.get('/orders', adminCtrl.getOrders);
router.patch('/orders/:id/status', validate(updateOrderStatusSchema), adminCtrl.updateOrderStatus);
router.patch('/orders/:id/payment', adminCtrl.updatePaymentStatus);
router.patch('/orders/:id/payment-details', adminCtrl.updatePaymentDetails);
router.post('/orders/:id/split-payment', adminCtrl.addSplitPayment);
router.patch('/orders/:id/split-payment/status', adminCtrl.updateSplitPaymentStatus);
router.patch('/orders/:id/courtesy', adminCtrl.setCourtesy);
router.patch('/orders/:id/delivery-free', adminCtrl.setDeliveryFree);
router.get('/orders-unpaid', adminCtrl.getUnpaidOrders);
router.delete('/orders/:id', deleteOrder);

// Categories
router.get('/categories', adminCtrl.getCategories);
router.post('/categories', validate(createCategorySchema), adminCtrl.createCategory);
router.patch('/categories/:id', validate(updateCategorySchema), adminCtrl.updateCategory);

// Items
router.get('/items', adminCtrl.getItems);
router.post('/items', validate(createItemSchema), adminCtrl.createItem);
router.patch('/items/:id', validate(updateItemSchema), adminCtrl.updateItem);

// Poke Types
router.get('/poke-types', adminCtrl.getPokeTypes);
router.post('/poke-types', validate(createPokeTypeSchema), adminCtrl.createPokeType);
router.patch('/poke-types/:id', validate(updatePokeTypeSchema), adminCtrl.updatePokeType);

// Promotions
router.get('/promotions', adminCtrl.getPromotions);
router.post('/promotions', adminCtrl.createPromotion);
router.patch('/promotions/:id', adminCtrl.updatePromotion);
router.delete('/promotions/:id', adminCtrl.deletePromotion);

// Discount Codes
router.get('/discount-codes', adminCtrl.getDiscountCodes);
router.post('/discount-codes', adminCtrl.createDiscountCode);
router.patch('/discount-codes/:id', adminCtrl.updateDiscountCode);
router.delete('/discount-codes/:id', adminCtrl.deleteDiscountCode);

export default router;
