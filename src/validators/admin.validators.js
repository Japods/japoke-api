import Joi from 'joi';

// --- Categories ---
export const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  slug: Joi.string().trim().lowercase().required(),
  type: Joi.string().valid('protein', 'base', 'vegetable', 'sauce', 'topping').required(),
  displayOrder: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  slug: Joi.string().trim().lowercase(),
  type: Joi.string().valid('protein', 'base', 'vegetable', 'sauce', 'topping'),
  displayOrder: Joi.number().integer().min(0),
  isActive: Joi.boolean(),
}).min(1);

// --- Items ---
export const createItemSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  slug: Joi.string().trim().lowercase().required(),
  category: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  tier: Joi.string().valid('premium', 'base').allow(null).default(null),
  portionSize: Joi.number().min(0).default(0),
  extraPrice: Joi.number().min(0).default(0),
  costPerUnit: Joi.number().min(0).default(0),
  isTrackable: Joi.boolean().default(false),
  trackingUnit: Joi.string().valid('g', 'kg', 'units', 'ml', 'l').default('g'),
  currentStock: Joi.number().min(0).default(0),
  minStock: Joi.number().min(0).default(0),
  isAvailable: Joi.boolean().default(true),
  displayOrder: Joi.number().integer().min(0).default(0),
});

export const updateItemSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  slug: Joi.string().trim().lowercase(),
  category: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  tier: Joi.string().valid('premium', 'base').allow(null),
  portionSize: Joi.number().min(0),
  extraPrice: Joi.number().min(0),
  costPerUnit: Joi.number().min(0),
  isTrackable: Joi.boolean(),
  trackingUnit: Joi.string().valid('g', 'kg', 'units', 'ml', 'l'),
  currentStock: Joi.number().min(0),
  minStock: Joi.number().min(0),
  isAvailable: Joi.boolean(),
  displayOrder: Joi.number().integer().min(0),
}).min(1);

// --- Poke Types ---
export const createPokeTypeSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  slug: Joi.string().trim().lowercase().required(),
  basePrice: Joi.number().positive().required(),
  rules: Joi.object({
    proteinGrams: Joi.number().positive().required(),
    baseGrams: Joi.number().positive().required(),
    maxVegetables: Joi.number().integer().min(0).required(),
    maxSauces: Joi.number().integer().min(0).required(),
    maxToppings: Joi.number().integer().min(0).required(),
  }).required(),
  allowedProteinTiers: Joi.array().items(Joi.string().valid('premium', 'base')).min(1).required(),
  supplies: Joi.array().items(
    Joi.object({
      supply: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
      quantity: Joi.number().min(0).default(1),
    })
  ).default([]),
  isActive: Joi.boolean().default(true),
});

export const updatePokeTypeSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  slug: Joi.string().trim().lowercase(),
  basePrice: Joi.number().positive(),
  rules: Joi.object({
    proteinGrams: Joi.number().positive(),
    baseGrams: Joi.number().positive(),
    maxVegetables: Joi.number().integer().min(0),
    maxSauces: Joi.number().integer().min(0),
    maxToppings: Joi.number().integer().min(0),
  }),
  allowedProteinTiers: Joi.array().items(Joi.string().valid('premium', 'base')).min(1),
  supplies: Joi.array().items(
    Joi.object({
      supply: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
      quantity: Joi.number().min(0).default(1),
    })
  ),
  isActive: Joi.boolean(),
}).min(1);

// --- Order Status ---
export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')
    .required(),
});
