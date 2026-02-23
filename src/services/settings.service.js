import StoreSettings from '../models/StoreSettings.js';

export async function getStoreStatus() {
  let s = await StoreSettings.findOne({ key: 'main' });
  if (!s) s = await StoreSettings.create({ key: 'main', isOpen: false });
  return { isOpen: s.isOpen };
}

export async function setStoreStatus(isOpen) {
  const s = await StoreSettings.findOneAndUpdate(
    { key: 'main' },
    { isOpen },
    { upsert: true, new: true },
  );
  return { isOpen: s.isOpen };
}
