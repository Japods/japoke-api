import Compra from '../models/Compra.js';
import { recordPurchase as recordInventoryPurchase } from './inventory.service.js';

function calcTotals(totalBS, bcvRate, usdtRate) {
  return {
    totalUSD: +(totalBS / bcvRate).toFixed(4),
    totalUSDT: +(totalBS / usdtRate).toFixed(4),
  };
}

// Unidades de compra que corresponden a la unidad de tracking del item
const UNIT_COMPAT = {
  g: ['g', 'kg'],
  ml: ['ml', 'l'],
  units: ['unidad', 'caja', 'paquete'],
  caja: ['caja', 'unidad'],
  paquete: ['paquete', 'unidad'],
};

function purchaseUnitMatchesTracking(purchaseUnit, trackingUnit) {
  const compatible = UNIT_COMPAT[trackingUnit] ?? [trackingUnit];
  return compatible.includes(purchaseUnit);
}

// Factor de conversión de unidad de compra a unidad de tracking
function toTrackingUnit(quantity, purchaseUnit, trackingUnit) {
  if (purchaseUnit === 'kg' && trackingUnit === 'g') return quantity * 1000;
  if (purchaseUnit === 'l' && trackingUnit === 'ml') return quantity * 1000;
  return quantity;
}

async function applyStockForItem(line, bcvRate) {
  if (!line.refModel || !line.refId) return;

  const [{ default: Item }, { default: Supply }] = await Promise.all([
    import('../models/Item.js'),
    import('../models/Supply.js'),
  ]);
  const Model = line.refModel === 'Item' ? Item : Supply;
  const doc = await Model.findById(line.refId).lean();
  if (!doc) return;

  const trackingUnit = doc.trackingUnit ?? 'g';
  const purchaseUnit = line.unit ?? 'g';
  const unitsCompatible = purchaseUnitMatchesTracking(purchaseUnit, trackingUnit);

  // Cantidad convertida a la unidad de tracking del item
  const convertedQty = unitsCompatible
    ? toTrackingUnit(line.quantity, purchaseUnit, trackingUnit)
    : line.quantity;

  const subtotal = line.subtotalBS ?? line.unitPriceBS * line.quantity;
  // unitCost en $/unidad-de-tracking (e.g. $/g)
  const unitCostUSD = +((subtotal / convertedQty) / bcvRate).toFixed(6);

  // Actualizamos costPerUnit solo si:
  // 1. Las unidades de compra y tracking son compatibles (misma dimensión)
  // 2. El item tiene portionSize > 0 (costPerUnit se usa como $/g en el análisis).
  //    Para portionSize=0 (vegetales, salsas, toppings), costPerUnit es $/porción
  //    y lo gestiona el usuario manualmente — las compras no lo tocan.
  const canUpdateCost = unitsCompatible && (doc.portionSize ?? 0) > 0;

  try {
    await recordInventoryPurchase({
      refModel: line.refModel,
      refId: line.refId,
      quantity: convertedQty,
      unitCost: unitCostUSD,
      notes: `Importado desde compra financiera`,
      updateCost: canUpdateCost,
    });
  } catch (err) {
    console.error(`[Compra] Error al actualizar stock para ${line.refModel} ${line.refId}:`, err.message);
  }
}

export async function getPurchases({ page = 1, limit = 50, from, to } = {}) {
  const filter = {};

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const skip = (page - 1) * limit;

  const [purchases, total] = await Promise.all([
    Compra.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
    Compra.countDocuments(filter),
  ]);

  const summary = await Compra.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalBS: { $sum: '$totalBS' },
        totalUSD: { $sum: '$totalUSD' },
        totalUSDT: { $sum: '$totalUSDT' },
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    purchases,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    summary: summary[0] ?? { totalBS: 0, totalUSD: 0, totalUSDT: 0, count: 0 },
  };
}

export async function getPurchaseById(id) {
  return Compra.findById(id).lean();
}

export async function createPurchase(data) {
  const { totalUSD, totalUSDT } = calcTotals(data.totalBS, data.bcvRate, data.usdtRate);

  const compra = await Compra.create({ ...data, totalUSD, totalUSDT });

  // Aplicar stock para cada linea vinculada
  const linkedLines = (data.items || []).filter((l) => l.refModel && l.refId);
  for (const line of linkedLines) {
    await applyStockForItem(line, data.bcvRate);
  }

  return compra;
}

export async function updatePurchase(id, data) {
  const existing = await Compra.findById(id);
  if (!existing) return null;

  Object.assign(existing, data);

  if (data.totalBS !== undefined || data.bcvRate !== undefined || data.usdtRate !== undefined) {
    const { totalUSD, totalUSDT } = calcTotals(
      existing.totalBS,
      existing.bcvRate,
      existing.usdtRate,
    );
    existing.totalUSD = totalUSD;
    existing.totalUSDT = totalUSDT;
  }

  return existing.save();
}

export async function deletePurchase(id) {
  return Compra.findByIdAndDelete(id);
}

// Endpoint auxiliar: devuelve Items trackables y Supplies para el selector del formulario
export async function getStockableItems() {
  const [{ default: Item }, { default: Supply }] = await Promise.all([
    import('../models/Item.js'),
    import('../models/Supply.js'),
  ]);

  const [items, supplies] = await Promise.all([
    Item.find({}).select('name trackingUnit currentStock isTrackable category').populate('category', 'name').sort('name').lean(),
    Supply.find({ isActive: true }).select('name trackingUnit currentStock').sort('name').lean(),
  ]);

  return { items, supplies };
}
