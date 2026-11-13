import Relative from '../models/Relative.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { crud } from './crudFactory.js';
import { familyTree, schedulePlanItem, POSITION_LABEL } from '../services/familyTreeService.js';
import { logActivity } from '../services/circleService.js';

const base = crud({
  Model: Relative,
  name: 'Relative',
  fields: ['name', 'position', 'sex', 'deceased', 'ageAtDeath', 'conditions', 'notes'],
  memberRequired: false,
  sort: { createdAt: 1 },
  hooks: {
    async afterSave(doc, req, isNew) {
      if (isNew) await logActivity(req, { type: 'RELATIVE_ADDED', link: '/app/family-tree', text: `${req.user.name} added ${doc.name} (${POSITION_LABEL[doc.position].toLowerCase()}) to the family health tree` });
    },
  },
});

export const { create: createRelative, update: updateRelative, remove: deleteRelative } = base;

export const tree = asyncHandler(async (req, res) => ApiResponse.success(res, 'Family health tree', await familyTree(req.ownerId)));

export const schedule = asyncHandler(async (req, res) => {
  const { reminder, created } = await schedulePlanItem(req.ownerId, req.params.memberId, String(req.body.key || ''));
  return ApiResponse.success(res, created ? 'Added to appointments' : 'Already on the calendar', { reminder, created });
});
