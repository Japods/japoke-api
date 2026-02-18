import { asyncHandler } from '../utils/async-handler.js';
import * as inventoryService from '../services/inventory.service.js';
import Supply from '../models/Supply.js';
import { AppError } from '../utils/app-error.js';

export const getInventory = asyncHandler(async (_req, res) => {
  const data = await inventoryService.getInventoryStatus();
  res.json({ success: true, data });
});

export const getAlerts = asyncHandler(async (_req, res) => {
  const data = await inventoryService.getAlerts();
  res.json({ success: true, data });
});

export const getMovements = asyncHandler(async (req, res) => {
  const data = await inventoryService.getMovements(req.query);
  res.json({ success: true, ...data });
});

export const recordPurchase = asyncHandler(async (req, res) => {
  const result = await inventoryService.recordPurchase(req.body);
  res.status(201).json({ success: true, data: result });
});

export const adjustStock = asyncHandler(async (req, res) => {
  const result = await inventoryService.adjustStock(req.body);
  res.json({ success: true, data: result });
});

// --- Supplies CRUD ---
export const getSupplies = asyncHandler(async (_req, res) => {
  const supplies = await Supply.find().sort('name').lean();
  res.json({ success: true, data: supplies });
});

export const createSupply = asyncHandler(async (req, res) => {
  const supply = await Supply.create(req.body);
  res.status(201).json({ success: true, data: supply });
});

export const updateSupply = asyncHandler(async (req, res) => {
  const supply = await Supply.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!supply) throw new AppError('Insumo no encontrado', 404);
  res.json({ success: true, data: supply });
});
