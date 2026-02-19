import mongoose from 'mongoose';

// Modelo de compra de inventario (registro por item/insumo individual)
// Usado por inventory.service.js para trazar el historial de costos
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
    unit: { type: String, required: true },
    unitCost: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    rates: { type: Object, default: {} },
    date: { type: Date, default: Date.now },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

purchaseSchema.index({ refModel: 1, refId: 1 });
purchaseSchema.index({ date: -1 });

export default mongoose.model('Purchase', purchaseSchema);
