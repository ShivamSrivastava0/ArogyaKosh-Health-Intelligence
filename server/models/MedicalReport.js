import mongoose from 'mongoose';
import { REPORT_CATEGORIES } from '../constants/index.js';

const medicalReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Who this report belongs to — either the primary user or a family member
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'patientModel',
    },
    patientModel: {
      type: String,
      required: true,
      enum: ['User', 'FamilyMember'],
      default: 'User',
    },
    patientName: {
      type: String,
      trim: true,
      default: 'Self',
    },
    title: {
      type: String,
      required: [true, 'Report title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    category: {
      type: String,
      enum: Object.values(REPORT_CATEGORIES),
      default: REPORT_CATEGORIES.OTHER,
    },
    // File metadata
    fileUrl: {
      type: String,
      default: null,
    },
    filePublicId: {
      type: String,
      default: null, // Cloudinary public_id for deletion
    },
    fileType: {
      type: String,
      enum: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', ''],
      default: '',
    },
    fileSize: {
      type: Number,
      default: 0, // in bytes
    },
    // Report details
    reportDate: {
      type: Date,
      default: Date.now,
    },
    doctorName: {
      type: String,
      trim: true,
      default: '',
    },
    facilityName: {
      type: String,
      trim: true,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    // AI-generated summary (scaffold for Phase 5)
    summary: {
      type: String,
      default: '',
    },
    // Parsed data from AI (scaffold for Phase 5)
    parsedData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
medicalReportSchema.index({ userId: 1, reportDate: -1 });
medicalReportSchema.index({ userId: 1, category: 1 });
medicalReportSchema.index({ userId: 1, patientId: 1 });
medicalReportSchema.index({ tags: 1 });

const MedicalReport = mongoose.model('MedicalReport', medicalReportSchema);

export default MedicalReport;
