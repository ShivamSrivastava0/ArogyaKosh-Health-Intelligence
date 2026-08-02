import HealthProfile from '../models/HealthProfile.js';
import MedicalReport from '../models/MedicalReport.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  parseMedicalReport,
  generateHealthInsights,
  chatWithHealthAssistant,
  generateDoctorBrief,
} from '../services/aiService.js';

/**
 * @desc    Parse a medical document using Gemini AI
 * @route   POST /api/intelligence/parse
 * @access  Private
 */
export const parseReport = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(ApiError.badRequest('Please upload a file to parse'));
  }

  const { reportId } = req.body;

  const parsed = await parseMedicalReport(req.file.buffer, req.file.mimetype);

  // If a reportId is provided, update that report with the parsed data
  if (reportId) {
    const report = await MedicalReport.findOne({
      _id: reportId,
      userId: req.user._id,
    });

    if (report) {
      report.parsedData = parsed;
      report.summary = parsed.summary || '';
      if (parsed.doctorName && !report.doctorName) report.doctorName = parsed.doctorName;
      if (parsed.facilityName && !report.facilityName) report.facilityName = parsed.facilityName;
      await report.save();
    }
  }

  return ApiResponse.success(res, 'Report parsed successfully', { parsed });
});

/**
 * @desc    Chat with the health assistant
 * @route   POST /api/intelligence/chat
 * @access  Private
 */
export const chat = asyncHandler(async (req, res, next) => {
  const { message, history } = req.body;

  if (!message || !message.trim()) {
    return next(ApiError.badRequest('Message is required'));
  }

  // Gather user's health context
  const [healthProfile, reports] = await Promise.all([
    HealthProfile.findOne({ userId: req.user._id }),
    MedicalReport.find({ userId: req.user._id })
      .sort({ reportDate: -1 })
      .limit(10)
      .select('title category reportDate doctorName facilityName summary parsedData tags'),
  ]);

  // Convert chat history to Gemini format
  const chatHistory = (history || []).map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const response = await chatWithHealthAssistant(
    message,
    healthProfile,
    reports,
    chatHistory
  );

  return ApiResponse.success(res, 'Response generated', {
    response,
    contextInfo: {
      hasProfile: !!healthProfile,
      reportCount: reports.length,
    },
  });
});

/**
 * @desc    Get AI-generated health insights and ArogyaScore
 * @route   GET /api/intelligence/insights
 * @access  Private
 */
export const getInsights = asyncHandler(async (req, res, next) => {
  const [healthProfile, reports] = await Promise.all([
    HealthProfile.findOne({ userId: req.user._id }),
    MedicalReport.find({ userId: req.user._id })
      .sort({ reportDate: -1 })
      .limit(10)
      .select('title category reportDate doctorName facilityName summary parsedData tags'),
  ]);

  if (!healthProfile && reports.length === 0) {
    return ApiResponse.success(res, 'Not enough data for insights', {
      insights: null,
      message: 'Please complete your health profile and upload medical reports to receive AI-powered insights.',
    });
  }

  const insights = await generateHealthInsights(healthProfile, reports);

  return ApiResponse.success(res, 'Health insights generated', { insights });
});

/**
 * @desc    Get AI-generated Pre-Doctor Brief
 * @route   GET /api/intelligence/brief
 * @access  Private
 */
export const getDoctorBrief = asyncHandler(async (req, res, next) => {
  const [healthProfile, reports] = await Promise.all([
    HealthProfile.findOne({ userId: req.user._id }),
    MedicalReport.find({ userId: req.user._id })
      .sort({ reportDate: -1 })
      .limit(10)
      .select('title category reportDate doctorName facilityName summary parsedData tags'),
  ]);

  if (!healthProfile && reports.length === 0) {
    return ApiResponse.success(res, 'Not enough data for brief', {
      brief: null,
      message: 'Please complete your health profile to generate a brief.',
    });
  }

  const brief = await generateDoctorBrief(healthProfile, reports);
  return ApiResponse.success(res, 'Pre-Doctor Brief generated', { brief });
});
