import HealthProfile from '../models/HealthProfile.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * @desc    Get current user's health profile
 * @route   GET /api/profile
 * @access  Private
 */
export const getProfile = asyncHandler(async (req, res, next) => {
  const profile = await HealthProfile.findOne({ userId: req.user._id });

  if (!profile) {
    return ApiResponse.success(res, 'No profile found. Please create one.', {
      profile: null,
      exists: false,
    });
  }

  return ApiResponse.success(res, 'Profile retrieved successfully', {
    profile,
    exists: true,
  });
});

/**
 * @desc    Create health profile
 * @route   POST /api/profile
 * @access  Private
 */
export const createProfile = asyncHandler(async (req, res, next) => {
  // Check if profile already exists
  const existing = await HealthProfile.findOne({ userId: req.user._id });
  if (existing) {
    return next(ApiError.conflict('Profile already exists. Use PATCH to update.'));
  }

  const profileData = {
    userId: req.user._id,
    personalDetails: req.body.personalDetails || {},
    allergies: req.body.allergies || [],
    currentMedicines: req.body.currentMedicines || [],
    chronicDiseases: req.body.chronicDiseases || [],
    insurancePolicies: req.body.insurancePolicies || [],
    emergencyContacts: req.body.emergencyContacts || [],
    lifestyle: req.body.lifestyle || {},
  };

  const profile = await HealthProfile.create(profileData);

  return ApiResponse.created(res, 'Health profile created successfully', {
    profile,
  });
});

/**
 * @desc    Partial update health profile
 * @route   PATCH /api/profile
 * @access  Private
 *
 * Accepts any combination of top-level keys:
 *   personalDetails, allergies, currentMedicines, chronicDiseases,
 *   insurancePolicies, emergencyContacts, lifestyle
 *
 * For object fields (personalDetails, lifestyle): merges with existing values.
 * For array fields: replaces the entire array with the incoming value.
 */
export const updateProfile = asyncHandler(async (req, res, next) => {
  const profile = await HealthProfile.findOne({ userId: req.user._id });

  if (!profile) {
    return next(ApiError.notFound('Profile not found. Please create one first.'));
  }

  const allowedFields = [
    'personalDetails',
    'allergies',
    'currentMedicines',
    'chronicDiseases',
    'insurancePolicies',
    'emergencyContacts',
    'lifestyle',
  ];

  const objectFields = ['personalDetails', 'lifestyle'];
  const arrayFields = ['allergies', 'currentMedicines', 'chronicDiseases', 'insurancePolicies', 'emergencyContacts'];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      if (objectFields.includes(field)) {
        // Merge object fields so partial updates don't wipe other sub-fields
        profile[field] = {
          ...profile[field].toObject?.() || profile[field],
          ...req.body[field],
        };
      } else if (arrayFields.includes(field)) {
        // Replace entire array
        profile[field] = req.body[field];
      }
    }
  }

  await profile.save();

  return ApiResponse.success(res, 'Profile updated successfully', {
    profile,
  });
});
