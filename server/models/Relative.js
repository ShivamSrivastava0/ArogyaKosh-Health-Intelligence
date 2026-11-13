import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * A blood relative who isn't tracked in the app (grandparents, uncles, a
 * sibling abroad, someone who has passed away). Only what matters for
 * hereditary risk is stored: position in the family, sex, conditions and the
 * age they started.
 */
export const RELATIVE_POSITIONS = [
  'P_GF', 'P_GM', 'M_GF', 'M_GM', // paternal / maternal grandparents
  'FATHER', 'MOTHER', 'P_UNCLE_AUNT', 'M_UNCLE_AUNT',
  'SIBLING', 'CHILD', 'FATHER_IN_LAW', 'MOTHER_IN_LAW',
];

const relativeSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, trim: true, maxlength: 60, required: [true, 'Add a name or a label like "Dadaji"'] },
    position: { type: String, enum: RELATIVE_POSITIONS, required: true },
    sex: { type: String, enum: ['MALE', 'FEMALE', ''], default: '' },
    deceased: { type: Boolean, default: false },
    ageAtDeath: { type: Number, min: 0, max: 120, default: null },
    conditions: [{
      name: { type: String, required: true, trim: true, maxlength: 80 },
      ageAtOnset: { type: Number, min: 0, max: 120, default: null },
    }],
    notes: { type: String, trim: true, maxlength: 300, default: '' },
  },
  { timestamps: true }
);

relativeSchema.set('toJSON', { transform(_d, ret) { delete ret.__v; return ret; } });

export default mongoose.model('Relative', relativeSchema);
