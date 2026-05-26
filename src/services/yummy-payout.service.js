import Order from '../models/Order.js';
import YummyPayout from '../models/YummyPayout.js';
import { getRatesSnapshot } from './exchangeRate.service.js';
import { AppError } from '../utils/app-error.js';

function round2(n) {
  return Math.round(n * 100) / 100;
}

export async function createPayout({
  orderIds,
  paidAt,
  bankReference = '',
  notes = '',
  netAmountBs = 0,
  periodFrom = null,
  periodTo = null,
}) {
  if (!orderIds || orderIds.length === 0) {
    throw new AppError('Debes seleccionar al menos una orden', 400);
  }

  const orders = await Order.find({
    _id: { $in: orderIds },
    channel: 'yummy',
  });

  if (orders.length !== orderIds.length) {
    throw new AppError(
      'Algunas órdenes no existen, no son del canal Yummy, o fueron eliminadas',
      400
    );
  }

  for (const o of orders) {
    if (o.payout?.status === 'paid') {
      throw new AppError(
        `La orden ${o.orderNumber} ya está marcada como cobrada`,
        400
      );
    }
  }

  const totals = orders.reduce(
    (acc, o) => {
      acc.gross += o.payout?.grossAmount || 0;
      acc.commission += o.payout?.commissionAmount || 0;
      acc.net += o.payout?.netAmount || 0;
      return acc;
    },
    { gross: 0, commission: 0, net: 0 }
  );

  const rates = await getRatesSnapshot();
  const ratesSnapshot = { dolarBcv: rates.dolarBcv || 0 };

  const computedNetBs =
    netAmountBs > 0
      ? netAmountBs
      : round2(totals.net * ratesSnapshot.dolarBcv);

  const paidAtDate = new Date(paidAt);

  const payout = await YummyPayout.create({
    orderIds,
    orderCount: orders.length,
    grossAmount: round2(totals.gross),
    commissionAmount: round2(totals.commission),
    netAmount: round2(totals.net),
    netAmountBs: computedNetBs,
    paidAt: paidAtDate,
    bankReference,
    notes,
    ratesSnapshot,
    periodFrom: periodFrom || null,
    periodTo: periodTo || null,
  });

  await Order.updateMany(
    { _id: { $in: orderIds } },
    {
      $set: {
        'payout.status': 'paid',
        'payout.actualPayoutDate': paidAtDate,
        'payout.payoutId': payout._id,
      },
    }
  );

  return payout;
}

export async function listPayouts({ from, to, page, limit } = {}) {
  const query = {};
  if (from || to) {
    query.paidAt = {};
    if (from) query.paidAt.$gte = new Date(from);
    if (to) query.paidAt.$lte = new Date(to);
  }

  const _page = parseInt(page, 10) || 1;
  const _limit = parseInt(limit, 10) || 30;
  const skip = (_page - 1) * _limit;

  const [payouts, totalCount] = await Promise.all([
    YummyPayout.find(query)
      .sort({ paidAt: -1 })
      .skip(skip)
      .limit(_limit)
      .lean(),
    YummyPayout.countDocuments(query),
  ]);

  return {
    payouts,
    pagination: {
      page: _page,
      limit: _limit,
      totalCount,
      totalPages: Math.ceil(totalCount / _limit),
    },
  };
}

export async function getPayoutById(id) {
  return YummyPayout.findById(id)
    .populate('orderIds', 'orderNumber external payout createdAt total')
    .lean();
}

export async function getDashboardSummary({ from, to } = {}) {
  const rangeQuery = {};
  if (from || to) {
    rangeQuery.createdAt = {};
    if (from) rangeQuery.createdAt.$gte = new Date(from);
    if (to) rangeQuery.createdAt.$lte = new Date(to);
  }

  const [pendingAgg, paidAgg, lifetimePaidAgg] = await Promise.all([
    Order.aggregate([
      { $match: { channel: 'yummy', 'payout.status': 'pending' } },
      {
        $group: {
          _id: null,
          orderCount: { $sum: 1 },
          grossAmount: { $sum: '$payout.grossAmount' },
          commissionAmount: { $sum: '$payout.commissionAmount' },
          netAmount: { $sum: '$payout.netAmount' },
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          channel: 'yummy',
          'payout.status': 'paid',
          ...rangeQuery,
        },
      },
      {
        $group: {
          _id: null,
          orderCount: { $sum: 1 },
          grossAmount: { $sum: '$payout.grossAmount' },
          commissionAmount: { $sum: '$payout.commissionAmount' },
          netAmount: { $sum: '$payout.netAmount' },
        },
      },
    ]),
    Order.aggregate([
      { $match: { channel: 'yummy', 'payout.status': 'paid' } },
      {
        $group: {
          _id: null,
          commissionAmount: { $sum: '$payout.commissionAmount' },
        },
      },
    ]),
  ]);

  const empty = { orderCount: 0, grossAmount: 0, commissionAmount: 0, netAmount: 0 };
  const pending = pendingAgg[0]
    ? {
        orderCount: pendingAgg[0].orderCount,
        grossAmount: round2(pendingAgg[0].grossAmount || 0),
        commissionAmount: round2(pendingAgg[0].commissionAmount || 0),
        netAmount: round2(pendingAgg[0].netAmount || 0),
      }
    : empty;
  const paidInRange = paidAgg[0]
    ? {
        orderCount: paidAgg[0].orderCount,
        grossAmount: round2(paidAgg[0].grossAmount || 0),
        commissionAmount: round2(paidAgg[0].commissionAmount || 0),
        netAmount: round2(paidAgg[0].netAmount || 0),
      }
    : empty;
  const lifetimeCommission = round2(lifetimePaidAgg[0]?.commissionAmount || 0);

  return {
    pending,
    paidInRange,
    lifetimeCommission,
  };
}
