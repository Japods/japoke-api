import { asyncHandler } from '../utils/async-handler.js';
import Category from '../models/Category.js';
import Item from '../models/Item.js';
import PokeType from '../models/PokeType.js';
import Order from '../models/Order.js';
import Promotion from '../models/Promotion.js';
import DiscountCode from '../models/DiscountCode.js';
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
  const { paymentStatus, recalculateRates } = req.body;
  const order = await orderService.updatePaymentStatus(req.params.id, paymentStatus, recalculateRates);
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

export const setCourtesy = asyncHandler(async (req, res) => {
  const { isCourtesy, reason } = req.body;
  const order = await orderService.setCourtesy(req.params.id, isCourtesy, reason);
  res.json({ success: true, data: order });
});

export const getUnpaidOrders = asyncHandler(async (_req, res) => {
  const orders = await orderService.getUnpaidOrders();
  res.json({ success: true, data: orders });
});

export const setDeliveryFree = asyncHandler(async (req, res) => {
  const { deliveryFree } = req.body;
  if (typeof deliveryFree !== 'boolean') throw new AppError('deliveryFree debe ser true o false', 400);

  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Pedido no encontrado', 404);

  order.deliveryFree = deliveryFree;
  if (deliveryFree) order.deliveryCostBs = 0;
  await order.save();

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

// --- Promotions ---
export const getPromotions = asyncHandler(async (_req, res) => {
  const promotions = await Promotion.find()
    .populate('pokeTypes.pokeType', 'name slug basePrice')
    .populate('allowedProteins', 'name slug tier')
    .sort('displayOrder')
    .lean();
  res.json({ success: true, data: promotions });
});

export const createPromotion = asyncHandler(async (req, res) => {
  const { pokeTypes } = req.body;
  const totalQuantity = (pokeTypes || []).reduce((sum, pt) => sum + pt.quantity, 0);
  const promotion = await Promotion.create({ ...req.body, totalQuantity });
  res.status(201).json({ success: true, data: promotion });
});

export const updatePromotion = asyncHandler(async (req, res) => {
  if (req.body.pokeTypes) {
    req.body.totalQuantity = req.body.pokeTypes.reduce((sum, pt) => sum + pt.quantity, 0);
  }
  const promotion = await Promotion.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!promotion) throw new AppError('Promoción no encontrada', 404);
  res.json({ success: true, data: promotion });
});

export const deletePromotion = asyncHandler(async (req, res) => {
  const promotion = await Promotion.findByIdAndDelete(req.params.id);
  if (!promotion) throw new AppError('Promoción no encontrada', 404);
  res.json({ success: true, message: 'Promoción eliminada' });
});

// --- Discount Codes ---
export const getDiscountCodes = asyncHandler(async (_req, res) => {
  const codes = await DiscountCode.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: codes });
});

export const createDiscountCode = asyncHandler(async (req, res) => {
  const code = await DiscountCode.create(req.body);
  res.status(201).json({ success: true, data: code });
});

export const updateDiscountCode = asyncHandler(async (req, res) => {
  const code = await DiscountCode.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!code) throw new AppError('Código no encontrado', 404);
  res.json({ success: true, data: code });
});

export const deleteDiscountCode = asyncHandler(async (req, res) => {
  const code = await DiscountCode.findByIdAndDelete(req.params.id);
  if (!code) throw new AppError('Código no encontrado', 404);
  res.json({ success: true, message: 'Código eliminado' });
});
