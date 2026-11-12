import mongoose from 'mongoose';
import { REMINDER_TYPES, REMINDER_REPEAT, REMINDER_STATUS } from '../constants/index.js';

const { Schema } = mongoose;

/** Appointments, checkups, tests and any dated health task. */
const reminderSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    type: { type: String, enum: REMINDER_TYPES, default: 'APPOINTMENT' },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 140 },
    dueAt: { type: Date, required: [true, 'Date is required'] },
    doctor: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    repeat: { type: String, enum: REMINDER_REPEAT, default: 'NONE' },
    status: { type: String, enum: REMINDER_STATUS, default: 'UPCOMING' },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

reminderSchema.index({ owner: 1, status: 1, dueAt: 1 });
reminderSchema.set('toJSON', { transform(_d, ret) { delete ret.__v; return ret; } });

export default mongoose.model('Reminder', reminderSchema);
