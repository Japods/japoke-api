import { asyncHandler } from '../utils/async-handler.js';
import {
  getMonthlyUsage,
  isEnabled,
  setManualToggle,
  getManualToggle,
} from '../services/whatsapp.service.js';

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
