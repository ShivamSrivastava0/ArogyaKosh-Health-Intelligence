import mongoose from 'mongoose';
import { VITAL_TYPES, VITALS, classifyVital, validateReading } from '../data/vitals.js';

const { Schema } = mongoose;

/** Where a reading came from — shown next to it so users know what to trust. */
export const VITAL_SOURCES = ['MANUAL', 'REPORT_AI', 'REPORT_MANUAL', 'ABDM'];

const vitalSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    type: { type: String, enum: VITAL_TYPES, required: true },
    value: { type: Number, required: [true, 'Value is required'] },
    value2: { type: Number, default: null },
    unit: { type: String, default: '' },
    status: { type: String, default: 'NORMAL' },
    at: { type: Date, default: () => new Date() },
    note: { type: String, trim: true, maxlength: 300, default: '' },
    record: { type: Schema.Types.ObjectId, ref: 'Record', default: null },
    source: { type: String, enum: VITAL_SOURCES, default: 'MANUAL' },
  },
  { timestamps: true }
);

vitalSchema.index({ member: 1, type: 1, at: -1 });

vitalSchema.pre('validate', function derive(next) {
  const def = VITALS[this.type];
  if (!def) return next();
  const check = validateReading(this.type, this.value, def.dual ? this.value2 : undefined);
  if (!check.ok) {
    this.invalidate(def.dual && /diastolic|bottom/i.test(check.message) ? 'value2' : 'value', check.message);
    return next();
  }
  if (this.at && this.at.getTime() > Date.now() + 10 * 60000) {
    this.invalidate('at', 'A reading cannot be dated in the future');
    return next();
  }
  this.unit = def.unit;
  this.status = classifyVital(this.type, this.value, this.value2);
  return next();
});

vitalSchema.set('toJSON', { transform(_d, ret) { delete ret.__v; return ret; } });

export default mongoose.model('Vital', vitalSchema);
