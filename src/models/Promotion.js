import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, trim: true, default: '' },
    pokeTypes: [
      {
        pokeType: { type: mongoose.Schema.Types.ObjectId, ref: 'PokeType', required: true },
        quantity: { type: Number, required: true, min: 1 },
        _id: false,
      },
    ],
    allowedProteins: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    ],
    totalQuantity: { type: Number, required: true, min: 1 },
    promoPrice: { type: Number, required: true, min: 0 },
    maxPerOrder: { type: Number, default: 1 },
    active: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Promotion', promotionSchema);
