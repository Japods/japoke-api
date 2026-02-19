import Joi from 'joi';

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const compraItemSchema = Joi.object({
  name: Joi.string().trim().required(),
  quantity: Joi.number().positive().required(),
  unit: Joi.string()
    .valid('kg', 'g', 'l', 'ml', 'unidad', 'caja', 'paquete')
    .required(),
  unitPriceBS: Joi.number().min(0).required(),
  subtotalBS: Joi.number().min(0).required(),

  // Vinculo opcional con Item o Supply del catalogo
  refModel: Joi.string().valid('Item', 'Supply').allow(null).default(null),
  refId: objectId.allow(null).default(null),
});

export const createPurchaseSchema = Joi.object({
  date: Joi.date().iso().default(() => new Date()),
  supplier: Joi.string().trim().required(),
  invoiceNumber: Joi.string().trim().allow('').default(''),
  description: Joi.string().trim().allow('').default(''),
  items: Joi.array().items(compraItemSchema).default([]),
  totalBS: Joi.number().positive().required(),
  bcvRate: Joi.number().positive().required(),
  usdtRate: Joi.number().positive().required(),
  notes: Joi.string().trim().allow('').default(''),
});

export const updatePurchaseSchema = Joi.object({
  date: Joi.date().iso(),
  supplier: Joi.string().trim(),
  invoiceNumber: Joi.string().trim().allow(''),
  description: Joi.string().trim().allow(''),
  items: Joi.array().items(compraItemSchema),
  totalBS: Joi.number().positive(),
  bcvRate: Joi.number().positive(),
  usdtRate: Joi.number().positive(),
  notes: Joi.string().trim().allow(''),
}).min(1);
