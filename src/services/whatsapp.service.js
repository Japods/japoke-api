import config from '../config/index.js';
import WhatsAppLog from '../models/WhatsAppLog.js';
import { normalizePhone } from '../utils/phone.js';

const WA_API_URL = `https://graph.facebook.com/v21.0/${config.whatsapp.phoneNumberId}/messages`;

let manuallyDisabled = false;

const STATUS_TEMPLATES = {
  confirmed: {
    name: 'order_confirmed',
    buildBody: (customerName, orderNumber) => [
      { type: 'body', parameters: [{ type: 'text', text: customerName }, { type: 'text', text: orderNumber }] },
    ],
  },
  preparing: {
    name: 'order_preparing',
    buildBody: (customerName, orderNumber) => [
      { type: 'body', parameters: [{ type: 'text', text: customerName }, { type: 'text', text: orderNumber }] },
    ],
  },
  ready: {
    name: 'order_ready',
    buildBody: (customerName, orderNumber) => [
      { type: 'body', parameters: [{ type: 'text', text: customerName }, { type: 'text', text: orderNumber }] },
    ],
  },
  delivered: {
    name: 'order_delivered',
    buildBody: (customerName, orderNumber) => [
      { type: 'body', parameters: [{ type: 'text', text: customerName }, { type: 'text', text: orderNumber }] },
    ],
  },
  cancelled: {
    name: 'order_cancelled',
    buildBody: (customerName, orderNumber) => [
      { type: 'body', parameters: [{ type: 'text', text: customerName }, { type: 'text', text: orderNumber }] },
    ],
  },
};

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function getMonthlyUsage() {
  const month = getCurrentMonth();
  const count = await WhatsAppLog.countDocuments({ month, status: 'sent' });
  return {
    month,
    count,
    limit: config.whatsapp.monthlyLimit,
    remaining: Math.max(0, config.whatsapp.monthlyLimit - count),
    autoPaused: count >= config.whatsapp.monthlyLimit,
  };
}

export function isEnabled() {
  return config.whatsapp.enabled && !manuallyDisabled;
}

export function setManualToggle(enabled) {
  manuallyDisabled = !enabled;
  return !manuallyDisabled;
}

export function getManualToggle() {
  return !manuallyDisabled;
}

async function sendTemplateMessage(phone, templateName, components) {
  const response = await fetch(WA_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.whatsapp.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'es' },
        components,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`WhatsApp API error ${response.status}: ${JSON.stringify(error)}`);
  }

  return response.json();
}

export async function notifyStatusChange(order, newStatus) {
  if (!isEnabled()) {
    console.log(`[WhatsApp] Desactivado - no se envia mensaje para pedido ${order.orderNumber}`);
    return null;
  }

  const templateConfig = STATUS_TEMPLATES[newStatus];
  if (!templateConfig) {
    console.log(`[WhatsApp] Sin template para status "${newStatus}"`);
    return null;
  }

  const phone = normalizePhone(order.customer.phone);
  const month = getCurrentMonth();

  const usage = await getMonthlyUsage();
  if (usage.autoPaused) {
    console.warn(`[WhatsApp] Limite mensual alcanzado (${usage.count}/${usage.limit}). Mensaje bloqueado para ${order.orderNumber}`);
    await WhatsAppLog.create({
      phone,
      month,
      orderNumber: order.orderNumber,
      template: templateConfig.name,
      status: 'blocked',
    });
    return null;
  }

  const customerName = order.customer.name.split(' ')[0];
  const components = templateConfig.buildBody(customerName, order.orderNumber);
  const maskedPhone = phone.slice(0, 4) + '****' + phone.slice(-3);

  try {
    const result = await sendTemplateMessage(phone, templateConfig.name, components);

    await WhatsAppLog.create({
      phone,
      month,
      orderNumber: order.orderNumber,
      template: templateConfig.name,
      status: 'sent',
    });

    console.log(`[WhatsApp] Enviado: ${templateConfig.name} → ${maskedPhone} (pedido ${order.orderNumber})`);
    return result;
  } catch (err) {
    await WhatsAppLog.create({
      phone,
      month,
      orderNumber: order.orderNumber,
      template: templateConfig.name,
      status: 'failed',
    });

    console.error(`[WhatsApp] Error enviando ${templateConfig.name} → ${maskedPhone}: ${err.message}`);
    throw err;
  }
}
