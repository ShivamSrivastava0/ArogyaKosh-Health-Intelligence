import mongoose from 'mongoose';
import { DOSE_STATUS } from '../constants/index.js';

const { Schema } = mongoose;

/** One row per scheduled dose that was acted on (taken or skipped). */
const doseLogSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    medicine: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    time: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    status: { type: String, enum: DOSE_STATUS, required: true },
    at: { type: Date, default: () => new Date() },
  },
  { timestamps: false }
);

doseLogSchema.index({ medicine: 1, date: 1, time: 1 }, { unique: true });
doseLogSchema.index({ owner: 1, date: 1 });

export default mongoose.model('DoseLog', doseLogSchema);
