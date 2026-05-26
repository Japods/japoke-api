import Order from '../models/Order.js';
import Item from '../models/Item.js';
import { validatePokeItem } from './poke-builder.service.js';
import { deductOrderStock } from './inventory.service.js';
import { getRatesSnapshot } from './exchangeRate.service.js';
import { generateOrderNumber } from './order.service.js';
import { AppError } from '../utils/app-error.js';

const DEFAULT_COMMISSION_RATE = 0.08;

function round2(n) {
  return Math.round(n * 100) / 100;
}

export async function createYummyOrder({
  externalOrderId,
  items,
  addOns = [],
  commissionRate = DEFAULT_COMMISSION_RATE,
  expectedPayoutDate = null,
  notes = '',
  customerName = '',
}) {
  if (!externalOrderId || !externalOrderId.trim()) {
    throw new AppError('El número de orden de Yummy es requerido', 400);
  }
  if (!items || items.length === 0) {
    throw new AppError('La orden debe tener al menos un poke bowl', 400);
  }
  if (commissionRate < 0 || commissionRate > 1) {
    throw new AppError('Comisión inválida (debe estar entre 0 y 1)', 400);
  }

  // Validate poke items using yummy pricing
  const validatedItems = [];
  for (const item of items) {
    const validated = await validatePokeItem(
      item.pokeType,
      item.selections,
      item.extras,
      { priceMode: 'yummy' }
    );
    validatedItems.push(validated);
  }

  // Validate add-ons with yummy prices (yummyPrice with fallback to extraPrice)
  let addOnsTotal = 0;
  const validatedAddOns = [];
  if (addOns.length > 0) {
    const addOnItems = await Item.find({
      _id: { $in: addOns.map((a) => a.item) },
    })
      .populate('category')
      .lean();
    const addOnMap = {};
    for (const ai of addOnItems) {
      addOnMap[ai._id.toString()] = ai;
    }
    for (const addOn of addOns) {
      const item = addOnMap[addOn.item?.toString()];
      if (!item) throw new AppError(`Add-on no encontrado: ${addOn.item}`, 400);
      if (!item.isAvailable) {
        throw new AppError(`${item.name} no está disponible`, 400);
      }
      if (!['beverage', 'dessert'].includes(item.category.type)) {
        throw new AppError(`${item.name} no es un complemento válido`, 400);
      }
      const qty = addOn.quantity || 1;
      const unitPrice =
        item.yummyPrice != null ? item.yummyPrice : item.extraPrice || 0;
      const subtotal = unitPrice * qty;
      addOnsTotal += subtotal;
      validatedAddOns.push({
        item: item._id,
        name: item.name,
        unitPrice,
        quantity: qty,
        subtotal,
      });
    }
  }

  const subtotal = round2(
    validatedItems.reduce((sum, it) => sum + it.itemTotal, 0) + addOnsTotal
  );
  const total = subtotal;

  // Payout calculation
  const grossAmount = total;
  const commissionAmount = round2(grossAmount * commissionRate);
  const netAmount = round2(grossAmount - commissionAmount);

  // BCV rate snapshot (Yummy paga $ a BCV)
  const rates = await getRatesSnapshot();
  const ratesSnapshot = { dolarBcv: rates.dolarBcv || 0 };

  const orderNumber = await generateOrderNumber();

  const order = await Order.create({
    orderNumber,
    channel: 'yummy',
    external: {
      orderId: externalOrderId.trim(),
      platform: 'yummy',
    },
    customer: {
      name: customerName || 'Cliente Yummy',
      notes,
    },
    items: validatedItems,
    addOns: validatedAddOns,
    subtotal,
    total,
    payout: {
      status: 'pending',
      commissionRate,
      grossAmount,
      commissionAmount,
      netAmount,
      expectedPayoutDate: expectedPayoutDate || null,
      actualPayoutDate: null,
      payoutId: null,
      ratesSnapshot,
    },
    status: 'delivered',
  });

  // Deduct inventory explicitly (Yummy skips the confirmed → preparing → ready flow)
  await deductOrderStock(order);

  return order;
}

export async function listYummyOrders(filters = {}) {
  const query = { channel: 'yummy' };

  if (filters.payoutStatus) {
    query['payout.status'] = filters.payoutStatus;
  }
  if (filters.from || filters.to) {
    query.createdAt = {};
    if (filters.from) query.createdAt.$gte = new Date(filters.from);
    if (filters.to) query.createdAt.$lte = new Date(filters.to);
  }

  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const [orders, totalCount] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
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

export async function getPendingPayoutSummary() {
  const orders = await Order.find({
    channel: 'yummy',
    'payout.status': 'pending',
  })
    .sort({ createdAt: 1 })
    .lean();

  const summary = orders.reduce(
    (acc, o) => {
      acc.grossAmount += o.payout?.grossAmount || 0;
      acc.commissionAmount += o.payout?.commissionAmount || 0;
      acc.netAmount += o.payout?.netAmount || 0;
      return acc;
    },
    { grossAmount: 0, commissionAmount: 0, netAmount: 0 }
  );

  return {
    orders,
    orderCount: orders.length,
    grossAmount: round2(summary.grossAmount),
    commissionAmount: round2(summary.commissionAmount),
    netAmount: round2(summary.netAmount),
  };
}
