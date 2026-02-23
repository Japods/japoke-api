import { Router } from 'express';
import * as settingsCtrl from '../controllers/settings.controller.js';

const router = Router();

router.get('/store-status', settingsCtrl.getStatus);
router.put('/store-status', settingsCtrl.setStatus);

export default router;
