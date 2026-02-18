import { asyncHandler } from '../utils/async-handler.js';
import * as dashboardService from '../services/dashboard.service.js';

export const getSummary = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const summary = await dashboardService.getDashboardSummary({ from, to });
  res.json({ success: true, data: summary });
});

export const getSales = asyncHandler(async (req, res) => {
  const { from, to, groupBy } = req.query;
  const sales = await dashboardService.getSalesSummary({ from, to, groupBy });
  res.json({ success: true, data: sales });
});

export const getPopularItems = asyncHandler(async (req, res) => {
  const { from, to, limit } = req.query;
  const data = await dashboardService.getPopularItems({
    from,
    to,
    limit: limit ? parseInt(limit, 10) : 10,
  });
  res.json({ success: true, data });
});

export const getPopularPokeTypes = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const data = await dashboardService.getPopularPokeTypes({ from, to });
  res.json({ success: true, data });
});

export const getCostAnalysis = asyncHandler(async (_req, res) => {
  const data = await dashboardService.getCostAnalysis();
  res.json({ success: true, data });
});
