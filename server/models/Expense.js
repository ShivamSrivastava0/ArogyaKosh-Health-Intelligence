import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES, PAYMENT_MODES } from '../constants/index.js';

const { Schema } = mongoose;

const expenseSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    member: { type: Schema.Types.ObjectId, ref: 'Member', default: null },
    category: { type: String, enum: EXPENSE_CATEGORIES, default: 'OTHER' },
    amount: { type: Number, required: [true, 'Amount is required'], min: [0, 'Amount cannot be negative'] },
    date: { type: Date, default: () => new Date() },
    vendor: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, maxlength: 500, default: '' },
    paymentMode: { type: String, enum: PAYMENT_MODES, default: 'UPI' },
    taxDeductible: { type: Boolean, default: false },
    reimbursed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

expenseSchema.index({ owner: 1, date: -1 });
expenseSchema.set('toJSON', { transform(_d, ret) { delete ret.__v; return ret; } });

export default mongoose.model('Expense', expenseSchema);
