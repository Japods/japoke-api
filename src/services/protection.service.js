import Order from '../models/Order.js';
import BsProtection from '../models/BsProtection.js';
import { getRatesSnapshot } from './exchangeRate.service.js';
import { AppError } from '../utils/app-error.js';

/**
 * Get the total Bs received from verified Pago Móvil orders.
 */
async function getTotalBsReceived() {
  const result = await Order.aggregate([
    {
      $match: {
        'payment.method': 'pago_movil',
        'payment.status': 'verified',
        status: { $nin: ['cancelled'] },
      },
    },
    {
      $group: {
        _id: null,
        totalBs: { $sum: '$payment.amountBs' },
        orderCount: { $sum: 1 },
      },
    },
  ]);

  return {
    totalBs: result[0]?.totalBs || 0,
    orderCount: result[0]?.orderCount || 0,
  };
}

/**
 * Get USD received directly from efectivo_usd and binance_usdt orders.
 */
async function getDirectUsdReceived() {
  const result = await Order.aggregate([
    {
      $match: {
        'payment.method': { $in: ['efectivo_usd', 'binance_usdt'] },
        'payment.status': 'verified',
        status: { $nin: ['cancelled'] },
      },
    },
    {
      $group: {
        _id: '$payment.method',
        totalUsd: { $sum: '$payment.amountUsd' },
        orderCount: { $sum: 1 },
      },
    },
  ]);

  const byMethod = {};
  for (const r of result) {
    byMethod[r._id] = { totalUsd: r.totalUsd, orderCount: r.orderCount };
  }

  return {
    efectivo: byMethod.efectivo_usd || { totalUsd: 0, orderCount: 0 },
    usdt: byMethod.binance_usdt || { totalUsd: 0, orderCount: 0 },
  };
}

/**
 * Get totals of Bs already protected, grouped by destination.
 */
async function getProtectedTotals() {
  const result = await BsProtection.aggregate([
    {
      $group: {
        _id: '$destination',
        totalBs: { $sum: '$amountBs' },
        totalUsd: { $sum: '$amountUsd' },
        count: { $sum: 1 },
      },
    },
  ]);

  const totals = {
    usdt: { totalBs: 0, totalUsd: 0, count: 0 },
    efectivo_usd: { totalBs: 0, totalUsd: 0, count: 0 },
  };

  for (const r of result) {
    const key = r._id || 'usdt';
    if (totals[key]) {
      totals[key] = { totalBs: r.totalBs, totalUsd: r.totalUsd, count: r.count };
    }
  }

  return totals;
}

/**
 * Full wallet summary with balances per type.
 */
export async function getProtectionSummary() {
  const [bsReceived, directUsd, protectedTotals, rates] = await Promise.all([
    getTotalBsReceived(),
    getDirectUsdReceived(),
    getProtectedTotals(),
    getRatesSnapshot(),
  ]);

  const totalProtectedBs =
    protectedTotals.usdt.totalBs + protectedTotals.efectivo_usd.totalBs;
  const totalProtectedUsd =
    protectedTotals.usdt.totalUsd + protectedTotals.efectivo_usd.totalUsd;
  const totalProtectionCount =
    protectedTotals.usdt.count + protectedTotals.efectivo_usd.count;

  const unprotectedBs = bsReceived.totalBs - totalProtectedBs;
  const currentRate = rates.dolarParalelo;
  const potentialUsd = currentRate > 0 ? unprotectedBs / currentRate : 0;

  return {
    received: {
      totalBs: bsReceived.totalBs,
      orderCount: bsReceived.orderCount,
    },
    protected: {
      totalBs: totalProtectedBs,
      totalUsd: totalProtectedUsd,
      protectionCount: totalProtectionCount,
    },
    unprotectedBs,
    currentRate,
    potentialUsd,
    wallets: {
      usdt: {
        fromProtection: protectedTotals.usdt.totalUsd,
        fromOrders: directUsd.usdt.totalUsd,
        total: protectedTotals.usdt.totalUsd + directUsd.usdt.totalUsd,
        orderCount: directUsd.usdt.orderCount,
        protectionCount: protectedTotals.usdt.count,
      },
      efectivo: {
        fromProtection: protectedTotals.efectivo_usd.totalUsd,
        fromOrders: directUsd.efectivo.totalUsd,
        total: protectedTotals.efectivo_usd.totalUsd + directUsd.efectivo.totalUsd,
        orderCount: directUsd.efectivo.orderCount,
        protectionCount: protectedTotals.efectivo_usd.count,
      },
    },
  };
}

/**
 * Create a new protection record.
 */
export async function createProtection({ amountBs, rateDolarParalelo, destination, notes }) {
  if (!amountBs || amountBs <= 0) {
    throw new AppError('El monto en Bs debe ser mayor a 0', 400);
  }
  if (!rateDolarParalelo || rateDolarParalelo <= 0) {
    throw new AppError('La tasa debe ser mayor a 0', 400);
  }
  if (!['usdt', 'efectivo_usd'].includes(destination)) {
    throw new AppError('Destino inválido. Usa "usdt" o "efectivo_usd"', 400);
  }

  const summary = await getProtectionSummary();
  if (amountBs > summary.unprotectedBs + 0.01) {
    throw new AppError(
      `Solo tienes ${summary.unprotectedBs.toFixed(2)} Bs sin proteger`,
      400,
    );
  }

  const amountUsd = amountBs / rateDolarParalelo;

  const protection = await BsProtection.create({
    amountBs,
    rateDolarParalelo,
    amountUsd,
    destination,
    notes: notes || '',
    protectedAt: new Date(),
  });

  return protection;
}

/**
 * Get protection history with pagination.
 */
export async function getProtectionHistory({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    BsProtection.find()
      .sort({ protectedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BsProtection.countDocuments(),
  ]);

  return {
    records,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
