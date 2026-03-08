import Category from '../models/Category.js';
import Item from '../models/Item.js';
import PokeType from '../models/PokeType.js';
import Promotion from '../models/Promotion.js';

export async function getFullCatalog() {
  const [pokeTypes, categories, items, promotions] = await Promise.all([
    PokeType.find({ isActive: true }).sort('slug').lean(),
    Category.find({ isActive: true }).sort('displayOrder').lean(),
    Item.find({ isAvailable: true }).sort('displayOrder').lean(),
    Promotion.find({ active: true })
      .populate('pokeTypes.pokeType', 'name slug basePrice')
      .populate('allowedProteins', 'name slug tier')
      .sort('displayOrder')
      .lean(),
  ]);

  // Group items by category
  const categoriesWithItems = categories.map((cat) => ({
    ...cat,
    items: items.filter((item) => item.category.toString() === cat._id.toString()),
  }));

  return { pokeTypes, categories: categoriesWithItems, promotions };
}

export async function getPokeTypes() {
  return PokeType.find({ isActive: true }).sort('slug').lean();
}

export async function getCategoriesWithItems() {
  const [categories, items] = await Promise.all([
    Category.find({ isActive: true }).sort('displayOrder').lean(),
    Item.find({ isAvailable: true }).sort('displayOrder').lean(),
  ]);

  return categories.map((cat) => ({
    ...cat,
    items: items.filter((item) => item.category.toString() === cat._id.toString()),
  }));
}
