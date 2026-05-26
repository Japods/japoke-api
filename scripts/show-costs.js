import 'dotenv/config';
import mongoose from 'mongoose';
import config from '../src/config/index.js';
import Item from '../src/models/Item.js';
import Supply from '../src/models/Supply.js';
import Category from '../src/models/Category.js';
import Compra from '../src/models/Compra.js';

await mongoose.connect(config.mongoUri);

const categories = await Category.find().lean();
const catMap = {};
for (const c of categories) catMap[c._id.toString()] = c.name;

const items = await Item.find({ isAvailable: true }).sort({ category: 1, name: 1 }).lean();

console.log('=== ITEMS (ingredientes de poke) ===\n');
let lastCat = '';
for (const i of items) {
  const cat = catMap[i.category?.toString()] || '?';
  if (cat !== lastCat) {
    console.log('--- ' + cat.toUpperCase() + ' ---');
    lastCat = cat;
  }
  const costLabel = i.portionSize > 0
    ? '$' + (i.costPerUnit || 0).toFixed(4) + '/' + i.trackingUnit + ' (porcion ' + i.portionSize + i.trackingUnit + ' = $' + ((i.costPerUnit || 0) * i.portionSize).toFixed(2) + ')'
    : '$' + (i.costPerUnit || 0).toFixed(4) + '/porcion';
  const trackInfo = i.isTrackable ? ' [TRACK stock=' + i.currentStock + ']' : ' [NO track]';
  console.log('  ' + i.name + ': ' + costLabel + trackInfo);
}

const supplies = await Supply.find({ isActive: true }).sort({ name: 1 }).lean();
console.log('\n=== SUPPLIES (insumos generales) ===');
for (const s of supplies) {
  console.log('  ' + s.name + ': $' + (s.unitCost || 0).toFixed(4) + '/' + s.trackingUnit + ' (uso/poke: ' + s.usagePerPoke + ') [stock=' + s.currentStock + ']');
}

// Show recent compras to see if costs are linked
const compras = await Compra.find().sort({ date: -1 }).limit(10).lean();
console.log('\n=== COMPRAS RECIENTES (ultimas 10) ===');
for (const c of compras) {
  console.log('\n' + c.date.toISOString().slice(0, 10) + ' | ' + c.supplier + ' | ' + c.totalBS.toFixed(2) + ' Bs ($' + c.totalUSD.toFixed(2) + ')');
  for (const item of c.items) {
    const linked = item.refId ? ' -> ' + item.refModel + ':' + item.refId : ' [NO VINCULADO]';
    const stockFlag = item.stockUpdated ? ' [STOCK OK]' : ' [STOCK NO]';
    console.log('  ' + item.name + ': ' + item.quantity + ' ' + item.unit + ' @ ' + item.unitPriceBS.toFixed(2) + ' Bs/' + item.unit + linked + stockFlag);
  }
}

await mongoose.disconnect();
