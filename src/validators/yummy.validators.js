import Joi from 'joi';

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const proteinSelectionSchema = Joi.object({
  item: objectId.required(),
  quantity: Joi.number().positive().required(),
  preparationStyle: Joi.string().allow(null, ''),
});

const ingredientSelectionSchema = Joi.object({
  item: objectId.required(),
  quantity: Joi.number().positive(),
});

const selectionsSchema = Joi.object({
  proteins: Joi.array().items(proteinSelectionSchema).min(1).required(),
  bases: Joi.array().items(ingredientSelectionSchema).min(1).required(),
  vegetables: Joi.array()
    .items(Joi.object({ item: objectId.required() }))
    .default([]),
  fruits: Joi.array()
    .items(Joi.object({ item: objectId.required() }))
    .default([]),
  sauces: Joi.array()
    .items(Joi.object({ item: objectId.required() }))
    .default([]),
  toppings: Joi.array()
    .items(Joi.object({ item: objectId.required() }))
    .default([]),
});

const extraSchema = Joi.object({
  item: objectId.required(),
  quantity: Joi.number().integer().min(1).default(1),
  preparationStyle: Joi.string().allow(null, ''),
});

const pokeItemSchema = Joi.object({
  pokeType: objectId.required(),
  selections: selectionsSchema.required(),
  extras: Joi.array().items(extraSchema).default([]),
});

const addOnSchema = Joi.object({
  item: objectId.required(),
  quantity: Joi.number().integer().min(1).default(1),
});

export const createYummyOrderSchema = Joi.object({
  externalOrderId: Joi.string().trim().min(1).required(),
  customerName: Joi.string().trim().allow('').default(''),
  items: Joi.array().items(pokeItemSchema).min(1).required(),
  addOns: Joi.array().items(addOnSchema).default([]),
  commissionRate: Joi.number().min(0).max(1).default(0.08),
  expectedPayoutDate: Joi.date().iso().allow(null),
  notes: Joi.string().trim().allow('').default(''),
});

export const createYummyPayoutSchema = Joi.object({
  orderIds: Joi.array().items(objectId).min(1).required(),
  paidAt: Joi.date().iso().required(),
  bankReference: Joi.string().trim().allow('').default(''),
  notes: Joi.string().trim().allow('').default(''),
  netAmountBs: Joi.number().min(0).default(0),
  periodFrom: Joi.date().iso().allow(null),
  periodTo: Joi.date().iso().allow(null),
});
