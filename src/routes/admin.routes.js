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

export default router;
