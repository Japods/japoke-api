import { Router } from 'express';
import catalogRoutes from './catalog.routes.js';
import ordersRoutes from './orders.routes.js';
import adminRoutes from './admin.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import inventoryRoutes from './inventory.routes.js';
import whatsappRoutes from './whatsapp.routes.js';
import exchangeRateRoutes from './exchangeRate.routes.js';
import exchangeRateAdminRoutes from './exchangeRateAdmin.routes.js';
import protectionRoutes from './protection.routes.js';
import purchasesRoutes from './purchases.routes.js';
import settingsRoutes from './settings.routes.js';
import { getStatus } from '../controllers/settings.controller.js';

const router = Router();

// Public: landing page checks this to show open/closed screen
router.get('/store-status', getStatus);

router.use('/catalog', catalogRoutes);
router.use('/orders', ordersRoutes);
router.use('/exchange-rates', exchangeRateRoutes);
router.use('/admin', adminRoutes);
router.use('/admin/dashboard', dashboardRoutes);
router.use('/admin/inventory', inventoryRoutes);
router.use('/admin/whatsapp', whatsappRoutes);
router.use('/admin/exchange-rates', exchangeRateAdminRoutes);
router.use('/admin/protection', protectionRoutes);
router.use('/admin/purchases', purchasesRoutes);
router.use('/admin/settings', settingsRoutes);

export default router;
