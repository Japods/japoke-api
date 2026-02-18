import PokeType from '../models/PokeType.js';
import Item from '../models/Item.js';
import Category from '../models/Category.js';
import { AppError } from '../utils/app-error.js';

export async function validatePokeItem(pokeTypeId, selections, extras = []) {
  // 1. Find PokeType and its rules
  const pokeType = await PokeType.findById(pokeTypeId);
  if (!pokeType || !pokeType.isActive) {
    throw new AppError('Tipo de poke no válido o no disponible', 400);
  }

  const { rules, allowedProteinTiers, basePrice } = pokeType;

  // Load all referenced items at once
  const allItemIds = [
    ...selections.proteins.map((p) => p.item),
    ...selections.bases.map((b) => b.item),
    ...selections.vegetables.map((v) => v.item),
    ...selections.sauces.map((s) => s.item),
    ...selections.toppings.map((t) => t.item),
    ...extras.map((e) => e.item),
  ];

  const items = await Item.find({ _id: { $in: allItemIds } }).populate('category').lean();
  const itemMap = {};
  for (const item of items) {
    itemMap[item._id.toString()] = item;
  }

  // Helper to get and validate item exists
  function getItem(id, expectedType) {
    const item = itemMap[id.toString()];
    if (!item) throw new AppError(`Item no encontrado: ${id}`, 400);
    if (!item.isAvailable) throw new AppError(`${item.name} no está disponible`, 400);
    if (expectedType && item.category.type !== expectedType) {
      throw new AppError(`${item.name} no pertenece a la categoría ${expectedType}`, 400);
    }
    return item;
  }

  // 2. Validate proteins
  if (!selections.proteins.length) {
    throw new AppError('Debes seleccionar al menos una proteína', 400);
  }
  if (selections.proteins.length > 2) {
    throw new AppError('Máximo 2 proteínas (mezcla 50/50)', 400);
  }

  let totalProteinGrams = 0;
  const validatedProteins = [];
  for (const p of selections.proteins) {
    const item = getItem(p.item, 'protein');
    if (!allowedProteinTiers.includes(item.tier)) {
      throw new AppError(
        `${item.name} (tier: ${item.tier}) no está permitida en poke ${pokeType.name}`,
        400
      );
    }
    totalProteinGrams += p.quantity;
    validatedProteins.push({ item: item._id, name: item.name, quantity: p.quantity });
  }
  if (totalProteinGrams !== rules.proteinGrams) {
    throw new AppError(
      `Los gramos de proteína deben sumar ${rules.proteinGrams}g (recibido: ${totalProteinGrams}g)`,
      400
    );
  }

  // 3. Validate bases
  if (!selections.bases.length) {
    throw new AppError('Debes seleccionar al menos una base', 400);
  }
  if (selections.bases.length > 2) {
    throw new AppError('Máximo 2 bases (mezcla)', 400);
  }

  let totalBaseGrams = 0;
  const validatedBases = [];
  for (const b of selections.bases) {
    const item = getItem(b.item, 'base');
    totalBaseGrams += b.quantity;
    validatedBases.push({ item: item._id, name: item.name, quantity: b.quantity });
  }
  if (totalBaseGrams !== rules.baseGrams) {
    throw new AppError(
      `Los gramos de base deben sumar ${rules.baseGrams}g (recibido: ${totalBaseGrams}g)`,
      400
    );
  }

  // 4. Validate vegetables
  if (selections.vegetables.length > rules.maxVegetables) {
    throw new AppError(
      `Máximo ${rules.maxVegetables} vegetales (recibido: ${selections.vegetables.length})`,
      400
    );
  }
  const validatedVegetables = [];
  for (const v of selections.vegetables) {
    const item = getItem(v.item, 'vegetable');
    validatedVegetables.push({ item: item._id, name: item.name });
  }

  // 5. Validate sauces
  if (selections.sauces.length > rules.maxSauces) {
    throw new AppError(
      `Máximo ${rules.maxSauces} salsas (recibido: ${selections.sauces.length})`,
      400
    );
  }
  const validatedSauces = [];
  for (const s of selections.sauces) {
    const item = getItem(s.item, 'sauce');
    validatedSauces.push({ item: item._id, name: item.name });
  }

  // 6. Validate toppings
  if (selections.toppings.length > rules.maxToppings) {
    throw new AppError(
      `Máximo ${rules.maxToppings} toppings (recibido: ${selections.toppings.length})`,
      400
    );
  }
  const validatedToppings = [];
  for (const t of selections.toppings) {
    const item = getItem(t.item, 'topping');
    validatedToppings.push({ item: item._id, name: item.name });
  }

  // 7. Validate extras and calculate extra costs
  let extrasTotal = 0;
  const validatedExtras = [];
  for (const extra of extras) {
    const item = getItem(extra.item);
    const catType = item.category.type;

    let expectedType;
    let expectedPrice;
    const qty = extra.quantity || 1;

    if (catType === 'protein' && item.tier === 'premium') {
      expectedType = 'protein-premium';
      expectedPrice = item.extraPrice; // 5
    } else if (catType === 'protein' && item.tier === 'base') {
      expectedType = 'protein-base';
      expectedPrice = item.extraPrice; // 3
    } else if (catType === 'vegetable' && item.slug === 'aguacate') {
      expectedType = 'avocado';
      expectedPrice = item.extraPrice; // 1
    } else if (catType === 'topping') {
      expectedType = 'topping';
      expectedPrice = item.extraPrice; // 1
    } else if (catType === 'sauce') {
      expectedType = 'sauce';
      expectedPrice = item.extraPrice; // 0.5
    } else {
      throw new AppError(`${item.name} no puede ser agregado como extra`, 400);
    }

    const subtotal = expectedPrice * qty;
    extrasTotal += subtotal;

    validatedExtras.push({
      item: item._id,
      name: item.name,
      extraType: expectedType,
      quantity: qty,
      unitPrice: expectedPrice,
      subtotal,
    });
  }

  // 8. Calculate item total
  const itemTotal = basePrice + extrasTotal;

  return {
    pokeType: pokeType._id,
    pokeTypeName: pokeType.name,
    basePrice,
    proteins: validatedProteins,
    bases: validatedBases,
    vegetables: validatedVegetables,
    sauces: validatedSauces,
    toppings: validatedToppings,
    extras: validatedExtras,
    itemTotal,
  };
}
