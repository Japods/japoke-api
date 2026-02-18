import { Router } from 'express';
import * as orderCtrl from '../controllers/order.controller.js';
import { validate } from '../middleware/validate.js';
import { createOrderSchema } from '../validators/order.validators.js';

const router = Router();

router.post('/', validate(createOrderSchema), orderCtrl.createOrder);
router.get('/:id', orderCtrl.getOrderById);

export default router;
