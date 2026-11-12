import mongoose from 'mongoose';

const { Schema } = mongoose;

const vaccinationSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    member: { type: Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    name: { type: String, required: [true, 'Vaccine name is required'], trim: true },
    dose: { type: String, trim: true, default: '' },
    dueDate: { type: Date, default: null },
    givenDate: { type: Date, default: null },
    provider: { type: String, trim: true, default: '' },
    batch: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    source: { type: String, enum: ['SCHEDULE', 'CUSTOM'], default: 'CUSTOM' },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

vaccinationSchema.index({ member: 1, name: 1, dose: 1 });

/** GIVEN | OVERDUE | DUE (within 30 days) | UPCOMING */
vaccinationSchema.virtual('status').get(function status() {
  if (this.givenDate) return 'GIVEN';
  if (!this.dueDate) return 'UPCOMING';
  const days = (new Date(this.dueDate) - Date.now()) / 86400000;
  if (days < -1) return 'OVERDUE';
  if (days <= 30) return 'DUE';
  return 'UPCOMING';
});

vaccinationSchema.set('toJSON', { virtuals: true, transform(_d, ret) { delete ret.__v; delete ret.id; return ret; } });

export default mongoose.model('Vaccination', vaccinationSchema);
