import mongoose from 'mongoose';

const bsProtectionSchema = new mongoose.Schema(
  {
    amountBs: {
      type: Number,
      required: true,
      min: 0,
    },
    rateDolarParalelo: {
      type: Number,
      required: true,
      min: 0,
    },
    amountUsd: {
      type: Number,
      required: true,
      min: 0,
    },
    destination: {
      type: String,
      enum: ['usdt', 'efectivo_usd'],
      required: true,
      default: 'usdt',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    protectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

bsProtectionSchema.index({ protectedAt: -1 });
bsProtectionSchema.index({ destination: 1 });

export default mongoose.model('BsProtection', bsProtectionSchema);
