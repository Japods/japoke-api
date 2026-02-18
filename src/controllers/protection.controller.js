import { asyncHandler } from '../utils/async-handler.js';
import * as protectionService from '../services/protection.service.js';

export const getSummary = asyncHandler(async (_req, res) => {
  const summary = await protectionService.getProtectionSummary();
  res.json({ success: true, data: summary });
});

export const createProtection = asyncHandler(async (req, res) => {
  const { amountBs, rateDolarParalelo, destination, notes } = req.body;
  const protection = await protectionService.createProtection({
    amountBs,
    rateDolarParalelo,
    destination: destination || 'usdt',
    notes,
  });
  res.status(201).json({ success: true, data: protection });
});

export const getHistory = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const history = await protectionService.getProtectionHistory({
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
  });
  res.json({ success: true, ...history });
});
