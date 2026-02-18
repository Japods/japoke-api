import { Router } from 'express';
import * as dashCtrl from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/summary', dashCtrl.getSummary);
router.get('/sales', dashCtrl.getSales);
router.get('/popular-items', dashCtrl.getPopularItems);
router.get('/popular-poke-types', dashCtrl.getPopularPokeTypes);
router.get('/cost-analysis', dashCtrl.getCostAnalysis);

export default router;
