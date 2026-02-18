import { Router } from 'express';
import * as ctrl from '../controllers/exchangeRate.controller.js';

const router = Router();

// Admin - rate history with filters
router.get('/history', ctrl.getRateHistory);

// Admin - force refresh rates
router.post('/refresh', ctrl.refreshRates);

export default router;
