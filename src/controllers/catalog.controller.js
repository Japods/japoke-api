import { asyncHandler } from '../utils/async-handler.js';
import * as catalogService from '../services/catalog.service.js';

export const getFullCatalog = asyncHandler(async (_req, res) => {
  const catalog = await catalogService.getFullCatalog();
  res.json({ success: true, data: catalog });
});

export const getPokeTypes = asyncHandler(async (_req, res) => {
  const pokeTypes = await catalogService.getPokeTypes();
  res.json({ success: true, data: pokeTypes });
});

export const getCategories = asyncHandler(async (_req, res) => {
  const categories = await catalogService.getCategoriesWithItems();
  res.json({ success: true, data: categories });
});
