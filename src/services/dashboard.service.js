import Order from '../models/Order.js';
import Item from '../models/Item.js';
import PokeType from '../models/PokeType.js';
import Supply from '../models/Supply.js';
import { getAlerts } from './inventory.service.js';

export async function getDashboardSummary({ from, to } = {}) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Period filter (from the date range selector)
  const periodQuery = { status: { $nin: ['cancelled'] } };
  if (from || to) {
    periodQuery.createdAt = {};
    if (from) periodQuery.createdAt.$gte = new Date(from);
    if (to) periodQuery.createdAt.$lte = new Date(to);
  }

  // Today query (always)
  const todayQuery = {
    status: { $nin: ['cancelled'] },
    createdAt: { $gte: startOfToday },
  };

  const [periodOrders, todayOrders, alerts] = await Promise.all([
    Order.find(periodQuery).lean(),
    Order.find(todayQuery).lean(),
    getAlerts(),
  ]);

  const periodDelivered = periodOrders.filter((o) => o.status === 'delivered');
  const periodRevenue = periodDelivered.reduce((sum, o) => sum + o.total, 0);
  const periodBowls = periodOrders.reduce((sum, o) => sum + o.items.length, 0);
  const periodAvgTicket = periodDelivered.length > 0
    ? periodRevenue / periodDelivered.length
    : 0;

  const todayRevenue = todayOrders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + o.total, 0);

  return {
    period: {
      orders: periodOrders.length,
      delivered: periodDelivered.length,
      revenue: periodRevenue,
      bowls: periodBowls,
      avgTicket: periodAvgTicket,
    },
    today: {
      orders: todayOrders.length,
      revenue: todayRevenue,
    },
    alertCount: alerts.items.length + alerts.supplies.length,
  };
}

