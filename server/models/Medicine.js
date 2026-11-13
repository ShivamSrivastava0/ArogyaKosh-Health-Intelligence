import mongoose from 'mongoose';
import { MEDICINE_FORMS, MEAL_TIMING } from '../constants/index.js';

const { Schema } = mongoose;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const medicineSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    member: { type: Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    name: { type: String, required: [true, 'Medicine name is required'], trim: true, maxlength: 120 },
    strength: { type: String, trim: true, default: '' },
    form: { type: String, enum: MEDICINE_FORMS, default: 'TABLET' },
    dose: { type: Number, min: 0.25, max: 50, default: 1 },
    times: {
      type: [String],
      default: [],
      validate: { validator: (arr) => arr.every((t) => TIME_RE.test(t)), message: 'Times must be HH:mm' },
    },
    daysOfWeek: { type: [Number], default: [] }, // empty = every day, 0=Sun
    mealTiming: { type: String, enum: MEAL_TIMING, default: 'ANY' },
    startDate: { type: Date, default: () => new Date() },
    endDate: { type: Date, default: null },
    stock: { type: Number, min: 0, default: null },
    refillAt: { type: Number, min: 0, default: 5 },
    expiryDate: { type: Date, default: null },
    prescribedBy: { type: String, trim: true, default: '' },
    reason: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

medicineSchema.index({ owner: 1, active: 1 });

medicineSchema.pre('validate', function checkDates(next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) this.invalidate('endDate', 'End date must be on or after the start date');
  next();
});

medicineSchema.pre('save', function normalise(next) {
  this.times = [...new Set(this.times)].sort();
  next();
});

medicineSchema.set('toJSON', { transform(_d, ret) { delete ret.__v; return ret; } });

export default mongoose.model('Medicine', medicineSchema);
