import { Router } from 'express';
import * as ctrl from '../controllers/exchangeRate.controller.js';

const router = Router();

// Public - latest rates (used by customer frontend)
router.get('/latest', ctrl.getLatestRates);

export default router;
