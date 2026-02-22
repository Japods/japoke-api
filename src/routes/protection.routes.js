import { Router } from 'express';
import * as protectionCtrl from '../controllers/protection.controller.js';

const router = Router();

router.get('/summary', protectionCtrl.getSummary);
router.post('/', protectionCtrl.createProtection);
router.get('/history', protectionCtrl.getHistory);
router.post('/transaction', protectionCtrl.createTransaction);
router.delete('/transaction/:id', protectionCtrl.deleteTransaction);
router.get('/transactions', protectionCtrl.getTransactions);

export default router;
