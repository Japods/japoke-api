import 'dotenv/config';
import mongoose from 'mongoose';
import config from '../src/config/index.js';
import Order from '../src/models/Order.js';

/**
 * One-time migration: fix orders where addSplitPayment was used
 * but payment.amountBs was not adjusted (still contains the full total).
 *
 * Detection heuristic:
 *   An order has a splitPayment AND payment.amountBs ≈ total * euroBcv
 *   (i.e. the primary amount was never reduced by the split portion).
 *
 * Run:  node scripts/fix-split-payment-amounts.js [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');

async function run() {
  await mongoose.connect(config.mongoUri);
  console.log(`Connected to MongoDB. ${DRY_RUN ? '(DRY RUN - no changes)' : ''}`);

  // Find orders that have a splitPayment with a method set
  const orders = await Order.find({
    'splitPayment.method': { $exists: true, $ne: null },
  }).lean();

  console.log(`Found ${orders.length} orders with split payments.\n`);

  let fixedCount = 0;

  for (const order of orders) {
    const primary = order.payment;
    const split = order.splitPayment;
    const rates = primary.rates || {};
    const dolarParalelo = rates.dolarParalelo || 0;
    const euroBcv = rates.euroBcv || 0;

    if (!dolarParalelo || !euroBcv) {
      console.log(`  [SKIP] ${order.orderNumber} - no rates stored, cannot compute.`);
      continue;
    }

    // Calculate what the full order amount in Bs should be
    const fullBs = Math.round(order.total * euroBcv * 100) / 100;

    // Check if payment.amountBs is still ≈ the full amount (within 1% tolerance)
    const tolerance = fullBs * 0.01;
    const primaryBsLooksLikeFull = primary.amountBs && Math.abs(primary.amountBs - fullBs) <= Math.max(tolerance, 1);

    if (!primaryBsLooksLikeFull) {
      // Primary amount was already adjusted (likely created via frontend) — skip
      console.log(`  [OK]   ${order.orderNumber} - primary amountBs (${primary.amountBs}) already looks partial. Full was ${fullBs}.`);
      continue;
    }

    // Calculate how much the split covers in Bs
    const isUsd = (m) => m === 'efectivo_usd' || m === 'binance_usdt';
    let splitBsEquivalent = 0;

    if (isUsd(split.method) && split.amountUsd) {
      splitBsEquivalent = Math.round(split.amountUsd * dolarParalelo * 100) / 100;
    } else if (split.method === 'pago_movil' && split.amountBs) {
      splitBsEquivalent = split.amountBs;
    }

    if (splitBsEquivalent <= 0) {
      console.log(`  [SKIP] ${order.orderNumber} - could not determine split Bs equivalent.`);
      continue;
    }

    const newPrimaryBs = Math.max(0, Math.round((primary.amountBs - splitBsEquivalent) * 100) / 100);
    const newPrimaryUsd = dolarParalelo > 0 ? Math.round((newPrimaryBs / dolarParalelo) * 100) / 100 : 0;

    console.log(`  [FIX]  ${order.orderNumber}:`);
    console.log(`         payment.amountBs: ${primary.amountBs} → ${newPrimaryBs}`);
    console.log(`         payment.amountUsd: ${primary.amountUsd} → ${newPrimaryUsd}`);
    console.log(`         split (${split.method}): Bs=${split.amountBs || '-'}, USD=${split.amountUsd || '-'}`);

    if (!DRY_RUN) {
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            'payment.amountBs': newPrimaryBs,
            'payment.amountUsd': newPrimaryUsd,
          },
        },
      );
    }

    fixedCount++;
  }

  console.log(`\n${DRY_RUN ? 'Would fix' : 'Fixed'} ${fixedCount} orders.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
