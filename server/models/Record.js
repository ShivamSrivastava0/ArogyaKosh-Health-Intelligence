import mongoose from 'mongoose';
import { RECORD_CATEGORIES } from '../constants/index.js';

const { Schema } = mongoose;

/** A document in the health locker (prescription, lab report, scan, bill...). */
const recordSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    member: { type: Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 160 },
    category: { type: String, enum: RECORD_CATEGORIES, default: 'OTHER' },
    date: { type: Date, default: () => new Date() },
    doctor: { type: String, trim: true, default: '' },
    facility: { type: String, trim: true, default: '' },
    tags: { type: [String], default: [] },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
    file: {
      key: { type: String, default: null }, // relative path inside upload dir
      name: { type: String, default: '' },
      mime: { type: String, default: '' },
      size: { type: Number, default: 0 },
    },
    summary: { type: String, default: '' },
    // 'AI' summaries are machine-written and shown with a verify-against-report label.
    summarySource: { type: String, enum: ['USER', 'AI'], default: 'USER' },
  },
  { timestamps: true }
);

recordSchema.pre('validate', function checkDate(next) {
  if (this.date && this.date.getTime() > Date.now() + 86400000) this.invalidate('date', 'A record cannot be dated in the future');
  next();
});

recordSchema.index({ owner: 1, date: -1 });
recordSchema.index({ owner: 1, title: 'text', doctor: 'text', facility: 'text', tags: 'text' });

recordSchema.set('toJSON', {
  transform(_d, ret) {
    delete ret.__v;
    if (ret.file) {
      ret.hasFile = Boolean(ret.file.key);
      delete ret.file.key;
    }
    return ret;
  },
});

export default mongoose.model('Record', recordSchema);
