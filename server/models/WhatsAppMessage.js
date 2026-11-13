import mongoose from 'mongoose';

const { Schema } = mongoose;

/** Every WhatsApp message sent or received, per household. Kept 90 days. */
const whatsAppMessageSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    phone: { type: String, required: true, index: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'Member' }],
    direction: { type: String, enum: ['OUT', 'IN'], required: true },
    kind: { type: String, enum: ['OPT_IN', 'DOSE_REMINDER', 'NUDGE', 'REPLY', 'INBOUND'], required: true },
    body: { type: String, default: '' },
    // Doses this reminder asked about — a "1" reply marks exactly these.
    doses: [{
      _id: false,
      medicine: { type: Schema.Types.ObjectId, ref: 'Medicine' },
      member: { type: Schema.Types.ObjectId, ref: 'Member' },
      name: String,
      date: String,
      time: String,
    }],
    answered: { type: Boolean, default: false },
    key: { type: String, default: undefined }, // de-duplication for scheduled sends
    status: { type: String, enum: ['SIMULATED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'RECEIVED'], default: 'SENT' },
    providerId: { type: String, default: '', index: true },
    error: { type: String, default: '' },
    simulated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

whatsAppMessageSchema.index({ owner: 1, key: 1 }, { unique: true, partialFilterExpression: { key: { $type: 'string' } } });
whatsAppMessageSchema.index({ owner: 1, phone: 1, createdAt: -1 });
whatsAppMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 86400 });

export default mongoose.model('WhatsAppMessage', whatsAppMessageSchema);
