import Reminder from '../models/Reminder.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { crud } from './crudFactory.js';
import { logActivity } from '../services/circleService.js';

const STEP = { MONTHLY: 1, QUARTERLY: 3, HALF_YEARLY: 6, YEARLY: 12 };

const base = crud({
  Model: Reminder,
  name: 'Reminder',
  fields: ['member', 'type', 'title', 'dueAt', 'doctor', 'location', 'notes', 'repeat', 'status'],
  sort: { dueAt: 1 },
  populate: { path: 'member', select: 'name color' },
  filter: (req) => {
    const f = {};
    if (req.query.status) f.status = String(req.query.status);
    if (req.query.type) f.type = String(req.query.type);
    return f;
  },
});

export const { list: listReminders, get: getReminder, create: createReminder, update: updateReminder, remove: deleteReminder } = base;

/** Mark done; repeating reminders roll forward automatically. */
export const completeReminder = asyncHandler(async (req, res) => {
  const reminder = await base.findOwned(req);
  reminder.status = 'DONE';
  reminder.completedAt = new Date();
  if (req.body?.notes) reminder.notes = [reminder.notes, req.body.notes].filter(Boolean).join('\n');
  await reminder.save();

  let next = null;
  if (STEP[reminder.repeat]) {
    const due = new Date(reminder.dueAt);
    due.setMonth(due.getMonth() + STEP[reminder.repeat]);
    while (due < new Date()) due.setMonth(due.getMonth() + STEP[reminder.repeat]);
    next = await Reminder.create({
      owner: reminder.owner, member: reminder.member, type: reminder.type, title: reminder.title,
      dueAt: due, doctor: reminder.doctor, location: reminder.location, repeat: reminder.repeat,
    });
  }
  await reminder.populate('member', 'name');
  await logActivity(req, { type: 'REMINDER_DONE', member: reminder.member._id, link: '/app/appointments', text: `${req.user.name} marked ${reminder.member.name.split(' ')[0]}'s "${reminder.title}" as done` });
  return ApiResponse.success(res, next ? 'Done — next one scheduled' : 'Marked as done', { reminder, next });
});
