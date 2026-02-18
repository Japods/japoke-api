import ExchangeRate from '../models/ExchangeRate.js';

const logger = {
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

const DOLARAPI_BASE = 'https://ve.dolarapi.com/v1';

const ENDPOINTS = {
  dolar_bcv: '/dolares/oficial',
  euro_bcv: '/euros/oficial',
  dolar_paralelo: '/dolares/paralelo',
  euro_paralelo: '/euros/paralelo',
};

// In-memory cache to avoid hitting DB on every request
let ratesCache = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch rates from dolarapi.com and store them in the database.
 */
export async function fetchAndStoreRates() {
  const results = {};

  for (const [type, endpoint] of Object.entries(ENDPOINTS)) {
    try {
      const response = await fetch(`${DOLARAPI_BASE}${endpoint}`);
      if (!response.ok) {
        logger.warn(`[ExchangeRate] Failed to fetch ${type}: HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const rate = data.promedio;

      if (!rate || rate <= 0) {
        logger.warn(`[ExchangeRate] Invalid rate for ${type}: ${rate}`);
        continue;
      }

      const saved = await ExchangeRate.create({
        type,
        rate,
        source: 'dolarapi.com',
        fetchedAt: new Date(data.fechaActualizacion || Date.now()),
      });

      results[type] = saved.rate;
    } catch (err) {
      logger.error(`[ExchangeRate] Error fetching ${type}: ${err.message}`);
    }
  }

  // Invalidate cache
  ratesCache = null;
  cacheTimestamp = 0;

  logger.info(`[ExchangeRate] Rates updated: ${JSON.stringify(results)}`);
  return results;
}

/**
 * Get the latest rates from DB (with in-memory cache).
 */
export async function getLatestRates() {
  const now = Date.now();
  if (ratesCache && now - cacheTimestamp < CACHE_TTL_MS) {
    return ratesCache;
  }

  const types = Object.keys(ENDPOINTS);
  const rates = {};

  for (const type of types) {
    const latest = await ExchangeRate.findOne({ type })
      .sort({ fetchedAt: -1 })
      .lean();

    if (latest) {
      rates[type] = {
        rate: latest.rate,
        fetchedAt: latest.fetchedAt,
      };
    }
  }

  ratesCache = rates;
  cacheTimestamp = now;

  return rates;
}

/**
 * Get a snapshot object with the 3 main rates for embedding in orders/purchases.
 * Returns { euroBcv, dolarBcv, dolarParalelo } with numeric values.
 */
export async function getRatesSnapshot() {
  const rates = await getLatestRates();

  return {
    euroBcv: rates.euro_bcv?.rate || 0,
    dolarBcv: rates.dolar_bcv?.rate || 0,
    dolarParalelo: rates.dolar_paralelo?.rate || 0,
  };
}

/**
 * Get exchange rate history for admin dashboard.
 */
export async function getRateHistory({ type, from, to, limit = 100 } = {}) {
  const query = {};
  if (type) query.type = type;
  if (from || to) {
    query.fetchedAt = {};
    if (from) query.fetchedAt.$gte = new Date(from);
    if (to) query.fetchedAt.$lte = new Date(to);
  }

  return ExchangeRate.find(query)
    .sort({ fetchedAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Start the cron job for fetching rates.
 */
export function startRatesCron(cron) {
  // Every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    logger.info('[ExchangeRate] Cron: fetching rates...');
    try {
      await fetchAndStoreRates();
    } catch (err) {
      logger.error(`[ExchangeRate] Cron error: ${err.message}`);
    }
  });

  // Fetch immediately on startup
  fetchAndStoreRates().catch((err) =>
    logger.error(`[ExchangeRate] Initial fetch error: ${err.message}`)
  );

  logger.info('[ExchangeRate] Cron job started (every 30 min)');
}
