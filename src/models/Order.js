import mongoose from 'mongoose';

const extraSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    name: { type: String, required: true },
    extraType: {
      type: String,
      required: true,
      enum: [
        'protein-base',
        'protein-premium',
        'avocado',
        'topping',
        'sauce',
        'fruit',
        'vegetable',
      ],
    },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

const pokeItemSchema = new mongoose.Schema(
  {
    pokeType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PokeType',
      required: true,
    },
    pokeTypeName: { type: String, required: true },
    basePrice: { type: Number, required: true },

    proteins: [
      {
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        name: String,
        preparationStyle: { type: String, default: null },
        quantity: Number,
        _id: false,
      },
    ],
    bases: [
      {
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        name: String,
        quantity: Number,
        _id: false,
      },
    ],
    vegetables: [
      {
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        name: String,
        _id: false,
      },
    ],
    fruits: [
      {
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        name: String,
        _id: false,
      },
    ],
    sauces: [
      {
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        name: String,
        _id: false,
      },
    ],
    toppings: [
      {
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        name: String,
        _id: false,
      },
    ],

    extras: [extraSchema],
    itemTotal: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: {
      name: { type: String, required: true, trim: true },
      identification: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      phone: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      mapUrl: { type: String, trim: true, default: '' },
      notes: { type: String, trim: true, default: '' },
    },
    items: [pokeItemSchema],
    addOns: [
      {
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        name: { type: String, required: true },
        unitPrice: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
        subtotal: { type: Number, required: true },
        _id: false,
      },
    ],
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    payment: {
      method: {
        type: String,
        enum: ['pago_movil', 'efectivo_usd', 'binance_usdt'],
      },
      referenceId: { type: String, trim: true, default: '' },
      referenceImageUrl: { type: String, default: '' },
      amountEur: { type: Number },
      amountBs: { type: Number },
      amountUsd: { type: Number },
      rates: {
        euroBcv: { type: Number },
        dolarBcv: { type: Number },
        dolarParalelo: { type: Number },
      },
      status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending',
      },
    },
    splitPayment: {
      method: {
        type: String,
        enum: ['pago_movil', 'efectivo_usd', 'binance_usdt'],
      },
      amountBs: { type: Number },
      amountUsd: { type: Number },
      referenceId: { type: String, trim: true, default: '' },
      status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending',
      },
    },
    promotion: {
      promotionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Promotion' },
      name: { type: String },
      promoPrice: { type: Number },
      itemIndexes: [{ type: Number }],
    },
    discountCode: {
      code: { type: String },
      percentage: { type: Number },
      discountAmount: { type: Number },
    },
    deliveryTime: { type: String, default: null },
    deliveryCostBs: { type: Number, default: 0 },
    deliveryFree: { type: Boolean, default: false },
    isCourtesy: { type: Boolean, default: false },
    courtesyReason: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'delivered',
        'cancelled',
      ],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Indexes for wallet aggregations and common queries
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'payment.method': 1, 'payment.status': 1, status: 1 });
orderSchema.index({ 'splitPayment.method': 1, 'splitPayment.status': 1, status: 1 });
orderSchema.index({ isCourtesy: 1, status: 1 });

export default mongoose.model('Order', orderSchema);
