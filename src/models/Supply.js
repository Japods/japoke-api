import mongoose from 'mongoose';

const supplySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, trim: true, default: '' },
    unitCost: { type: Number, default: 0 },
    currentStock: { type: Number, default: 0 },
    minStock: { type: Number, default: 0 },
    trackingUnit: {
      type: String,
      enum: ['units', 'g', 'kg', 'ml', 'l'],
      default: 'units',
    },
    usagePerPoke: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Supply', supplySchema);
