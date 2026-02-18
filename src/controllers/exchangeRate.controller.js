import { asyncHandler } from '../utils/async-handler.js';
import * as exchangeRateService from '../services/exchangeRate.service.js';

export const getLatestRates = asyncHandler(async (_req, res) => {
  const rates = await exchangeRateService.getLatestRates();
  res.json({ success: true, data: rates });
});

export const getRateHistory = asyncHandler(async (req, res) => {
  const history = await exchangeRateService.getRateHistory(req.query);
  res.json({ success: true, data: history });
});

export const refreshRates = asyncHandler(async (_req, res) => {
  const results = await exchangeRateService.fetchAndStoreRates();
  res.json({ success: true, data: results });
});
