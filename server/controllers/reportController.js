import MedicalReport from '../models/MedicalReport.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * @desc    Get all medical reports for current user (with filters)
 * @route   GET /api/reports?category=&patientId=&search=&page=&limit=
 * @access  Private
 */
export const getReports = asyncHandler(async (req, res) => {
  const { category, patientId, search, page = 1, limit = 20 } = req.query;

  const filter = { userId: req.user._id };

  if (category) filter.category = category;
  if (patientId) filter.patientId = patientId;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { doctorName: { $regex: search, $options: 'i' } },
      { facilityName: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [reports, total] = await Promise.all([
    MedicalReport.find(filter)
      .sort({ reportDate: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    MedicalReport.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 'Reports retrieved', {
    reports,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * @desc    Upload a new medical report
 * @route   POST /api/reports
 * @access  Private
 */
export const uploadReport = asyncHandler(async (req, res, next) => {
  const {
    title, category, patientId, patientModel, patientName,
    reportDate, doctorName, facilityName, tags,
  } = req.body;

  if (!title) {
    return next(ApiError.badRequest('Report title is required'));
  }

  const reportData = {
    userId: req.user._id,
    patientId: patientId || req.user._id,
    patientModel: patientModel || 'User',
    patientName: patientName || 'Self',
    title,
    category: category || 'OTHER',
    reportDate: reportDate || new Date(),
    doctorName: doctorName || '',
    facilityName: facilityName || '',
    tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim())) : [],
  };

  // Handle file upload (Multer puts file in req.file)
  if (req.file) {
    reportData.fileType = req.file.mimetype;
    reportData.fileSize = req.file.size;

    // For now, store file as base64 data URL (Cloudinary integration in future)
    // In production, this would upload to Cloudinary and store the URL
    reportData.fileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  }

  const report = await MedicalReport.create(reportData);

  return ApiResponse.created(res, 'Medical report uploaded successfully', { report });
});

/**
 * @desc    Get a specific report
 * @route   GET /api/reports/:id
 * @access  Private
 */
export const getReport = asyncHandler(async (req, res, next) => {
  const report = await MedicalReport.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!report) {
    return next(ApiError.notFound('Report not found'));
  }

  return ApiResponse.success(res, 'Report retrieved', { report });
});

/**
 * @desc    Update report metadata
 * @route   PATCH /api/reports/:id
 * @access  Private
 */
export const updateReport = asyncHandler(async (req, res, next) => {
  const report = await MedicalReport.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!report) {
    return next(ApiError.notFound('Report not found'));
  }

  const allowedFields = [
    'title', 'category', 'reportDate', 'doctorName',
    'facilityName', 'tags', 'patientName',
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      if (field === 'tags' && typeof req.body[field] === 'string') {
        report[field] = req.body[field].split(',').map((t) => t.trim());
      } else {
        report[field] = req.body[field];
      }
    }
  }

  await report.save();

  return ApiResponse.success(res, 'Report updated successfully', { report });
});

/**
 * @desc    Delete a report
 * @route   DELETE /api/reports/:id
 * @access  Private
 */
export const deleteReport = asyncHandler(async (req, res, next) => {
  const report = await MedicalReport.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!report) {
    return next(ApiError.notFound('Report not found'));
  }

  // TODO: Delete from Cloudinary if filePublicId exists

  return ApiResponse.success(res, 'Report deleted successfully');
});
