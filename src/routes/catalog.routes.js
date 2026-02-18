import { Router } from 'express';
import * as catalogCtrl from '../controllers/catalog.controller.js';

const router = Router();

router.get('/', catalogCtrl.getFullCatalog);
router.get('/poke-types', catalogCtrl.getPokeTypes);
router.get('/categories', catalogCtrl.getCategories);

export default router;
