import 'dotenv/config';
import mongoose from 'mongoose';
import config from '../src/config/index.js';
import Category from '../src/models/Category.js';
import Item from '../src/models/Item.js';
import PokeType from '../src/models/PokeType.js';
import Supply from '../src/models/Supply.js';
import Purchase from '../src/models/Purchase.js';
import StockMovement from '../src/models/StockMovement.js';

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function seed() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to MongoDB');

  // Clear existing data
  await Promise.all([
    Category.deleteMany({}),
    Item.deleteMany({}),
    PokeType.deleteMany({}),
    Supply.deleteMany({}),
    Purchase.deleteMany({}),
    StockMovement.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // --- Categories ---
  const categoriesData = [
    { name: 'Proteína Premium', slug: 'protein-premium', type: 'protein', displayOrder: 1 },
    { name: 'Proteína Base', slug: 'protein-base', type: 'protein', displayOrder: 2 },
    { name: 'Base del Poke', slug: 'base', type: 'base', displayOrder: 3 },
    { name: 'Vegetales', slug: 'vegetable', type: 'vegetable', displayOrder: 4 },
    { name: 'Salsas Caseras', slug: 'sauce', type: 'sauce', displayOrder: 5 },
    { name: 'Toppings', slug: 'topping', type: 'topping', displayOrder: 6 },
  ];

  const categories = await Category.insertMany(categoriesData);
  console.log(`Inserted ${categories.length} categories`);

  const catMap = {};
  for (const cat of categories) {
    catMap[cat.slug] = cat._id;
  }

  // --- Items ---
  const itemsData = [
    // Proteína Premium (trackable by grams)
    { name: 'Salmón', category: catMap['protein-premium'], tier: 'premium', portionSize: 100, extraPrice: 5, costPerUnit: 0.025, isTrackable: true, trackingUnit: 'g', currentStock: 0, minStock: 500, displayOrder: 1 },
    { name: 'Camarones', category: catMap['protein-premium'], tier: 'premium', portionSize: 100, extraPrice: 5, costPerUnit: 0.018, isTrackable: true, trackingUnit: 'g', currentStock: 0, minStock: 400, displayOrder: 2 },
    { name: 'Kani', category: catMap['protein-premium'], tier: 'premium', portionSize: 100, extraPrice: 5, costPerUnit: 0.012, isTrackable: true, trackingUnit: 'g', currentStock: 0, minStock: 300, displayOrder: 3 },

    // Proteína Base (trackable by grams)
    { name: 'Atún', category: catMap['protein-base'], tier: 'base', portionSize: 100, extraPrice: 3, costPerUnit: 0.015, isTrackable: true, trackingUnit: 'g', currentStock: 0, minStock: 400, displayOrder: 1 },
    { name: 'Ceviche', category: catMap['protein-base'], tier: 'base', portionSize: 100, extraPrice: 3, costPerUnit: 0.012, isTrackable: true, trackingUnit: 'g', currentStock: 0, minStock: 300, displayOrder: 2 },
    {
      name: 'Pollo', category: catMap['protein-base'], tier: 'base', portionSize: 100, extraPrice: 3, costPerUnit: 0.008, isTrackable: true, trackingUnit: 'g', currentStock: 0, minStock: 500, displayOrder: 3,
      preparationStyles: [
        { id: 'plancha', label: 'Pollo a la Plancha' },
        { id: 'crispie', label: 'Pollo Crispie' },
      ],
    },

    // Bases (trackable by grams)
    { name: 'Arroz', category: catMap['base'], tier: null, portionSize: 120, extraPrice: 0, costPerUnit: 0.002, isTrackable: true, trackingUnit: 'g', currentStock: 0, minStock: 1000, displayOrder: 1 },
    { name: 'Quinoa', category: catMap['base'], tier: null, portionSize: 120, extraPrice: 0, costPerUnit: 0.005, isTrackable: true, trackingUnit: 'g', currentStock: 0, minStock: 600, displayOrder: 2 },

    // Vegetales (not trackable - manual)
    { name: 'Zanahoria', category: catMap['vegetable'], tier: null, portionSize: 0, extraPrice: 0, costPerUnit: 0.10, displayOrder: 1 },
    { name: 'Aguacate', category: catMap['vegetable'], tier: null, portionSize: 0, extraPrice: 1, costPerUnit: 0.40, displayOrder: 2 },
    { name: 'Cebolla', category: catMap['vegetable'], tier: null, portionSize: 0, extraPrice: 0, costPerUnit: 0.05, displayOrder: 3 },
    { name: 'Cebollín', category: catMap['vegetable'], tier: null, portionSize: 0, extraPrice: 0, costPerUnit: 0.08, displayOrder: 4 },
    { name: 'Rábanos', category: catMap['vegetable'], tier: null, portionSize: 0, extraPrice: 0, costPerUnit: 0.06, displayOrder: 5 },
    { name: 'Repollo Morado', category: catMap['vegetable'], tier: null, portionSize: 0, extraPrice: 0, costPerUnit: 0.07, displayOrder: 6 },
    { name: 'Maíz', category: catMap['vegetable'], tier: null, portionSize: 0, extraPrice: 0, costPerUnit: 0.04, displayOrder: 7 },

    // Salsas (not trackable - manual)
    { name: 'Fuji', category: catMap['sauce'], tier: null, portionSize: 0, extraPrice: 0.5, costPerUnit: 0.15, displayOrder: 1 },
    { name: 'Anguila', category: catMap['sauce'], tier: null, portionSize: 0, extraPrice: 0.5, costPerUnit: 0.20, displayOrder: 2 },
    { name: 'Teriyaki', category: catMap['sauce'], tier: null, portionSize: 0, extraPrice: 0.5, costPerUnit: 0.12, displayOrder: 3 },
    { name: 'Mayosiracha', category: catMap['sauce'], tier: null, portionSize: 0, extraPrice: 0.5, costPerUnit: 0.10, displayOrder: 4 },

    // Toppings (not trackable - manual)
    { name: 'Maíz Inflado', category: catMap['topping'], tier: null, portionSize: 0, extraPrice: 1, costPerUnit: 0.08, displayOrder: 1 },
    { name: 'Maní', category: catMap['topping'], tier: null, portionSize: 0, extraPrice: 1, costPerUnit: 0.06, displayOrder: 2 },
    { name: 'Cebolla Crunchy', category: catMap['topping'], tier: null, portionSize: 0, extraPrice: 1, costPerUnit: 0.05, displayOrder: 3 },
  ];

  // Add slugs
  for (const item of itemsData) {
    item.slug = slugify(item.name);
  }

  const items = await Item.insertMany(itemsData);
  console.log(`Inserted ${items.length} items`);

  // --- Supplies ---
  const suppliesData = [
    { name: 'Envase Poke Bowl', slug: 'envase-poke-bowl', description: 'Envase desechable para poke bowl', unitCost: 0.35, currentStock: 0, minStock: 50, trackingUnit: 'units', usagePerPoke: 1 },
    { name: 'Tapa Envase', slug: 'tapa-envase', description: 'Tapa para envase de poke bowl', unitCost: 0.15, currentStock: 0, minStock: 50, trackingUnit: 'units', usagePerPoke: 1 },
    { name: 'Cubiertos Desechables', slug: 'cubiertos-desechables', description: 'Set de cubiertos (tenedor/cuchara)', unitCost: 0.10, currentStock: 0, minStock: 80, trackingUnit: 'units', usagePerPoke: 1 },
    { name: 'Servilletas', slug: 'servilletas', description: 'Servilletas de papel', unitCost: 0.02, currentStock: 0, minStock: 100, trackingUnit: 'units', usagePerPoke: 2 },
  ];

  const supplies = await Supply.insertMany(suppliesData);
  console.log(`Inserted ${supplies.length} supplies`);

  const supplyMap = {};
  for (const s of supplies) {
    supplyMap[s.slug] = s._id;
  }

  // --- Poke Types ---
  const pokeTypesData = [
    {
      name: 'Premium',
      slug: 'premium',
      basePrice: 12,
      rules: {
        proteinGrams: 100,
        baseGrams: 120,
        maxVegetables: 4,
        maxSauces: 2,
        maxToppings: 1,
      },
      allowedProteinTiers: ['premium', 'base'],
      supplies: [
        { supply: supplyMap['envase-poke-bowl'], quantity: 1 },
        { supply: supplyMap['tapa-envase'], quantity: 1 },
        { supply: supplyMap['cubiertos-desechables'], quantity: 1 },
        { supply: supplyMap['servilletas'], quantity: 2 },
      ],
    },
    {
      name: 'Base',
      slug: 'base',
      basePrice: 9,
      rules: {
        proteinGrams: 100,
        baseGrams: 120,
        maxVegetables: 4,
        maxSauces: 2,
        maxToppings: 1,
      },
      allowedProteinTiers: ['base'],
      supplies: [
        { supply: supplyMap['envase-poke-bowl'], quantity: 1 },
        { supply: supplyMap['tapa-envase'], quantity: 1 },
        { supply: supplyMap['cubiertos-desechables'], quantity: 1 },
        { supply: supplyMap['servilletas'], quantity: 2 },
      ],
    },
  ];

  const pokeTypes = await PokeType.insertMany(pokeTypesData);
  console.log(`Inserted ${pokeTypes.length} poke types`);

  console.log('\nSeed completed successfully!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
