import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['capital_injection', 'bs_expense', 'usd_expense'],
      required: true,
    },
    wallet: {
      type: String,
      enum: ['usdt', 'efectivo_usd'],
    },
    amountUsd: {
      type: Number,
      min: 0,
    },
    amountBs: {
      type: Number,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ type: 1 });
walletTransactionSchema.index({ date: -1 });

export default mongoose.model('WalletTransaction', walletTransactionSchema);
