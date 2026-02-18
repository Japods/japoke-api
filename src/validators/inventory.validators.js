import Joi from 'joi';

export const purchaseSchema = Joi.object({
  refModel: Joi.string().valid('Item', 'Supply').required(),
  refId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  quantity: Joi.number().positive().required(),
  unitCost: Joi.number().min(0).required(),
  notes: Joi.string().allow('').default(''),
  updateCost: Joi.boolean().default(false),
});

export const adjustmentSchema = Joi.object({
  refModel: Joi.string().valid('Item', 'Supply').required(),
  refId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  newStock: Joi.number().min(0).required(),
  reason: Joi.string().valid('manual_adjustment', 'waste').default('manual_adjustment'),
  notes: Joi.string().allow('').default(''),
});
