import mongoose from 'mongoose';

const whatsAppLogSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true },
    month: { type: String, required: true },
    orderNumber: { type: String, default: '' },
    template: { type: String, default: '' },
    status: {
      type: String,
      enum: ['sent', 'failed', 'blocked'],
      default: 'sent',
    },
  },
  { timestamps: true }
);

whatsAppLogSchema.index({ month: 1 });
whatsAppLogSchema.index({ phone: 1, month: 1 });

export default mongoose.model('WhatsAppLog', whatsAppLogSchema);
