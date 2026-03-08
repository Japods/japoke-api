import Order from '../models/Order.js';
import Promotion from '../models/Promotion.js';
import DiscountCode from '../models/DiscountCode.js';
import { validatePokeItem } from './poke-builder.service.js';
import { deductOrderStock, restoreOrderStock } from './inventory.service.js';
import { notifyStatusChange } from './whatsapp.service.js';
import { getRatesSnapshot } from './exchangeRate.service.js';
import { getStoreStatus, getMaxDiscountPct } from './settings.service.js';
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

export async function validateDiscountCode(code) {
  const discount = await DiscountCode.findOne({ code: code.toUpperCase() });
  if (!discount) throw new AppError('Código de descuento no encontrado', 404);
  if (!discount.isValid()) throw new AppError('Código de descuento expirado o agotado', 400);
  return { code: discount.code, percentage: discount.percentage };
}

export async function createOrder(customerData, items, paymentData = {}, deliveryTime = null, splitPaymentData = null, promoData = {}) {
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
  let total = subtotal;

  // --- Promotion validation ---
  let promotionRecord = null;
  const { promotionId, promoItemIndexes, discountCode } = promoData;

  if (promotionId && discountCode) {
    throw new AppError('No se puede usar una promoción y un código de descuento a la vez', 400);
  }

  if (promotionId) {
    const promo = await Promotion.findById(promotionId);
    if (!promo || !promo.active) throw new AppError('Promoción no disponible', 400);

    if (!promoItemIndexes || promoItemIndexes.length !== promo.totalQuantity) {
      throw new AppError(`La promoción requiere ${promo.totalQuantity} poke(s)`, 400);
    }

    // Validate promo items match required poke types
    const requiredCounts = {};
    for (const pt of promo.pokeTypes) {
      requiredCounts[pt.pokeType.toString()] = (requiredCounts[pt.pokeType.toString()] || 0) + pt.quantity;
    }

    const actualCounts = {};
    for (const idx of promoItemIndexes) {
      if (idx < 0 || idx >= validatedItems.length) throw new AppError('Índice de poke inválido en la promoción', 400);
      const typeId = validatedItems[idx].pokeType.toString();
      actualCounts[typeId] = (actualCounts[typeId] || 0) + 1;
    }

    for (const [typeId, qty] of Object.entries(requiredCounts)) {
      if ((actualCounts[typeId] || 0) < qty) {
        throw new AppError('Los pokes seleccionados no coinciden con la promoción', 400);
      }
    }

    // Calculate promo: non-promo items at full price + promo price + promo extras
    const promoItemsExtrasTotal = promoItemIndexes.reduce((sum, idx) => {
      return sum + (validatedItems[idx].extras || []).reduce((s, e) => s + e.subtotal, 0);
    }, 0);

    const nonPromoTotal = validatedItems.reduce((sum, item, i) => {
      return promoItemIndexes.includes(i) ? sum : sum + item.itemTotal;
    }, 0);

    promotionRecord = {
      promotionId: promo._id,
      name: promo.name,
      promoPrice: promo.promoPrice,
      itemIndexes: promoItemIndexes,
    };

    total = nonPromoTotal + promo.promoPrice + promoItemsExtrasTotal;
  }

  // --- Discount code validation ---
  let discountRecord = null;

  if (discountCode && !promotionId) {
    const discount = await DiscountCode.findOne({ code: discountCode.toUpperCase() });
    if (!discount || !discount.isValid()) throw new AppError('Código de descuento inválido o expirado', 400);

    const discountAmount = Math.round(subtotal * (discount.percentage / 100) * 100) / 100;
    discountRecord = {
      code: discount.code,
      percentage: discount.percentage,
      discountAmount,
    };

    discount.usageCount += 1;
    await discount.save();

    total = Math.round((subtotal - discountAmount) * 100) / 100;
  }

  // Get exchange rate snapshot
  const rates = await getRatesSnapshot();

  // Calculate full payment amounts with discount cap
  const amountEur = total;
  const fullAmountBs = rates.euroBcv > 0 ? Math.round(total * rates.euroBcv * 100) / 100 : 0;
  const maxDiscount = await getMaxDiscountPct();
  const rawAmountUsd = rates.dolarParalelo > 0 ? fullAmountBs / rates.dolarParalelo : 0;
  const minAmountUsd = amountEur * (1 - maxDiscount / 100); // floor based on max discount
  const fullAmountUsd = Math.round(Math.max(rawAmountUsd, minAmountUsd) * 100) / 100;

  // When split payment exists, compute primary portion if caller didn't provide it
  let primaryAmountBs = fullAmountBs;
  let primaryAmountUsd = fullAmountUsd;

  if (splitPaymentData?.method) {
    if (paymentData.amountBs != null) {
      primaryAmountBs = paymentData.amountBs;
    } else {
      // Caller didn't send partial Bs — auto-compute by subtracting split portion
      const isUsd = (m) => m === 'efectivo_usd' || m === 'binance_usdt';
      if (isUsd(splitPaymentData.method) && splitPaymentData.amountUsd && rates.dolarParalelo > 0) {
        const splitBs = Math.round(splitPaymentData.amountUsd * rates.dolarParalelo * 100) / 100;
        primaryAmountBs = Math.max(0, Math.round((fullAmountBs - splitBs) * 100) / 100);
      } else if (splitPaymentData.method === 'pago_movil' && splitPaymentData.amountBs) {
        primaryAmountBs = Math.max(0, Math.round((fullAmountBs - splitPaymentData.amountBs) * 100) / 100);
      }
    }

    if (paymentData.amountUsd != null) {
      primaryAmountUsd = paymentData.amountUsd;
    } else {
      primaryAmountUsd = rates.dolarParalelo > 0 ? Math.round(primaryAmountBs / rates.dolarParalelo * 100) / 100 : 0;
    }
  }

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
      amountBs: primaryAmountBs,
      amountUsd: primaryAmountUsd,
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
    promotion: promotionRecord || undefined,
    discountCode: discountRecord || undefined,
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

export async function updatePaymentStatus(orderId, paymentStatus, recalculateRates = false) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Pedido no encontrado', 404);

  if (!['pending', 'verified', 'rejected'].includes(paymentStatus)) {
    throw new AppError('Estado de pago inválido', 400);
  }

  // Recalculate amounts with current rates when verifying a pending payment
  if (paymentStatus === 'verified' && order.payment.status === 'pending' && recalculateRates) {
    const rates = await getRatesSnapshot();
    const amountEur = order.payment.amountEur || order.total;
    const maxDiscount = await getMaxDiscountPct();

    const fullAmountBs = rates.euroBcv > 0 ? Math.round(amountEur * rates.euroBcv * 100) / 100 : 0;
    const rawAmountUsd = rates.dolarParalelo > 0 ? fullAmountBs / rates.dolarParalelo : 0;
    const minAmountUsd = amountEur * (1 - maxDiscount / 100);
    const fullAmountUsd = Math.round(Math.max(rawAmountUsd, minAmountUsd) * 100) / 100;

    // If there's a split payment, recalculate proportionally
    if (order.splitPayment?.method) {
      // Keep split amounts as-is, recalculate primary as remainder
      const splitBs = order.splitPayment.amountBs || 0;
      const splitUsd = order.splitPayment.amountUsd || 0;
      const isUsdSplit = order.splitPayment.method !== 'pago_movil';

      if (isUsdSplit && splitUsd > 0 && rates.dolarParalelo > 0) {
        const splitBsEquiv = Math.round(splitUsd * rates.dolarParalelo * 100) / 100;
        order.payment.amountBs = Math.max(0, Math.round((fullAmountBs - splitBsEquiv) * 100) / 100);
        order.payment.amountUsd = Math.max(0, Math.round((fullAmountUsd - splitUsd) * 100) / 100);
      } else if (splitBs > 0) {
        order.payment.amountBs = Math.max(0, Math.round((fullAmountBs - splitBs) * 100) / 100);
        order.payment.amountUsd = rates.dolarParalelo > 0
          ? Math.round(order.payment.amountBs / rates.dolarParalelo * 100) / 100
          : 0;
      }
    } else {
      order.payment.amountBs = fullAmountBs;
      order.payment.amountUsd = fullAmountUsd;
    }

    order.payment.rates = rates;
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
    // Prevent setting primary method equal to split method
    if (order.splitPayment?.method && method === order.splitPayment.method) {
      throw new AppError('El método principal no puede ser igual al pago dividido', 400);
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

  // Adjust primary payment amounts so they reflect only the primary portion
  const dolarParalelo = order.payment.rates?.dolarParalelo || 0;
  const isUsd = (m) => m === 'efectivo_usd' || m === 'binance_usdt';

  if (isUsd(method) && amountUsd && dolarParalelo > 0) {
    // Split pays in USD → reduce primary Bs and USD by the split portion
    const splitBsEquivalent = Math.round(amountUsd * dolarParalelo * 100) / 100;
    if (order.payment.amountBs) {
      order.payment.amountBs = Math.max(0, Math.round((order.payment.amountBs - splitBsEquivalent) * 100) / 100);
    }
    if (order.payment.amountUsd) {
      order.payment.amountUsd = Math.max(0, Math.round((order.payment.amountUsd - amountUsd) * 100) / 100);
    }
  } else if (method === 'pago_movil' && amountBs && dolarParalelo > 0) {
    // Split pays in Bs → reduce primary USD and Bs by the split portion
    const splitUsdEquivalent = Math.round((amountBs / dolarParalelo) * 100) / 100;
    if (order.payment.amountBs) {
      order.payment.amountBs = Math.max(0, Math.round((order.payment.amountBs - amountBs) * 100) / 100);
    }
    if (order.payment.amountUsd) {
      order.payment.amountUsd = Math.max(0, Math.round((order.payment.amountUsd - splitUsdEquivalent) * 100) / 100);
    }
  }

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

export async function setCourtesy(orderId, isCourtesy, reason = '') {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Pedido no encontrado', 404);

  order.isCourtesy = isCourtesy;
  order.courtesyReason = reason;

  if (isCourtesy) {
    // Auto-verify payment on courtesy orders
    order.payment.status = 'verified';
    if (order.splitPayment?.method) {
      order.splitPayment.status = 'verified';
    }
  }

  await order.save();
  return order;
}

export async function getUnpaidOrders() {
  // Find all non-cancelled orders where primary OR split payment is still pending
  const orders = await Order.find({
    status: { $nin: ['cancelled'] },
    isCourtesy: { $ne: true },
    $or: [
      { 'payment.status': 'pending' },
      { 'splitPayment.method': { $exists: true, $ne: null }, 'splitPayment.status': 'pending' },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  return orders;
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
