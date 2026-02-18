import mongoose from 'mongoose';

const exchangeRateSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['dolar_bcv', 'euro_bcv', 'dolar_paralelo', 'euro_paralelo'],
    },
    rate: { type: Number, required: true },
    source: { type: String, default: 'dolarapi.com' },
    fetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

exchangeRateSchema.index({ type: 1, fetchedAt: -1 });

export default mongoose.model('ExchangeRate', exchangeRateSchema);
