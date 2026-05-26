import mongoose from 'mongoose';

const yummyPayoutSchema = new mongoose.Schema(
  {
    orderIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
      },
    ],
    orderCount: { type: Number, required: true },
    grossAmount: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    netAmount: { type: Number, required: true },
    netAmountBs: { type: Number, default: 0 },
    paidAt: { type: Date, required: true },
    bankReference: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    ratesSnapshot: {
      dolarBcv: { type: Number, default: 0 },
    },
    periodFrom: { type: Date, default: null },
    periodTo: { type: Date, default: null },
  },
  { timestamps: true }
);

yummyPayoutSchema.index({ paidAt: -1 });

export default mongoose.model('YummyPayout', yummyPayoutSchema);
