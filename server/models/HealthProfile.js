import mongoose from 'mongoose';
import {
  BLOOD_GROUPS,
  GENDERS,
  ALLERGY_SEVERITIES,
  MEDICINE_FREQUENCIES,
  LIFESTYLE_OPTIONS,
  RELATIONS,
} from '../constants/index.js';

// ---------------------------------------------------------------------------
// Sub-schemas (embedded documents)
// ---------------------------------------------------------------------------

const allergySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    severity: { type: String, enum: ALLERGY_SEVERITIES, default: 'MILD' },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, trim: true, default: '' },
    frequency: { type: String, enum: MEDICINE_FREQUENCIES, default: '1/day' },
    prescribedBy: { type: String, trim: true, default: '' },
    startDate: { type: Date, default: null },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

const diseaseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    diagnosedDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['Active', 'Managed', 'Resolved'],
      default: 'Active',
    },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

const insuranceSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true, trim: true },
    policyNumber: { type: String, trim: true, default: '' },
    validTill: { type: Date, default: null },
    coverageAmount: { type: Number, default: 0 },
    type: {
      type: String,
      enum: ['Health', 'Life', 'Accident', 'Critical Illness', 'Other'],
      default: 'Health',
    },
  },
  { _id: true }
);

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    relation: { type: String, enum: RELATIONS, default: 'OTHER' },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

// ---------------------------------------------------------------------------
// Main Health Profile Schema
// ---------------------------------------------------------------------------

const healthProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    personalDetails: {
      dateOfBirth: { type: Date, default: null },
      gender: { type: String, enum: [...GENDERS, ''], default: '' },
      bloodGroup: { type: String, enum: [...BLOOD_GROUPS, ''], default: '' },
      height: { type: Number, default: null }, // in cm
      weight: { type: Number, default: null }, // in kg
      phone: { type: String, trim: true, default: '' },
      address: { type: String, trim: true, default: '' },
    },

    allergies: {
      type: [allergySchema],
      default: [],
    },

    currentMedicines: {
      type: [medicineSchema],
      default: [],
    },

    chronicDiseases: {
      type: [diseaseSchema],
      default: [],
    },

    insurancePolicies: {
      type: [insuranceSchema],
      default: [],
    },

    emergencyContacts: {
      type: [emergencyContactSchema],
      default: [],
      validate: {
        validator: function (v) {
          return v.length <= 5;
        },
        message: 'You can add a maximum of 5 emergency contacts',
      },
    },

    lifestyle: {
      smoking: {
        type: String,
        enum: ['Never', 'Former', 'Current', ''],
        default: '',
      },
      alcohol: {
        type: String,
        enum: ['Never', 'Occasional', 'Regular', ''],
        default: '',
      },
      exercise: {
        type: String,
        enum: [...LIFESTYLE_OPTIONS, ''],
        default: '',
      },
      diet: {
        type: String,
        enum: ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Other', ''],
        default: '',
      },
      sleepHours: { type: Number, default: null, min: 0, max: 24 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ---------------------------------------------------------------------------
// Virtuals
// ---------------------------------------------------------------------------

/**
 * BMI virtual — computed from height (cm) and weight (kg)
 */
healthProfileSchema.virtual('bmi').get(function () {
  const h = this.personalDetails?.height;
  const w = this.personalDetails?.weight;
  if (!h || !w || h <= 0) return null;
  const heightM = h / 100;
  return parseFloat((w / (heightM * heightM)).toFixed(1));
});

/**
 * Profile completion percentage
 */
healthProfileSchema.virtual('completionPercentage').get(function () {
  let filled = 0;
  const total = 8;

  const pd = this.personalDetails;
  if (pd?.dateOfBirth && pd?.gender && pd?.bloodGroup) filled++;
  if (pd?.height && pd?.weight) filled++;
  if (pd?.phone) filled++;
  if (this.allergies?.length > 0) filled++;
  if (this.currentMedicines?.length > 0) filled++;
  if (this.chronicDiseases?.length > 0 || filled >= 3) filled++; // diseases can be 0 legitimately
  if (this.emergencyContacts?.length > 0) filled++;
  if (this.lifestyle?.exercise || this.lifestyle?.diet) filled++;

  return Math.round((filled / total) * 100);
});

const HealthProfile = mongoose.model('HealthProfile', healthProfileSchema);

export default HealthProfile;
