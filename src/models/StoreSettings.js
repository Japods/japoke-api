import mongoose from 'mongoose';

const storeSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  isOpen: { type: Boolean, default: false },
});

export default mongoose.model('StoreSettings', storeSettingsSchema);
