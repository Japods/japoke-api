import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    tier: { type: String, enum: ['premium', 'base', null], default: null },
    portionSize: { type: Number, default: 0 },
    extraPrice: { type: Number, default: 0 },
    costPerUnit: { type: Number, default: 0 },
    isTrackable: { type: Boolean, default: false },
    trackingUnit: {
      type: String,
      enum: ['g', 'kg', 'units', 'ml', 'l'],
      default: 'g',
    },
    currentStock: { type: Number, default: 0 },
    minStock: { type: Number, default: 0 },
    preparationStyles: [
      {
        id: { type: String, required: true },
        label: { type: String, required: true },
        _id: false,
      },
    ],
    isAvailable: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Item', itemSchema);
