import Joi from 'joi';

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const selectionItemWithQty = Joi.object({
  item: objectId.required(),
  quantity: Joi.number().positive().required(),
});

const selectionItem = Joi.object({
  item: objectId.required(),
});

const extraItem = Joi.object({
  item: objectId.required(),
  quantity: Joi.number().integer().min(1).default(1),
});

const pokeItemSchema = Joi.object({
  pokeType: objectId.required(),
  selections: Joi.object({
    proteins: Joi.array().items(selectionItemWithQty).min(1).max(2).required(),
    bases: Joi.array().items(selectionItemWithQty).min(1).max(2).required(),
    vegetables: Joi.array().items(selectionItem).min(0).max(10).required(),
    sauces: Joi.array().items(selectionItem).min(0).max(10).required(),
    toppings: Joi.array().items(selectionItem).min(0).max(10).required(),
  }).required(),
  extras: Joi.array().items(extraItem).default([]),
});

export const createOrderSchema = Joi.object({
  customer: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    identification: Joi.string().trim().min(3).max(30).required(),
    email: Joi.string().trim().email().required(),
    phone: Joi.string().trim().min(7).max(20).required(),
    address: Joi.string().trim().min(5).max(300).required(),
    notes: Joi.string().trim().max(500).allow('').default(''),
  }).required(),
  items: Joi.array().items(pokeItemSchema).min(1).required(),
  payment: Joi.object({
    method: Joi.string().valid('pago_movil', 'efectivo_usd', 'binance_usdt').required(),
    referenceId: Joi.string().trim().allow('').default(''),
    referenceImageUrl: Joi.string().trim().allow('').default(''),
    amountBs: Joi.number().min(0).allow(null).optional(),
    amountUsd: Joi.number().min(0).allow(null).optional(),
  }).required(),
  splitPayment: Joi.object({
    method: Joi.string().valid('pago_movil', 'efectivo_usd', 'binance_usdt').required(),
    amountBs: Joi.number().min(0).allow(null).optional(),
    amountUsd: Joi.number().min(0).allow(null).optional(),
    referenceId: Joi.string().trim().allow('').default(''),
  }).optional(),
  deliveryTime: Joi.string().trim().max(20).allow(null, '').default(null),
});
