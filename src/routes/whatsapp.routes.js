import { Router } from 'express';
import { getWhatsAppStatus, toggleWhatsApp, sendDeliveryCost } from '../controllers/whatsapp.controller.js';

const router = Router();

router.get('/status', getWhatsAppStatus);
router.patch('/toggle', toggleWhatsApp);
router.post('/delivery-cost', sendDeliveryCost);

export default router;
