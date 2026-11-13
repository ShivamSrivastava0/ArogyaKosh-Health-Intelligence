import Vaccination from '../models/Vaccination.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { crud } from './crudFactory.js';
import { logActivity } from '../services/circleService.js';
import { generateSchedule, scheduleNextIfRecurring } from '../services/vaccineService.js';
import { getOwnedMember } from '../services/memberService.js';

const base = crud({
  Model: Vaccination,
  name: 'Vaccination',
  fields: ['member', 'name', 'dose', 'dueDate', 'givenDate', 'provider', 'batch', 'notes'],
  sort: { dueDate: 1, createdAt: 1 },
  populate: { path: 'member', select: 'name color dob' },
  hooks: {
    beforeSave(doc) { doc.$locals.givenChanged = doc.isModified('givenDate') && Boolean(doc.givenDate); },
    async afterSave(doc, req) {
      if (doc.givenDate) {
        const member = await getOwnedMember(req.ownerId, doc.member);
        await scheduleNextIfRecurring(doc, member);
        if (doc.$locals.givenChanged) await logActivity(req, { type: 'VACCINE_GIVEN', member: doc.member, link: '/app/vaccines', text: `${req.user.name} recorded ${member.name.split(' ')[0]}'s ${doc.name} (${doc.dose}) as given` });
      }
    },
  },
});

export const { list: listVaccines, create: createVaccine, update: updateVaccine, remove: deleteVaccine } = base;

export const generate = asyncHandler(async (req, res) => {
  const member = await getOwnedMember(req.ownerId, req.params.memberId);
  const created = await generateSchedule(req.ownerId, member);
  return ApiResponse.success(res, created ? `${created} vaccine(s) added to ${member.name}'s schedule` : 'Schedule is already up to date', { created });
});
