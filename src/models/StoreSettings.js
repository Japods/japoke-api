import mongoose from 'mongoose';

const storeSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  isOpen: { type: Boolean, default: false },
  maxDiscountPct: { type: Number, default: 15, min: 0, max: 100 },
});

export default mongoose.model('StoreSettings', storeSettingsSchema);
