import { asyncHandler } from '../utils/async-handler.js';
import * as orderService from '../services/order.service.js';

export const createOrder = asyncHandler(async (req, res) => {
  const { customer, items, payment } = req.body;
  const order = await orderService.createOrder(customer, items, payment);
  res.status(201).json({ success: true, data: order });
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id);
  res.json({ success: true, data: order });
});
