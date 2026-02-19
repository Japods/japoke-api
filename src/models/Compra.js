import mongoose from 'mongoose';

// Linea de detalle de una compra financiera
// refModel/refId son opcionales: si existen, la linea actualiza el stock de ese Item o Insumo
const compraItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      required: true,
      enum: ['kg', 'g', 'l', 'ml', 'unidad', 'caja', 'paquete'],
    },
    unitPriceBS: { type: Number, required: true, min: 0 },
    subtotalBS: { type: Number, required: true, min: 0 },

    // Vinculo opcional con Item o Insumo (Supply) del catalogo
    refModel: {
      type: String,
      enum: ['Item', 'Supply'],
      default: null,
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'items.refModel',
      default: null,
    },

    // Indica si este movimiento ya fue aplicado al stock
    stockUpdated: { type: Boolean, default: false },
  },
  { _id: false },
);

const compraSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, default: Date.now },
    supplier: { type: String, required: true, trim: true },
    invoiceNumber: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    items: { type: [compraItemSchema], default: [] },

    totalBS: { type: Number, required: true, min: 0 },

    // Tasa BCV (BS por 1 USD segun el Banco Central de Venezuela)
    bcvRate: { type: Number, required: true, min: 0 },

    // Tasa USDT (BS por 1 USDT en el mercado paralelo)
    usdtRate: { type: Number, required: true, min: 0 },

    // Calculados y persistidos al momento de la compra
    totalUSD: { type: Number, required: true, min: 0 },
    totalUSDT: { type: Number, required: true, min: 0 },

    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

compraSchema.index({ date: -1 });

export default mongoose.model('Compra', compraSchema);