export async function getSalesSummary({ from, to, groupBy = 'day' }) {
  const matchStage = { status: 'delivered' };
  if (from || to) {
    matchStage.createdAt = {};
    if (from) matchStage.createdAt.$gte = new Date(from);
    if (to) matchStage.createdAt.$lte = new Date(to);
  }

  let dateFormat;
  switch (groupBy) {
    case 'week':
      dateFormat = { $dateToString: { format: '%Y-W%V', date: '$createdAt' } };
      break;
    case 'month':
      dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
      break;
    default:
      dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
  }

  const result = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: dateFormat,
        orders: { $sum: 1 },
        revenue: { $sum: '$total' },
        bowls: { $sum: { $size: '$items' } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return result.map((r) => ({
    date: r._id,
    orders: r.orders,
    revenue: r.revenue,
    bowls: r.bowls,
  }));
}

export async function getPopularItems({ from, to, limit = 10 }) {
  const matchStage = { status: { $nin: ['cancelled'] } };
  if (from || to) {
    matchStage.createdAt = {};
    if (from) matchStage.createdAt.$gte = new Date(from);
    if (to) matchStage.createdAt.$lte = new Date(to);
  }

  const result = await Order.aggregate([
    { $match: matchStage },
    { $unwind: '$items' },
    {
      $facet: {
        proteins: [
          { $unwind: '$items.proteins' },
          {
            $group: {
              _id: '$items.proteins.name',
              count: { $sum: 1 },
              itemId: { $first: '$items.proteins.item' },
            },
          },
          { $sort: { count: -1 } },
          { $limit: limit },
          { $addFields: { category: 'protein' } },
        ],
        bases: [
          { $unwind: '$items.bases' },
          {
            $group: {
              _id: '$items.bases.name',
              count: { $sum: 1 },
              itemId: { $first: '$items.bases.item' },
            },
          },
          { $sort: { count: -1 } },
          { $limit: limit },
          { $addFields: { category: 'base' } },
        ],
        vegetables: [
          { $unwind: '$items.vegetables' },
          {
            $group: {
              _id: '$items.vegetables.name',
              count: { $sum: 1 },
              itemId: { $first: '$items.vegetables.item' },
            },
          },
          { $sort: { count: -1 } },
          { $limit: limit },
          { $addFields: { category: 'vegetable' } },
        ],
        sauces: [
          { $unwind: '$items.sauces' },
          {
            $group: {
              _id: '$items.sauces.name',
              count: { $sum: 1 },
              itemId: { $first: '$items.sauces.item' },
            },
          },
          { $sort: { count: -1 } },
          { $limit: limit },
          { $addFields: { category: 'sauce' } },
        ],
        toppings: [
          { $unwind: '$items.toppings' },
          {
            $group: {
              _id: '$items.toppings.name',
              count: { $sum: 1 },
              itemId: { $first: '$items.toppings.item' },
            },
          },
          { $sort: { count: -1 } },
          { $limit: limit },
          { $addFields: { category: 'topping' } },
        ],
      },
    },
  ]);

  const data = result[0];
  const all = [
    ...data.proteins,
    ...data.bases,
    ...data.vegetables,
    ...data.sauces,
    ...data.toppings,
  ]
    .map((r) => ({ name: r._id, count: r.count, category: r.category, itemId: r.itemId }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return { byCategory: data, top: all };
}

export async function getPopularPokeTypes({ from, to } = {}) {
  const matchStage = { status: { $nin: ['cancelled'] } };
  if (from || to) {
    matchStage.createdAt = {};
    if (from) matchStage.createdAt.$gte = new Date(from);
    if (to) matchStage.createdAt.$lte = new Date(to);
  }

  // Get totals by poke type
  const typeResult = await Order.aggregate([
    { $match: matchStage },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.pokeTypeName',
        count: { $sum: 1 },
        revenue: { $sum: '$items.itemTotal' },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // Get breakdown by protein per poke type
  const proteinResult = await Order.aggregate([
    { $match: matchStage },
    { $unwind: '$items' },
    { $unwind: '$items.proteins' },
    {
      $group: {
        _id: {
          pokeType: '$items.pokeTypeName',
          protein: '$items.proteins.name',
        },
        count: { $sum: 1 },
        revenue: { $sum: '$items.itemTotal' },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // Build protein map per poke type
  const proteinsByType = {};
  for (const r of proteinResult) {
    const typeName = r._id.pokeType;
    if (!proteinsByType[typeName]) proteinsByType[typeName] = [];
    proteinsByType[typeName].push({
      name: r._id.protein,
      count: r.count,
      revenue: r.revenue,
    });
  }

  return typeResult.map((r) => ({
    name: r._id,
    count: r.count,
    revenue: r.revenue,
    byProtein: proteinsByType[r._id] || [],
  }));
}

export async function getCostAnalysis() {
  const pokeTypes = await PokeType.find({ isActive: true })
    .populate('supplies.supply')
    .lean();

  const items = await Item.find({ isAvailable: true }).populate('category', 'type').lean();
  const itemsByType = {};
  for (const item of items) {
    const type = item.category?.type;
    if (!type) continue;
    if (!itemsByType[type]) itemsByType[type] = [];
    itemsByType[type].push(item);
  }

  return pokeTypes.map((pt) => {
    // Costo base (sin proteína) compartido por todas las variantes
    let baseCost = 0;

    // Bases: costPerUnit es $/g, multiplicar por gramos de base del poke
    const baseItems = itemsByType.base || [];
    if (baseItems.length > 0) {
      const avgCostPerGram =
        baseItems.reduce((sum, i) => sum + (i.costPerUnit || 0), 0) / baseItems.length;
      baseCost += avgCostPerGram * pt.rules.baseGrams;
    }

    // Vegetales: costPerUnit es $/g, multiplicar por portionSize de cada uno
    const vegItems = itemsByType.vegetable || [];
    if (vegItems.length > 0) {
      const avgPortionCost =
        vegItems.reduce((sum, i) => sum + (i.costPerUnit || 0) * (i.portionSize || 20), 0) / vegItems.length;
      baseCost += avgPortionCost * Math.min(pt.rules.maxVegetables, vegItems.length);
    }

    // Salsas: costPerUnit es $/ml, multiplicar por portionSize
    const sauceItems = itemsByType.sauce || [];
    if (sauceItems.length > 0) {
      const avgPortionCost =
        sauceItems.reduce((sum, i) => sum + (i.costPerUnit || 0) * (i.portionSize || 10), 0) / sauceItems.length;
      baseCost += avgPortionCost * Math.min(pt.rules.maxSauces, sauceItems.length);
    }

    // Toppings: costPerUnit es $/g, multiplicar por portionSize
    const toppingItems = itemsByType.topping || [];
    if (toppingItems.length > 0) {
      const avgPortionCost =
        toppingItems.reduce((sum, i) => sum + (i.costPerUnit || 0) * (i.portionSize || 20), 0) / toppingItems.length;
      baseCost += avgPortionCost * Math.min(pt.rules.maxToppings, toppingItems.length);
    }

    // Supplies: unitCost ya es por unidad, multiplicar por cantidad por poke
    let suppliesCost = 0;
    if (pt.supplies?.length) {
      for (const s of pt.supplies) {
        if (s.supply) {
          suppliesCost += (s.supply.unitCost || 0) * s.quantity;
        }
      }
    }

    // Desglose por proteína
    const proteinItems = (itemsByType.protein || []).filter((i) =>
      pt.allowedProteinTiers.includes(i.tier)
    );

    const byProtein = proteinItems.map((protein) => {
      const proteinCost = (protein.costPerUnit || 0) * pt.rules.proteinGrams;
      const ingredientCost = baseCost + proteinCost;
      const totalCost = ingredientCost + suppliesCost;
      const margin = pt.basePrice - totalCost;
      const marginPercent = pt.basePrice > 0 ? (margin / pt.basePrice) * 100 : 0;

      return {
        proteinId: protein._id,
        proteinName: protein.name,
        proteinCost: Math.round(proteinCost * 100) / 100,
        ingredientCost: Math.round(ingredientCost * 100) / 100,
        suppliesCost: Math.round(suppliesCost * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        margin: Math.round(margin * 100) / 100,
        marginPercent: Math.round(marginPercent * 10) / 10,
      };
    });

    // Promedio general del tipo de poke
    const avgProteinCostPerGram = proteinItems.length > 0
      ? proteinItems.reduce((sum, i) => sum + (i.costPerUnit || 0), 0) / proteinItems.length
      : 0;
    const avgIngredientCost = baseCost + avgProteinCostPerGram * pt.rules.proteinGrams;
    const avgTotalCost = avgIngredientCost + suppliesCost;
    const avgMargin = pt.basePrice - avgTotalCost;
    const avgMarginPercent = pt.basePrice > 0 ? (avgMargin / pt.basePrice) * 100 : 0;

    return {
      _id: pt._id,
      name: pt.name,
      slug: pt.slug,
      salePrice: pt.basePrice,
      ingredientCost: Math.round(avgIngredientCost * 100) / 100,
      suppliesCost: Math.round(suppliesCost * 100) / 100,
      totalCost: Math.round(avgTotalCost * 100) / 100,
      margin: Math.round(avgMargin * 100) / 100,
      marginPercent: Math.round(avgMarginPercent * 10) / 10,
      byProtein,
    };
  });
}
