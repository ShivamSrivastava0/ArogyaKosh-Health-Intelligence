import FamilyMember from '../models/FamilyMember.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * @desc    Get all family members for current user
 * @route   GET /api/family
 * @access  Private
 */
export const getFamilyMembers = asyncHandler(async (req, res) => {
  const members = await FamilyMember.find({ primaryUserId: req.user._id }).sort({ createdAt: -1 });

  return ApiResponse.success(res, 'Family members retrieved', {
    members,
    count: members.length,
  });
});

/**
 * @desc    Add a new family member
 * @route   POST /api/family
 * @access  Private
 */
export const addFamilyMember = asyncHandler(async (req, res, next) => {
  const { name, relation, gender, dateOfBirth, bloodGroup, allergies, chronicConditions, emergencyContact, accessPermission } = req.body;

  if (!name || !relation) {
    return next(ApiError.badRequest('Name and relation are required'));
  }

  const member = await FamilyMember.create({
    primaryUserId: req.user._id,
    name,
    relation,
    gender: gender || '',
    dateOfBirth: dateOfBirth || null,
    bloodGroup: bloodGroup || '',
    allergies: allergies || [],
    chronicConditions: chronicConditions || [],
    emergencyContact: emergencyContact || '',
    accessPermission: accessPermission || 'FULL_ACCESS',
  });

  return ApiResponse.created(res, 'Family member added successfully', { member });
});

/**
 * @desc    Get a specific family member
 * @route   GET /api/family/:id
 * @access  Private
 */
export const getFamilyMember = asyncHandler(async (req, res, next) => {
  const member = await FamilyMember.findOne({
    _id: req.params.id,
    primaryUserId: req.user._id,
  });

  if (!member) {
    return next(ApiError.notFound('Family member not found'));
  }

  return ApiResponse.success(res, 'Family member retrieved', { member });
});

/**
 * @desc    Update a family member
 * @route   PATCH /api/family/:id
 * @access  Private
 */
export const updateFamilyMember = asyncHandler(async (req, res, next) => {
  const member = await FamilyMember.findOne({
    _id: req.params.id,
    primaryUserId: req.user._id,
  });

  if (!member) {
    return next(ApiError.notFound('Family member not found'));
  }

  const allowedFields = [
    'name', 'relation', 'gender', 'dateOfBirth', 'bloodGroup',
    'allergies', 'chronicConditions', 'emergencyContact', 'accessPermission',
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      member[field] = req.body[field];
    }
  }

  await member.save();

  return ApiResponse.success(res, 'Family member updated successfully', { member });
});

/**
 * @desc    Delete a family member
 * @route   DELETE /api/family/:id
 * @access  Private
 */
export const deleteFamilyMember = asyncHandler(async (req, res, next) => {
  const member = await FamilyMember.findOneAndDelete({
    _id: req.params.id,
    primaryUserId: req.user._id,
  });

  if (!member) {
    return next(ApiError.notFound('Family member not found'));
  }

  return ApiResponse.success(res, 'Family member removed successfully');
});
