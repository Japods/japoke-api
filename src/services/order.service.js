import Order from '../models/Order.js';
import { validatePokeItem } from './poke-builder.service.js';
import { deductOrderStock, restoreOrderStock } from './inventory.service.js';
import { notifyStatusChange } from './whatsapp.service.js';
import { getRatesSnapshot } from './exchangeRate.service.js';
import { getStoreStatus } from './settings.service.js';
import { AppError } from '../utils/app-error.js';

const VALID_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered'],
  delivered: [],
  cancelled: [],
};

async function generateOrderNumber() {
  const lastOrder = await Order.findOne().sort({ createdAt: -1 }).lean();
  if (!lastOrder) return 'JAP-0001';

  const lastNum = parseInt(lastOrder.orderNumber.split('-')[1], 10);
  return `JAP-${String(lastNum + 1).padStart(4, '0')}`;
}

export async function createOrder(customerData, items, paymentData = {}, deliveryTime = null, splitPaymentData = null) {
  const { isOpen } = await getStoreStatus();
  if (!isOpen) {
    throw new AppError('El local está cerrado en este momento. ¡Vuelve pronto!', 503);
  }

  if (!items || items.length === 0) {
    throw new AppError('El pedido debe tener al menos un poke bowl', 400);
  }

  // Validate each poke item
  const validatedItems = [];
  for (const item of items) {
    const validated = await validatePokeItem(item.pokeType, item.selections, item.extras);
    validatedItems.push(validated);
  }

  const subtotal = validatedItems.reduce((sum, item) => sum + item.itemTotal, 0);
  const total = subtotal;

  // Get exchange rate snapshot
  const rates = await getRatesSnapshot();

  // Calculate payment amounts
  const amountEur = total;
  const amountBs = rates.euroBcv > 0 ? Math.round(total * rates.euroBcv * 100) / 100 : 0;
  const amountUsd = rates.dolarParalelo > 0 ? Math.round(amountBs / rates.dolarParalelo * 100) / 100 : 0;

  const orderNumber = await generateOrderNumber();

  const order = await Order.create({
    orderNumber,
    customer: customerData,
    items: validatedItems,
    subtotal,
    total,
    payment: {
      method: paymentData.method || 'pago_movil',
      referenceId: paymentData.referenceId || '',
      referenceImageUrl: paymentData.referenceImageUrl || '',
      amountEur,
      amountBs: (splitPaymentData?.method && paymentData.amountBs != null) ? paymentData.amountBs : amountBs,
      amountUsd: (splitPaymentData?.method && paymentData.amountUsd != null) ? paymentData.amountUsd : amountUsd,
      rates,
      status: 'pending',
    },
    splitPayment: splitPaymentData?.method ? {
      method: splitPaymentData.method,
      amountBs: splitPaymentData.amountBs || undefined,
      amountUsd: splitPaymentData.amountUsd || undefined,
      referenceId: splitPaymentData.referenceId || '',
      status: 'pending',
    } : undefined,
    deliveryTime: deliveryTime || null,
    status: 'pending',
  });

  return order;
}

export async function deleteOrder(orderId) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Pedido no encontrado', 404);

  await restoreOrderStock(order);
  await Order.findByIdAndDelete(orderId);
}

export async function updatePaymentStatus(orderId, paymentStatus) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Pedido no encontrado', 404);

  if (!['pending', 'verified', 'rejected'].includes(paymentStatus)) {
    throw new AppError('Estado de pago inválido', 400);
  }

  order.payment.status = paymentStatus;
  await order.save();
  return order;
}

export async function getOrderById(id) {
  // Search by orderNumber or _id
  const order = await Order.findOne({
    $or: [{ orderNumber: id.toUpperCase() }, ...(id.match(/^[0-9a-f]{24}$/i) ? [{ _id: id }] : [])],
  }).lean();

  if (!order) throw new AppError('Pedido no encontrado', 404);
  return order;
}

export async function getOrders(filters = {}) {
  const query = {};

  if (filters.status) query.status = filters.status;

  if (filters.from || filters.to) {
    query.createdAt = {};
    if (filters.from) query.createdAt.$gte = new Date(filters.from);
    if (filters.to) query.createdAt.$lte = new Date(filters.to);
  }

  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const [orders, totalCount] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(query),
  ]);

  return {
    orders,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

export async function updatePaymentDetails(orderId, data) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Pedido no encontrado', 404);

  const { method, amountBs, amountUsd, referenceId } = data;

  if (method !== undefined) {
    if (!['pago_movil', 'efectivo_usd', 'binance_usdt'].includes(method)) {
      throw new AppError('Método de pago inválido', 400);
    }
    order.payment.method = method;
  }
  if (amountBs !== undefined) order.payment.amountBs = amountBs;
  if (amountUsd !== undefined) order.payment.amountUsd = amountUsd;
  if (referenceId !== undefined) order.payment.referenceId = referenceId;

  await order.save();
  return order;
}

export async function addSplitPayment(orderId, paymentData) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Pedido no encontrado', 404);

  if (order.splitPayment && order.splitPayment.method) {
    throw new AppError('El pedido ya tiene un pago dividido', 400);
  }
  if (order.status === 'cancelled') {
    throw new AppError('No se puede agregar pago a una orden cancelada', 400);
  }

  const { method, amountBs, amountUsd, referenceId } = paymentData;

  if (!method || !['pago_movil', 'efectivo_usd', 'binance_usdt'].includes(method)) {
    throw new AppError('Método de pago inválido', 400);
  }
  if (method === order.payment.method) {
    throw new AppError('El método del pago dividido debe ser diferente al pago principal', 400);
  }

  order.splitPayment = {
    method,
    amountBs: amountBs || undefined,
    amountUsd: amountUsd || undefined,
    referenceId: referenceId || '',
    status: 'pending',
  };

  await order.save();
  return order;
}

export async function updateSplitPaymentStatus(orderId, status) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Pedido no encontrado', 404);

  if (!order.splitPayment || !order.splitPayment.method) {
    throw new AppError('El pedido no tiene un pago dividido', 404);
  }
  if (!['pending', 'verified', 'rejected'].includes(status)) {
    throw new AppError('Estado de pago inválido', 400);
  }

  order.splitPayment.status = status;
  await order.save();
  return order;
}

export async function updateStatus(id, newStatus) {
  const order = await Order.findById(id);
  if (!order) throw new AppError('Pedido no encontrado', 404);

  const allowed = VALID_TRANSITIONS[order.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new AppError(
      `No se puede cambiar de '${order.status}' a '${newStatus}'. Transiciones válidas: ${allowed.join(', ') || 'ninguna'}`,
      400
    );
  }

  order.status = newStatus;
  await order.save();

  if (newStatus === 'confirmed') {
    await deductOrderStock(order);
  }

  notifyStatusChange(order, newStatus).catch((err) =>
    console.error(`[WhatsApp] Fallo notificacion para ${order.orderNumber}:`, err.message)
  );

  return order;
}
