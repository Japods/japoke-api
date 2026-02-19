import Item from '../models/Item.js';
import Supply from '../models/Supply.js';
import Purchase from '../models/Purchase.js';
import StockMovement from '../models/StockMovement.js';
import PokeType from '../models/PokeType.js';
import { getRatesSnapshot } from './exchangeRate.service.js';
import { AppError } from '../utils/app-error.js';

function getModel(refModel) {
  return refModel === 'Item' ? Item : Supply;
}

export async function recordPurchase({ refModel, refId, quantity, unitCost, notes = '', updateCost = false }) {
  const Model = getModel(refModel);
  const doc = await Model.findById(refId);
  if (!doc) throw new AppError(`${refModel} no encontrado`, 404);

  const totalCost = quantity * unitCost;
  const previousStock = doc.currentStock;
  const newStock = previousStock + quantity;

  doc.currentStock = newStock;

  if (updateCost && refModel === 'Item') {
    doc.costPerUnit = unitCost;
  } else if (updateCost && refModel === 'Supply') {
    doc.unitCost = unitCost;
  }

  await doc.save();

  // Get exchange rate snapshot for purchase tracking
  let rates = {};
  try {
    rates = await getRatesSnapshot();
  } catch {
    // Rates may not be available yet
  }

  const purchase = await Purchase.create({
    refModel,
    refId,
    quantity,
    unit: refModel === 'Item' ? doc.trackingUnit : doc.trackingUnit,
    unitCost,
    totalCost,
    currency: 'USD',
    rates,
    date: new Date(),
    notes,
  });

  await StockMovement.create({
    refModel,
    refId,
    type: 'purchase',
    quantity,
    previousStock,
    newStock,
    notes: notes || `Compra registrada: ${quantity} unidades`,
    createdBy: 'admin',
  });

  return { purchase, doc, previousStock, newStock };
}

export async function adjustStock({ refModel, refId, newStock, reason = 'manual_adjustment', notes = '' }) {
  const Model = getModel(refModel);
  const doc = await Model.findById(refId);
  if (!doc) throw new AppError(`${refModel} no encontrado`, 404);

  const previousStock = doc.currentStock;
  const quantityDiff = newStock - previousStock;

  doc.currentStock = newStock;
  await doc.save();

  await StockMovement.create({
    refModel,
    refId,
    type: reason,
    quantity: quantityDiff,
    previousStock,
    newStock,
    notes,
    createdBy: 'admin',
  });

  return { doc, previousStock, newStock, quantityDiff };
}

export async function deductOrderStock(order) {
  const movements = [];

  const allItemIds = [];
  for (const poke of order.items) {
    for (const p of poke.proteins) allItemIds.push(p.item.toString());
    for (const b of poke.bases) allItemIds.push(b.item.toString());
    for (const v of poke.vegetables) allItemIds.push(v.item.toString());
    for (const s of poke.sauces) allItemIds.push(s.item.toString());
    for (const t of poke.toppings) allItemIds.push(t.item.toString());
  }

  const items = await Item.find({ _id: { $in: allItemIds }, isTrackable: true });
  const itemMap = {};
  for (const item of items) {
    itemMap[item._id.toString()] = item;
  }

  for (const poke of order.items) {
    const deductCategory = async (selections, useQuantityField = false) => {
      for (const sel of selections) {
        const item = itemMap[sel.item.toString()];
        if (!item) continue;

        const deductAmount = useQuantityField && sel.quantity ? sel.quantity : item.portionSize || 0;
        if (deductAmount <= 0) continue;

        const previousStock = item.currentStock;
        item.currentStock = Math.max(0, item.currentStock - deductAmount);
        await item.save();

        movements.push(
          await StockMovement.create({
            refModel: 'Item',
            refId: item._id,
            type: 'order_usage',
            quantity: -deductAmount,
            previousStock,
            newStock: item.currentStock,
            order: order._id,
            notes: `Pedido ${order.orderNumber}`,
            createdBy: 'system',
          })
        );
      }
    };

    await deductCategory(poke.proteins, true);
    await deductCategory(poke.bases, true);
    await deductCategory(poke.vegetables);
    await deductCategory(poke.sauces);
    await deductCategory(poke.toppings);

    // Deduct supplies linked to the poke type
    const pokeType = await PokeType.findById(poke.pokeType).lean();
    if (pokeType?.supplies?.length) {
      for (const s of pokeType.supplies) {
        const supply = await Supply.findById(s.supply);
        if (!supply) continue;

        const previousStock = supply.currentStock;
        supply.currentStock = Math.max(0, supply.currentStock - s.quantity);
        await supply.save();

        movements.push(
          await StockMovement.create({
            refModel: 'Supply',
            refId: supply._id,
            type: 'order_usage',
            quantity: -s.quantity,
            previousStock,
            newStock: supply.currentStock,
            order: order._id,
            notes: `Pedido ${order.orderNumber} - ${supply.name}`,
            createdBy: 'system',
          })
        );
      }
    }
  }

  return movements;
}

