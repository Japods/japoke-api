import { asyncHandler } from '../utils/async-handler.js';
import * as settingsService from '../services/settings.service.js';

export const getStatus = asyncHandler(async (_req, res) => {
  const status = await settingsService.getStoreStatus();
  res.json({ success: true, data: status });
});

export const setStatus = asyncHandler(async (req, res) => {
  const { isOpen } = req.body;
  const status = await settingsService.setStoreStatus(Boolean(isOpen));
  res.json({ success: true, data: status });
});
