import mongoose from 'mongoose';
import { GENDERS, BLOOD_GROUPS, RELATIONS } from '../constants/index.js';

const familyMemberSchema = new mongoose.Schema(
  {
    primaryUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    relation: {
      type: String,
      enum: RELATIONS,
      required: [true, 'Relation is required'],
    },
    gender: {
      type: String,
      enum: [...GENDERS, ''],
      default: '',
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    bloodGroup: {
      type: String,
      enum: [...BLOOD_GROUPS, ''],
      default: '',
    },
    allergies: {
      type: [String],
      default: [],
    },
    chronicConditions: {
      type: [String],
      default: [],
    },
    emergencyContact: {
      type: String,
      trim: true,
      default: '',
    },
    avatar: {
      type: String,
      default: null,
    },
    accessPermission: {
      type: String,
      enum: ['FULL_ACCESS', 'VIEW_ONLY', 'EMERGENCY_ONLY'],
      default: 'FULL_ACCESS',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate family members for same user
familyMemberSchema.index({ primaryUserId: 1, name: 1, relation: 1 });

const FamilyMember = mongoose.model('FamilyMember', familyMemberSchema);

export default FamilyMember;
