import { asyncHandler } from '../utils/async-handler.js';
import Category from '../models/Category.js';
import Item from '../models/Item.js';
import PokeType from '../models/PokeType.js';
import * as orderService from '../services/order.service.js';
import { AppError } from '../utils/app-error.js';

// --- Orders ---
export const getOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getOrders(req.query);
  res.json({ success: true, ...result });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateStatus(req.params.id, req.body.status);
  res.json({ success: true, data: order });
});

export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updatePaymentStatus(req.params.id, req.body.paymentStatus);
  res.json({ success: true, data: order });
});

export const updatePaymentDetails = asyncHandler(async (req, res) => {
  const order = await orderService.updatePaymentDetails(req.params.id, req.body);
  res.json({ success: true, data: order });
});

export const addSplitPayment = asyncHandler(async (req, res) => {
  const order = await orderService.addSplitPayment(req.params.id, req.body);
  res.status(201).json({ success: true, data: order });
});

export const updateSplitPaymentStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateSplitPaymentStatus(req.params.id, req.body.status);
  res.json({ success: true, data: order });
});

// --- Categories ---
export const getCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find().sort('displayOrder').lean();
  res.json({ success: true, data: categories });
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);
  res.status(201).json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!category) throw new AppError('Categoría no encontrada', 404);
  res.json({ success: true, data: category });
});

// --- Items ---
export const getItems = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.category) query.category = req.query.category;
  const items = await Item.find(query).populate('category', 'name slug type').sort('displayOrder').lean();
  res.json({ success: true, data: items });
});

export const createItem = asyncHandler(async (req, res) => {
  const item = await Item.create(req.body);
  res.status(201).json({ success: true, data: item });
});

export const updateItem = asyncHandler(async (req, res) => {
  const item = await Item.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!item) throw new AppError('Item no encontrado', 404);
  res.json({ success: true, data: item });
});

// --- Poke Types ---
export const getPokeTypes = asyncHandler(async (_req, res) => {
  const pokeTypes = await PokeType.find().sort('slug').lean();
  res.json({ success: true, data: pokeTypes });
});

export const createPokeType = asyncHandler(async (req, res) => {
  const pokeType = await PokeType.create(req.body);
  res.status(201).json({ success: true, data: pokeType });
});

export const updatePokeType = asyncHandler(async (req, res) => {
  const pokeType = await PokeType.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!pokeType) throw new AppError('Tipo de poke no encontrado', 404);
  res.json({ success: true, data: pokeType });
});
