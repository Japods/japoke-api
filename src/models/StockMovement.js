import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
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
    type: {
      type: String,
      required: true,
      enum: ['purchase', 'order_usage', 'manual_adjustment', 'waste'],
    },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    notes: { type: String, trim: true, default: '' },
    createdBy: { type: String, trim: true, default: 'system' },
  },
  { timestamps: true }
);

stockMovementSchema.index({ refModel: 1, refId: 1 });
stockMovementSchema.index({ type: 1 });
stockMovementSchema.index({ createdAt: -1 });

export default mongoose.model('StockMovement', stockMovementSchema);
