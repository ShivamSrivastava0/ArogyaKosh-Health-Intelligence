import mongoose from 'mongoose';
import { VITAL_TYPES, VITALS, classifyVital } from '../data/vitals.js';

const { Schema } = mongoose;

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
  },
  { timestamps: true }
);

vitalSchema.index({ member: 1, type: 1, at: -1 });

vitalSchema.pre('validate', function derive(next) {
  const def = VITALS[this.type];
  if (def) {
    this.unit = def.unit;
    if (def.dual && (this.value2 === null || this.value2 === undefined)) {
      this.invalidate('value2', 'Diastolic value is required for blood pressure');
      return next();
    }
    this.status = classifyVital(this.type, this.value, this.value2);
  }
  next();
});

vitalSchema.set('toJSON', { transform(_d, ret) { delete ret.__v; return ret; } });

export default mongoose.model('Vital', vitalSchema);