export async function restoreOrderStock(order) {
  const allItemIds = [];
  for (const poke of order.items) {
    for (const p of poke.proteins) allItemIds.push(p.item.toString());
    for (const b of poke.bases) allItemIds.push(b.item.toString());
    for (const v of poke.vegetables) allItemIds.push(v.item.toString());
    for (const s of poke.sauces) allItemIds.push(s.item.toString());
    for (const t of poke.toppings) allItemIds.push(t.item.toString());
  }

  const items = await Item.find({ _id: { $in: allItemIds }, isTrackable: true });
  const itemMap = {};
  for (const item of items) itemMap[item._id.toString()] = item;

  for (const poke of order.items) {
    const restoreCategory = async (selections, useQuantityField = false) => {
      for (const sel of selections) {
        const item = itemMap[sel.item.toString()];
        if (!item) continue;
        const restoreAmount = useQuantityField && sel.quantity ? sel.quantity : item.portionSize || 0;
        if (restoreAmount <= 0) continue;
        const previousStock = item.currentStock;
        item.currentStock = item.currentStock + restoreAmount;
        await item.save();
        await StockMovement.create({
          refModel: 'Item',
          refId: item._id,
          type: 'manual_adjustment',
          quantity: restoreAmount,
          previousStock,
          newStock: item.currentStock,
          order: order._id,
          notes: `Reversa eliminación pedido ${order.orderNumber}`,
          createdBy: 'system',
        });
      }
    };

    await restoreCategory(poke.proteins, true);
    await restoreCategory(poke.bases, true);
    await restoreCategory(poke.vegetables);
    await restoreCategory(poke.sauces);
    await restoreCategory(poke.toppings);

    const pokeType = await PokeType.findById(poke.pokeType).lean();
    if (pokeType?.supplies?.length) {
      for (const s of pokeType.supplies) {
        const supply = await Supply.findById(s.supply);
        if (!supply) continue;
        const previousStock = supply.currentStock;
        supply.currentStock = supply.currentStock + s.quantity;
        await supply.save();
        await StockMovement.create({
          refModel: 'Supply',
          refId: supply._id,
          type: 'manual_adjustment',
          quantity: s.quantity,
          previousStock,
          newStock: supply.currentStock,
          order: order._id,
          notes: `Reversa eliminación pedido ${order.orderNumber} - ${supply.name}`,
          createdBy: 'system',
        });
      }
    }
  }
}

export async function getAlerts() {
  const [lowStockItems, lowStockSupplies] = await Promise.all([
    Item.find({
      isTrackable: true,
      $expr: { $lte: ['$currentStock', '$minStock'] },
    })
      .populate('category', 'name type')
      .lean(),
    Supply.find({
      $expr: { $lte: ['$currentStock', '$minStock'] },
    }).lean(),
  ]);

  return {
    items: lowStockItems.map((item) => ({
      ...item,
      availablePortions: item.portionSize > 0 ? Math.floor(item.currentStock / item.portionSize) : null,
    })),
    supplies: lowStockSupplies,
  };
}

export async function getInventoryStatus() {
  const [items, supplies] = await Promise.all([
    Item.find({ isTrackable: true }).populate('category', 'name type').sort('name').lean(),
    Supply.find({ isActive: true }).sort('name').lean(),
  ]);

  return {
    items: items.map((item) => ({
      ...item,
      availablePortions: item.portionSize > 0 ? Math.floor(item.currentStock / item.portionSize) : null,
      status:
        item.currentStock <= 0
          ? 'critical'
          : item.currentStock <= item.minStock
            ? 'low'
            : 'ok',
    })),
    supplies: supplies.map((supply) => ({
      ...supply,
      status:
        supply.currentStock <= 0
          ? 'critical'
          : supply.currentStock <= supply.minStock
            ? 'low'
            : 'ok',
    })),
  };
}

export async function getMovements(filters = {}) {
  const query = {};
  if (filters.refModel) query.refModel = filters.refModel;
  if (filters.refId) query.refId = filters.refId;
  if (filters.type) query.type = filters.type;

  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 30;
  const skip = (page - 1) * limit;

  const [movements, totalCount] = await Promise.all([
    StockMovement.find(query)
      .populate('refId', 'name slug')
      .populate('order', 'orderNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    StockMovement.countDocuments(query),
  ]);

  return {
    movements,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}
