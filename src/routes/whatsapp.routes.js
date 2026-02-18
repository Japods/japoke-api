import { Router } from 'express';
import { getWhatsAppStatus, toggleWhatsApp } from '../controllers/whatsapp.controller.js';

const router = Router();

router.get('/status', getWhatsAppStatus);
router.patch('/toggle', toggleWhatsApp);

export default router;
