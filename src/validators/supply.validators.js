import Joi from 'joi';

export const createSupplySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  slug: Joi.string().trim().lowercase().required(),
  description: Joi.string().allow('').default(''),
  unitCost: Joi.number().min(0).default(0),
  currentStock: Joi.number().min(0).default(0),
  minStock: Joi.number().min(0).default(0),
  trackingUnit: Joi.string().valid('units', 'g', 'kg', 'ml', 'l').default('units'),
  usagePerPoke: Joi.number().min(0).default(1),
  isActive: Joi.boolean().default(true),
});

export const updateSupplySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  slug: Joi.string().trim().lowercase(),
  description: Joi.string().allow(''),
  unitCost: Joi.number().min(0),
  currentStock: Joi.number().min(0),
  minStock: Joi.number().min(0),
  trackingUnit: Joi.string().valid('units', 'g', 'kg', 'ml', 'l'),
  usagePerPoke: Joi.number().min(0),
  isActive: Joi.boolean(),
}).min(1);
