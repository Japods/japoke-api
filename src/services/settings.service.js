import StoreSettings from '../models/StoreSettings.js';

export async function getStoreStatus() {
  let s = await StoreSettings.findOne({ key: 'main' });
  if (!s) s = await StoreSettings.create({ key: 'main', isOpen: false });
  return { isOpen: s.isOpen, maxDiscountPct: s.maxDiscountPct ?? 15 };
}

export async function setStoreStatus(isOpen) {
  const s = await StoreSettings.findOneAndUpdate(
    { key: 'main' },
    { isOpen },
    { upsert: true, new: true },
  );
  return { isOpen: s.isOpen, maxDiscountPct: s.maxDiscountPct ?? 15 };
}

export async function getMaxDiscountPct() {
  let s = await StoreSettings.findOne({ key: 'main' });
  if (!s) s = await StoreSettings.create({ key: 'main', isOpen: false });
  return s.maxDiscountPct ?? 15;
}

export async function setMaxDiscountPct(maxDiscountPct) {
  const pct = Number(maxDiscountPct);
  if (isNaN(pct) || pct < 0 || pct > 100) {
    throw new Error('El porcentaje debe estar entre 0 y 100');
  }
  const s = await StoreSettings.findOneAndUpdate(
    { key: 'main' },
    { maxDiscountPct: pct },
    { upsert: true, new: true },
  );
  return { maxDiscountPct: s.maxDiscountPct };
}
