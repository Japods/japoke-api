import cron from 'node-cron';
import config from './config/index.js';
import { connectDB } from './config/database.js';
import app from './app.js';
import { startRatesCron } from './services/exchangeRate.service.js';

async function start() {
  await connectDB();

  // Start exchange rate cron job
  startRatesCron(cron);

  app.listen(config.port, () => {
    console.log(`Japoke API running on port ${config.port} [${config.nodeEnv}]`);
  });
}

start();
