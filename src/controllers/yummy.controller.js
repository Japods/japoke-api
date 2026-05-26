import { asyncHandler } from '../utils/async-handler.js';
import { AppError } from '../utils/app-error.js';
import * as yummyOrderService from '../services/yummy-order.service.js';
import * as yummyPayoutService from '../services/yummy-payout.service.js';

// --- Orders ---
export const createOrder = asyncHandler(async (req, res) => {
  const order = await yummyOrderService.createYummyOrder(req.body);
  res.status(201).json({ success: true, data: order });
});

export const listOrders = asyncHandler(async (req, res) => {
  const { payoutStatus, from, to, page, limit } = req.query;
  const result = await yummyOrderService.listYummyOrders({
    payoutStatus,
    from,
    to,
    page,
    limit,
  });
  res.json({ success: true, ...result });
});

export const getPendingPayoutSummary = asyncHandler(async (_req, res) => {
  const summary = await yummyOrderService.getPendingPayoutSummary();
  res.json({ success: true, data: summary });
});

// --- Payouts ---
export const createPayout = asyncHandler(async (req, res) => {
  const payout = await yummyPayoutService.createPayout(req.body);
  res.status(201).json({ success: true, data: payout });
});

export const listPayouts = asyncHandler(async (req, res) => {
  const { from, to, page, limit } = req.query;
  const result = await yummyPayoutService.listPayouts({ from, to, page, limit });
  res.json({ success: true, ...result });
});

export const getPayoutById = asyncHandler(async (req, res) => {
  const payout = await yummyPayoutService.getPayoutById(req.params.id);
  if (!payout) throw new AppError('Pago no encontrado', 404);
  res.json({ success: true, data: payout });
});

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const summary = await yummyPayoutService.getDashboardSummary({ from, to });
  res.json({ success: true, data: summary });
});
