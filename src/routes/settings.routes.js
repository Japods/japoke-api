import { Router } from 'express';
import * as settingsCtrl from '../controllers/settings.controller.js';

const router = Router();

router.get('/store-status', settingsCtrl.getStatus);
router.put('/store-status', settingsCtrl.setStatus);
router.get('/max-discount', settingsCtrl.getMaxDiscount);
router.put('/max-discount', settingsCtrl.setMaxDiscount);

export default router;
