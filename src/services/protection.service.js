import Order from '../models/Order.js';
import BsProtection from '../models/BsProtection.js';
import WalletTransaction from '../models/WalletTransaction.js';
import { getRatesSnapshot } from './exchangeRate.service.js';
import { AppError } from '../utils/app-error.js';

/**
 * Get the total Bs received from verified Pago Móvil orders (primary + split).
 */
async function getTotalBsReceived() {
  const [primaryResult, splitResult] = await Promise.all([
    Order.aggregate([
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
    ]),
    Order.aggregate([
      {
        $match: {
          'splitPayment.method': 'pago_movil',
          'splitPayment.status': 'verified',
          status: { $nin: ['cancelled'] },
        },
      },
      {
        $group: {
          _id: null,
          totalBs: { $sum: '$splitPayment.amountBs' },
          orderCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  return {
    totalBs: (primaryResult[0]?.totalBs || 0) + (splitResult[0]?.totalBs || 0),
    orderCount: (primaryResult[0]?.orderCount || 0) + (splitResult[0]?.orderCount || 0),
  };
}

/**
 * Get USD received directly from efectivo_usd and binance_usdt orders (primary + split).
 */
async function getDirectUsdReceived() {
  const [primaryResult, splitResult] = await Promise.all([
    Order.aggregate([
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
    ]),
    Order.aggregate([
      {
        $match: {
          'splitPayment.method': { $in: ['efectivo_usd', 'binance_usdt'] },
          'splitPayment.status': 'verified',
          status: { $nin: ['cancelled'] },
        },
      },
      {
        $group: {
          _id: '$splitPayment.method',
          totalUsd: { $sum: '$splitPayment.amountUsd' },
          orderCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  const byMethod = {};
  for (const r of primaryResult) {
    byMethod[r._id] = { totalUsd: r.totalUsd, orderCount: r.orderCount };
  }
  for (const r of splitResult) {
    if (byMethod[r._id]) {
      byMethod[r._id].totalUsd += r.totalUsd || 0;
      byMethod[r._id].orderCount += r.orderCount;
    } else {
      byMethod[r._id] = { totalUsd: r.totalUsd || 0, orderCount: r.orderCount };
    }
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
 * Get aggregated totals from WalletTransaction records.
 */
async function getWalletTransactionTotals() {
  const result = await WalletTransaction.aggregate([
    {
      $group: {
        _id: { type: '$type', wallet: '$wallet' },
        totalUsd: { $sum: '$amountUsd' },
        totalBs: { $sum: '$amountBs' },
        count: { $sum: 1 },
      },
    },
  ]);

  const injections = { usdt: 0, efectivo_usd: 0 };
  const usdExpenses = { usdt: 0, efectivo_usd: 0 };
  let bsExpensesTotalBs = 0;
  let bsExpensesCount = 0;

  for (const r of result) {
    if (r._id.type === 'capital_injection') {
      const wallet = r._id.wallet;
      if (wallet === 'usdt' || wallet === 'efectivo_usd') {
        injections[wallet] += r.totalUsd || 0;
      }
    } else if (r._id.type === 'bs_expense') {
      bsExpensesTotalBs += r.totalBs || 0;
      bsExpensesCount += r.count || 0;
    } else if (r._id.type === 'usd_expense') {
      const wallet = r._id.wallet;
      if (wallet === 'usdt' || wallet === 'efectivo_usd') {
        usdExpenses[wallet] += r.totalUsd || 0;
      }
    }
  }

  return {
    injections,
    usdExpenses,
    bsExpenses: { totalBs: bsExpensesTotalBs, count: bsExpensesCount },
  };
}

/**
 * Full wallet summary with balances per type.
 */
export async function getProtectionSummary() {
  const [bsReceived, directUsd, protectedTotals, rates, walletTxTotals] = await Promise.all([
    getTotalBsReceived(),
    getDirectUsdReceived(),
    getProtectedTotals(),
    getRatesSnapshot(),
    getWalletTransactionTotals(),
  ]);

  const totalProtectedBs =
    protectedTotals.usdt.totalBs + protectedTotals.efectivo_usd.totalBs;
  const totalProtectedUsd =
    protectedTotals.usdt.totalUsd + protectedTotals.efectivo_usd.totalUsd;
  const totalProtectionCount =
    protectedTotals.usdt.count + protectedTotals.efectivo_usd.count;

  const unprotectedBs =
    bsReceived.totalBs - totalProtectedBs - walletTxTotals.bsExpenses.totalBs;
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
    bsExpenses: walletTxTotals.bsExpenses,
    unprotectedBs,
    currentRate,
    potentialUsd,
    wallets: {
      usdt: {
        fromProtection: protectedTotals.usdt.totalUsd,
        fromOrders: directUsd.usdt.totalUsd,
        fromInjections: walletTxTotals.injections.usdt,
        expenses: walletTxTotals.usdExpenses.usdt,
        total:
          protectedTotals.usdt.totalUsd +
          directUsd.usdt.totalUsd +
          walletTxTotals.injections.usdt -
          walletTxTotals.usdExpenses.usdt,
        orderCount: directUsd.usdt.orderCount,
        protectionCount: protectedTotals.usdt.count,
      },
      efectivo: {
        fromProtection: protectedTotals.efectivo_usd.totalUsd,
        fromOrders: directUsd.efectivo.totalUsd,
        fromInjections: walletTxTotals.injections.efectivo_usd,
        expenses: walletTxTotals.usdExpenses.efectivo_usd,
        total:
          protectedTotals.efectivo_usd.totalUsd +
          directUsd.efectivo.totalUsd +
          walletTxTotals.injections.efectivo_usd -
          walletTxTotals.usdExpenses.efectivo_usd,
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

/**
 * Create a new wallet transaction (capital injection, Bs expense, or USD expense).
 */
export async function createWalletTransaction({ type, wallet, amountUsd, amountBs, description, date }) {
  if (!type || !['capital_injection', 'bs_expense', 'usd_expense'].includes(type)) {
    throw new AppError('Tipo de transacción inválido', 400);
  }
  if (!description || !description.trim()) {
    throw new AppError('La descripción es requerida', 400);
  }

  if (type === 'capital_injection') {
    if (!wallet || !['usdt', 'efectivo_usd'].includes(wallet)) {
      throw new AppError('Wallet destino inválido. Usa "usdt" o "efectivo_usd"', 400);
    }
    if (!amountUsd || amountUsd <= 0) {
      throw new AppError('El monto USD debe ser mayor a 0', 400);
    }
  }

  if (type === 'bs_expense') {
    if (!amountBs || amountBs <= 0) {
      throw new AppError('El monto en Bs debe ser mayor a 0', 400);
    }
    const summary = await getProtectionSummary();
    if (amountBs > summary.unprotectedBs + 0.01) {
      throw new AppError(
        `Solo tienes ${summary.unprotectedBs.toFixed(2)} Bs sin proteger disponibles`,
        400,
      );
    }
  }

  if (type === 'usd_expense') {
    if (!wallet || !['usdt', 'efectivo_usd'].includes(wallet)) {
      throw new AppError('Wallet inválida. Usa "usdt" o "efectivo_usd"', 400);
    }
    if (!amountUsd || amountUsd <= 0) {
      throw new AppError('El monto USD debe ser mayor a 0', 400);
    }
  }

  const transaction = await WalletTransaction.create({
    type,
    wallet: type !== 'bs_expense' ? wallet : undefined,
    amountUsd: type !== 'bs_expense' ? amountUsd : undefined,
    amountBs: type === 'bs_expense' ? amountBs : undefined,
    description: description.trim(),
    date: date ? new Date(date) : new Date(),
  });

  return transaction;
}

/**
 * Get wallet transaction history with pagination.
 */
export async function getWalletTransactionHistory({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    WalletTransaction.find()
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WalletTransaction.countDocuments(),
  ]);

  return {
    records,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
