import { asyncHandler } from '../utils/async-handler.js';
import { AppError } from '../utils/app-error.js';
import * as purchasesService from '../services/purchases.service.js';

export const getPurchases = asyncHandler(async (req, res) => {
  const { page, limit, from, to } = req.query;
  const result = await purchasesService.getPurchases({
    page: Number(page) || 1,
    limit: Number(limit) || 50,
    from,
    to,
  });
  res.json({ success: true, ...result });
});

export const getPurchaseById = asyncHandler(async (req, res) => {
  const purchase = await purchasesService.getPurchaseById(req.params.id);
  if (!purchase) throw new AppError('Compra no encontrada', 404);
  res.json({ success: true, data: purchase });
});

export const createPurchase = asyncHandler(async (req, res) => {
  const purchase = await purchasesService.createPurchase(req.body);
  res.status(201).json({ success: true, data: purchase });
});

export const updatePurchase = asyncHandler(async (req, res) => {
  const purchase = await purchasesService.updatePurchase(req.params.id, req.body);
  if (!purchase) throw new AppError('Compra no encontrada', 404);
  res.json({ success: true, data: purchase });
});

export const deletePurchase = asyncHandler(async (req, res) => {
  const purchase = await purchasesService.deletePurchase(req.params.id);
  if (!purchase) throw new AppError('Compra no encontrada', 404);
  res.json({ success: true, message: 'Compra eliminada' });
});

// Items y Supplies trackables para el selector del formulario
export const getStockableItems = asyncHandler(async (_req, res) => {
  const data = await purchasesService.getStockableItems();
  res.json({ success: true, data });
});
