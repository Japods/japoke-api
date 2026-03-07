import { asyncHandler } from '../utils/async-handler.js';
import {
  getMonthlyUsage,
  isEnabled,
  setManualToggle,
  getManualToggle,
  notifyDeliveryCost,
} from '../services/whatsapp.service.js';
import Order from '../models/Order.js';
import { AppError } from '../utils/app-error.js';

export const getWhatsAppStatus = asyncHandler(async (_req, res) => {
  const usage = await getMonthlyUsage();

  res.json({
    success: true,
    data: {
      enabled: isEnabled(),
      manualToggle: getManualToggle(),
      conversationsThisMonth: usage.count,
      monthlyLimit: usage.limit,
      remaining: usage.remaining,
      autoPaused: usage.autoPaused,
      month: usage.month,
    },
  });
});

export const sendDeliveryCost = asyncHandler(async (req, res) => {
  const { orderId, amountBs } = req.body;

  if (!orderId) throw new AppError('orderId es requerido', 400);
  if (!amountBs || amountBs <= 0) throw new AppError('amountBs debe ser mayor a 0', 400);

  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Pedido no encontrado', 404);

  await notifyDeliveryCost(order, amountBs);

  // Save delivery cost on the order for reference
  order.deliveryCostBs = amountBs;
  await order.save();

  res.json({ success: true, message: `Costo de delivery (${amountBs} Bs) enviado por WhatsApp` });
});

export const toggleWhatsApp = asyncHandler(async (req, res) => {
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ success: false, message: 'El campo "enabled" debe ser true o false' });
  }

  const newState = setManualToggle(enabled);

  const usage = await getMonthlyUsage();

  res.json({
    success: true,
    data: {
      enabled: isEnabled(),
      manualToggle: newState,
      conversationsThisMonth: usage.count,
      monthlyLimit: usage.limit,
      remaining: usage.remaining,
      autoPaused: usage.autoPaused,
    },
    message: newState ? 'WhatsApp activado' : 'WhatsApp desactivado manualmente',
  });
});
