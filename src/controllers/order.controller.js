import { asyncHandler } from '../utils/async-handler.js';
import * as orderService from '../services/order.service.js';

export const createOrder = asyncHandler(async (req, res) => {
  const { customer, items, payment, deliveryTime, splitPayment, promotionId, promoItemIndexes, discountCode, addOns } = req.body;
  const order = await orderService.createOrder(customer, items, payment, deliveryTime, splitPayment, {
    promotionId, promoItemIndexes, discountCode,
  }, addOns);
  res.status(201).json({ success: true, data: order });
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id);
  res.json({ success: true, data: order });
});

export const validateDiscountCode = asyncHandler(async (req, res) => {
  const result = await orderService.validateDiscountCode(req.query.code);
  res.json({ success: true, data: result });
});

export const deleteOrder = asyncHandler(async (req, res) => {
  await orderService.deleteOrder(req.params.id);
  res.json({ success: true, message: 'Pedido eliminado y stock restaurado' });
});
