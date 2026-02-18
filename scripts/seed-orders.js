/**
 * Seed script: inserts test orders across the past 7 days
 * Run: node scripts/seed-orders.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import config from '../src/config/index.js';

const PREMIUM_ID = '6993de083b032662d3038427';
const BASE_ID = '6993de083b032662d3038428';

const PROTEINS = {
  salmon:  { _id: '6993de073b032662d303840e', name: 'Salmón', tier: 'premium' },
  camarones: { _id: '6993de073b032662d303840f', name: 'Camarones', tier: 'premium' },
  kani:    { _id: '6993de073b032662d3038410', name: 'Kani', tier: 'premium' },
  atun:    { _id: '6993de073b032662d3038411', name: 'Atún', tier: 'base' },
  ceviche: { _id: '6993de073b032662d3038412', name: 'Ceviche', tier: 'base' },
  pollo:   { _id: '6993de073b032662d3038413', name: 'Pollo a la Plancha', tier: 'base' },
  crispie: { _id: '6993de073b032662d3038414', name: 'Pollo Crispie', tier: 'base' },
};

const BASES = {
  arroz:  { _id: '6993de073b032662d3038415', name: 'Arroz' },
  quinoa: { _id: '6993de073b032662d3038416', name: 'Quinoa' },
};

const VEGS = [
  { _id: '6993de073b032662d3038417', name: 'Zanahoria' },
  { _id: '6993de073b032662d3038419', name: 'Cebolla' },
  { _id: '6993de073b032662d303841a', name: 'Cebollín' },
  { _id: '6993de073b032662d303841d', name: 'Maíz' },
  { _id: '6993de073b032662d303841c', name: 'Repollo Morado' },
];

const SAUCES = [
  { _id: '6993de073b032662d303841e', name: 'Fuji' },
  { _id: '6993de073b032662d303841f', name: 'Anguila' },
  { _id: '6993de073b032662d3038420', name: 'Teriyaki' },
];

const TOPPINGS = [
  { _id: '6993de073b032662d3038422', name: 'Maíz Inflado' },
  { _id: '6993de073b032662d3038423', name: 'Maní' },
];

const CUSTOMERS = [
  { name: 'Carlos Rodríguez', identification: 'V-20456789', email: 'carlos@test.com', phone: '04121234567', address: 'Av. Libertador, Caracas', notes: '' },
  { name: 'María García', identification: 'V-19876543', email: 'maria@test.com', phone: '04149876543', address: 'Calle 5, Los Palos Grandes', notes: '' },
  { name: 'José Pérez', identification: 'V-22345678', email: 'jose@test.com', phone: '04261112233', address: 'Urb. El Hatillo, Local 3', notes: 'Sin cebolla por favor' },
  { name: 'Ana Martínez', identification: 'V-21567890', email: 'ana@test.com', phone: '04165554433', address: 'CC Sambil, Nivel Feria', notes: '' },
  { name: 'Luis Hernández', identification: 'V-23456789', email: 'luis@test.com', phone: '04247778899', address: 'Av. Francisco de Miranda', notes: '' },
  { name: 'Sofía López', identification: 'V-24567890', email: 'sofia@test.com', phone: '04123334455', address: 'Calle Principal, Altamira', notes: '' },
  { name: 'Pedro Gómez', identification: 'V-18765432', email: 'pedro@test.com', phone: '04146667788', address: 'Av. Urdaneta, Centro', notes: '' },
  { name: 'Valentina Ruiz', identification: 'V-25678901', email: 'valentina@test.com', phone: '04269998877', address: 'Res. Las Mercedes, Torre A', notes: '' },
];

const RATES = { euroBcv: 470.28, dolarBcv: 396.37, dolarParalelo: 532.98 };
const METHODS = ['pago_movil', 'pago_movil', 'pago_movil', 'efectivo_usd', 'binance_usdt'];
const STATUSES = ['delivered', 'delivered', 'delivered', 'delivered', 'ready', 'preparing', 'confirmed'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

function daysAgo(d, hourOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() - d);
  date.setHours(10 + hourOffset, Math.floor(Math.random() * 60), 0, 0);
  return date;
}

function buildBowl(isPremium) {
  const pokeTypeId = isPremium ? PREMIUM_ID : BASE_ID;
  const pokeTypeName = isPremium ? 'Premium' : 'Base';
  const basePrice = isPremium ? 13 : 10;

  const proteinPool = isPremium
    ? Object.values(PROTEINS)
    : Object.values(PROTEINS).filter(p => p.tier === 'base');
  const protein = pick(proteinPool);
  const base = pick(Object.values(BASES));
  const vegs = pickN(VEGS, 2 + Math.floor(Math.random() * 3));
  const sauce = pickN(SAUCES, 1 + Math.floor(Math.random() * 2));
  const topping = pickN(TOPPINGS, Math.random() > 0.5 ? 1 : 0);

  return {
    pokeType: new mongoose.Types.ObjectId(pokeTypeId),
    pokeTypeName,
    basePrice,
    proteins: [{ item: new mongoose.Types.ObjectId(protein._id), name: protein.name, quantity: 100 }],
    bases: [{ item: new mongoose.Types.ObjectId(base._id), name: base.name, quantity: 120 }],
    vegetables: vegs.map(v => ({ item: new mongoose.Types.ObjectId(v._id), name: v.name })),
    sauces: sauce.map(s => ({ item: new mongoose.Types.ObjectId(s._id), name: s.name })),
    toppings: topping.map(t => ({ item: new mongoose.Types.ObjectId(t._id), name: t.name })),
    extras: [],
    itemTotal: basePrice,
  };
}

async function seed() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to MongoDB');

  const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false, timestamps: true, collection: 'orders' }));

  // Find current max order number
  const last = await Order.findOne().sort({ createdAt: -1 }).lean();
  let nextNum = 13;
  if (last?.orderNumber) {
    const n = parseInt(last.orderNumber.split('-')[1], 10);
    if (n >= nextNum) nextNum = n + 1;
  }

  // Orders to create: spread across 7 days, varying quantity per day
  const ordersPerDay = [3, 5, 4, 6, 3, 7, 4]; // Mon-Sun this week
  const orders = [];

  for (let day = 6; day >= 0; day--) {
    const count = ordersPerDay[6 - day];
    for (let i = 0; i < count; i++) {
      const bowlCount = Math.random() > 0.7 ? 2 : 1;
      const isPremium = Math.random() > 0.3;
      const items = [];
      for (let b = 0; b < bowlCount; b++) {
        items.push(buildBowl(b === 0 ? isPremium : Math.random() > 0.5));
      }

      const total = items.reduce((s, item) => s + item.itemTotal, 0);
      const method = pick(METHODS);
      const amountBs = Math.round(total * RATES.euroBcv * 100) / 100;
      const amountUsd = Math.round(amountBs / RATES.dolarParalelo * 100) / 100;
      const status = pick(STATUSES);
      const customer = pick(CUSTOMERS);
      const orderDate = daysAgo(day, i);

      const orderNumber = `JAP-${String(nextNum++).padStart(4, '0')}`;

      orders.push({
        orderNumber,
        customer,
        items,
        subtotal: total,
        total,
        payment: {
          method,
          referenceId: method === 'pago_movil' ? String(1000 + Math.floor(Math.random() * 9000)) : '',
          referenceImageUrl: '',
          amountEur: total,
          amountBs,
          amountUsd,
          rates: RATES,
          status: 'verified',
        },
        status,
        createdAt: orderDate,
        updatedAt: orderDate,
      });
    }
  }

  const result = await Order.insertMany(orders);
  console.log(`Inserted ${result.length} test orders (JAP-0013 to JAP-${String(nextNum - 1).padStart(4, '0')})`);
  console.log(`Distribution: ${ordersPerDay.join(', ')} orders per day (past 7 days)`);

  await mongoose.disconnect();
  console.log('Done!');
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
