import Member from '../models/Member.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import { getOwnedMember } from '../services/memberService.js';
import {
  isLive, usesSimulator, configure, sendNow, handleInbound, conversation, verifySignature, processWebhook,
} from '../services/whatsappService.js';

/** Mode + every member's WhatsApp state. */
export const status = asyncHandler(async (req, res) => {
  const members = await Member.find({ owner: req.ownerId }).sort({ isSelf: -1, createdAt: 1 }).select('name color relation isSelf phone whatsapp');
  return ApiResponse.success(res, 'WhatsApp', {
    live: isLive(),
    simulator: await usesSimulator(req.ownerId),
    templates: { dose: Boolean(env.whatsapp.templateDose), optIn: Boolean(env.whatsapp.templateOptIn) },
    members,
  });
});

export const setup = asyncHandler(async (req, res) => {
  const member = await getOwnedMember(req.ownerId, req.params.memberId);
  const updated = await configure(req, member, { phone: req.body.phone, lang: req.body.lang, enabled: req.body.enabled !== false });
  return ApiResponse.success(res, req.body.enabled === false ? 'WhatsApp reminders turned off' : updated.whatsapp.status === 'ACTIVE' ? 'Reminders are on' : 'Consent request sent — reminders start when they reply YES', { member: updated });
});

export const messages = asyncHandler(async (req, res) => {
  const member = await getOwnedMember(req.ownerId, req.params.memberId);
  if (!member.whatsapp?.phone) return ApiResponse.success(res, 'Messages', { items: [] });
  return ApiResponse.success(res, 'Messages', { items: await conversation(req.ownerId, member.whatsapp.phone) });
});

export const testReminder = asyncHandler(async (req, res) => {
  const sim = await usesSimulator(req.ownerId);
  const msg = await sendNow(req.ownerId, req.params.memberId, { simulated: sim });
  return ApiResponse.success(res, sim ? 'Reminder sent to the simulator' : 'Reminder sent on WhatsApp', { message: msg });
});

/**
 * Simulator: type a reply as if from the member's phone. Disabled when live,
 * so dose logs in production only ever come from the real phone.
 */
export const simulate = asyncHandler(async (req, res) => {
  if (!(await usesSimulator(req.ownerId))) throw ApiError.forbidden('The simulator is off because WhatsApp is connected — reply from the phone instead');
  const member = await getOwnedMember(req.ownerId, req.params.memberId);
  if (!member.whatsapp?.phone || member.whatsapp.status === 'OFF') throw ApiError.badRequest('Set up WhatsApp for this person first');
  const text = String(req.body.text || '').slice(0, 500);
  if (!text.trim()) throw ApiError.badRequest('Type a message');
  const reply = await handleInbound(member.whatsapp.phone, text, { simulated: true, ownerId: req.ownerId });
  return ApiResponse.success(res, 'Delivered', { reply });
});

/* ---- Meta webhook (public) ---- */

export const verifyWebhook = (req, res) => {
  const ok = req.query['hub.mode'] === 'subscribe' && env.whatsapp.verifyToken && req.query['hub.verify_token'] === env.whatsapp.verifyToken;
  return ok ? res.status(200).send(String(req.query['hub.challenge'] || '')) : res.sendStatus(403);
};

export const receiveWebhook = async (req, res) => {
  if (!verifySignature(req.rawBody, req.get('x-hub-signature-256') || '')) return res.sendStatus(401);
  res.sendStatus(200); // acknowledge fast; Meta retries slow endpoints
  processWebhook(req.body).catch((e) => console.error('[whatsapp] webhook', e.message));
  return undefined;
};
