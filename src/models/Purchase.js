import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema(
  {
    refModel: {
      type: String,
      required: true,
      enum: ['Item', 'Supply'],
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'refModel',
    },
    quantity: { type: Number, required: true },
    unit: { type: String, trim: true, default: '' },
    unitCost: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    currency: { type: String, enum: ['USD', 'EUR', 'Bs'], default: 'USD' },
    rates: {
      dolarBcv: { type: Number },
      euroBcv: { type: Number },
      dolarParalelo: { type: Number },
    },
    date: { type: Date, default: Date.now },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

purchaseSchema.index({ refModel: 1, refId: 1 });
purchaseSchema.index({ date: -1 });

export default mongoose.model('Purchase', purchaseSchema);
