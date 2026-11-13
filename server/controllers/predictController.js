import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getOwnedMember } from '../services/memberService.js';
import { predictHousehold, predictMember, simulateCardio } from '../services/predictService.js';

export const household = asyncHandler(async (req, res) => {
  const data = await predictHousehold(req.user._id);
  return ApiResponse.success(res, 'Household predictions', data);
});

export const member = asyncHandler(async (req, res) => {
  const m = await getOwnedMember(req.user._id, req.params.id);
  const report = await predictMember(m);
  return ApiResponse.success(res, 'Predictions', report);
});

export const simulate = asyncHandler(async (req, res) => {
  const m = await getOwnedMember(req.user._id, req.params.id);
  const { sbp, tc, hdl, bmi, smoker } = req.body || {};
  const result = await simulateCardio(m, {
    sbp: sbp ?? undefined, tc: tc ?? undefined, hdl: hdl ?? undefined, bmi: bmi ?? undefined,
    smoker: typeof smoker === 'boolean' ? smoker : undefined,
  });
  return ApiResponse.success(res, 'Simulation', result);
});
