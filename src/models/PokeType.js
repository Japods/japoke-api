import mongoose from 'mongoose';

const pokeTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    basePrice: { type: Number, required: true },
    rules: {
      proteinGrams: { type: Number, required: true },
      baseGrams: { type: Number, required: true },
      maxVegetables: { type: Number, required: true },
      maxSauces: { type: Number, required: true },
      maxToppings: { type: Number, required: true },
    },
    allowedProteinTiers: [{ type: String, enum: ['premium', 'base'] }],
    supplies: [
      {
        supply: { type: mongoose.Schema.Types.ObjectId, ref: 'Supply' },
        quantity: { type: Number, default: 1 },
        _id: false,
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('PokeType', pokeTypeSchema);
