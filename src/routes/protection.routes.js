import { Router } from 'express';
import * as protectionCtrl from '../controllers/protection.controller.js';

const router = Router();

router.get('/summary', protectionCtrl.getSummary);
router.post('/', protectionCtrl.createProtection);
router.get('/history', protectionCtrl.getHistory);

export default router;
