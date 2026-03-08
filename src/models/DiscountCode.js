import mongoose from 'mongoose';

const discountCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    percentage: { type: Number, required: true, min: 1, max: 100 },
    active: { type: Boolean, default: true },
    usageLimit: { type: Number, default: null },
    usageCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

discountCodeSchema.methods.isValid = function () {
  if (!this.active) return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  if (this.usageLimit !== null && this.usageCount >= this.usageLimit) return false;
  return true;
};

export default mongoose.model('DiscountCode', discountCodeSchema);
