import Member from '../models/Member.js';
import Relative from '../models/Relative.js';
import Reminder from '../models/Reminder.js';
import { RULES, CONDITION_PATTERNS } from '../data/hereditary.js';
import { getOwnedMember } from './memberService.js';
import ApiError from '../utils/ApiError.js';

/**
 * Family graph by *position* relative to the account holder (SELF).
 * PARENTS says whose child each position is; blood relationships are derived
 * from it, so in-laws and spouses never count as blood relatives.
 */
export const PARENTS = {
  SELF: ['FATHER', 'MOTHER'],
  SIBLING: ['FATHER', 'MOTHER'],
  SPOUSE: ['FATHER_IN_LAW', 'MOTHER_IN_LAW'],
  CHILD: ['SELF', 'SPOUSE'],
  FATHER: ['P_GF', 'P_GM'],
  P_UNCLE_AUNT: ['P_GF', 'P_GM'],
  MOTHER: ['M_GF', 'M_GM'],
  M_UNCLE_AUNT: ['M_GF', 'M_GM'],
  FATHER_IN_LAW: [], MOTHER_IN_LAW: [], P_GF: [], P_GM: [], M_GF: [], M_GM: [],
};

export const POSITION_LABEL = {
  SELF: 'You', SPOUSE: 'Spouse', SIBLING: 'Sibling', CHILD: 'Child', FATHER: 'Father', MOTHER: 'Mother',
  P_GF: 'Paternal grandfather', P_GM: 'Paternal grandmother', M_GF: 'Maternal grandfather', M_GM: 'Maternal grandmother',
  P_UNCLE_AUNT: 'Paternal uncle/aunt', M_UNCLE_AUNT: 'Maternal uncle/aunt', FATHER_IN_LAW: 'Father-in-law', MOTHER_IN_LAW: 'Mother-in-law',
};

const FIXED_SEX = { FATHER: 'MALE', MOTHER: 'FEMALE', P_GF: 'MALE', P_GM: 'FEMALE', M_GF: 'MALE', M_GM: 'FEMALE', FATHER_IN_LAW: 'MALE', MOTHER_IN_LAW: 'FEMALE' };

/** Household member → graph position. */
export const positionOf = (m) => {
  switch (m.relation) {
    case 'SELF': return 'SELF';
    case 'SPOUSE': return 'SPOUSE';
    case 'FATHER': return 'FATHER';
    case 'MOTHER': return 'MOTHER';
    case 'SON': case 'DAUGHTER': return 'CHILD';
    case 'SIBLING': return 'SIBLING';
    case 'GRANDFATHER': return m.lineage === 'MATERNAL' ? 'M_GF' : 'P_GF';
    case 'GRANDMOTHER': return m.lineage === 'MATERNAL' ? 'M_GM' : 'P_GM';
    case 'FATHER_IN_LAW': return 'FATHER_IN_LAW';
    case 'MOTHER_IN_LAW': return 'MOTHER_IN_LAW';
    default: return null;
  }
};

const yearsBetween = (from, to) => {
  if (!from || !to) return null;
  const a = new Date(from); const b = new Date(to);
  let y = b.getFullYear() - a.getFullYear();
  if (b.getMonth() < a.getMonth() || (b.getMonth() === a.getMonth() && b.getDate() < a.getDate())) y -= 1;
  return y >= 0 ? y : null;
};

/** Build graph nodes from household members and extra relatives. */
export const buildNodes = (members, relatives) => [
  ...members.map((m) => ({
    id: String(m._id), kind: 'member', name: m.name, pos: positionOf(m), memberId: String(m._id),
    sex: m.gender || FIXED_SEX[positionOf(m)] || '', age: m.age, color: m.color,
    conditions: (m.conditions || []).filter((c) => c.status !== 'RESOLVED').map((c) => ({ name: c.name, onset: yearsBetween(m.dob, c.since) })),
  })),
  ...relatives.map((r) => ({
    id: String(r._id), kind: 'relative', name: r.name, pos: r.position,
    sex: r.sex || FIXED_SEX[r.position] || '', deceased: r.deceased, ageAtDeath: r.ageAtDeath,
    conditions: (r.conditions || []).map((c) => ({ name: c.name, onset: c.ageAtOnset ?? null })),
  })),
].filter((n) => n.pos);

const sameParents = (a, b) => {
  const pa = PARENTS[a] || []; const pb = PARENTS[b] || [];
  return pa.length > 0 && pa.length === pb.length && pa.every((p) => pb.includes(p));
};

/** First- and second-degree blood relatives of `target` among `nodes`. */
export const bloodRelatives = (target, nodes) => {
  const others = nodes.filter((n) => n.id !== target.id);
  const parentsOfPos = (pos) => PARENTS[pos] || [];
  const isParent = (n, pos) => parentsOfPos(pos).includes(n.pos);
  const isChild = (n, pos) => parentsOfPos(n.pos).includes(pos);
  const isSibling = (n, pos) => sameParents(n.pos, pos);

  const parentPositions = parentsOfPos(target.pos);
  const childPositions = Object.keys(PARENTS).filter((p) => parentsOfPos(p).includes(target.pos));
  const siblingPositions = Object.keys(PARENTS).filter((p) => sameParents(p, target.pos));
  const tag = (n, rel) => ({ ...n, rel });

  const first = [];
  const second = [];
  for (const n of others) {
    if (isParent(n, target.pos)) first.push(tag(n, n.sex === 'MALE' ? 'father' : n.sex === 'FEMALE' ? 'mother' : 'parent'));
    else if (isChild(n, target.pos)) first.push(tag(n, n.sex === 'MALE' ? 'son' : n.sex === 'FEMALE' ? 'daughter' : 'child'));
    else if (isSibling(n, target.pos)) first.push(tag(n, n.sex === 'MALE' ? 'brother' : n.sex === 'FEMALE' ? 'sister' : 'sibling'));
    else if (parentPositions.some((pp) => isParent(n, pp))) second.push(tag(n, n.sex === 'MALE' ? 'grandfather' : n.sex === 'FEMALE' ? 'grandmother' : 'grandparent'));
    else if (childPositions.some((cp) => isChild(n, cp))) second.push(tag(n, 'grandchild'));
    else if (parentPositions.some((pp) => isSibling(n, pp))) second.push(tag(n, n.sex === 'MALE' ? 'uncle' : n.sex === 'FEMALE' ? 'aunt' : 'uncle/aunt'));
    else if (siblingPositions.some((sp) => isChild(n, sp))) second.push(tag(n, 'niece/nephew'));
  }
  return { first, second };
};

const label = (n) => `${n.name.split(' ')[0]} (${n.rel})`;

/** Screening plan for one person, from the whole family's history. */
export const planFor = (target, nodes) => {
  const { first, second } = bloodRelatives(target, nodes);
  const affected = (list, key) => list.flatMap((n) => n.conditions
    .filter((c) => CONDITION_PATTERNS[key].test(c.name))
    .map((c) => ({ label: label(n), sex: n.sex, onset: c.onset, nodeId: n.id })));
  const ctx = {
    age: target.age ?? null,
    sex: target.sex,
    bmi: target.bmi ?? null,
    has: (key) => target.conditions.some((c) => CONDITION_PATTERNS[key].test(c.name)),
    first: (key) => affected(first, key),
    second: (key) => affected(second, key),
  };
  const items = [];
  for (const rule of RULES) {
    const out = rule.evaluate(ctx);
    if (!out) continue;
    const age = target.age;
    const status = age === null || age === undefined ? 'UNKNOWN_AGE' : age >= out.startAge ? 'START_NOW' : 'FUTURE';
    items.push({ key: rule.key, condition: rule.condition, ...out, status, startsInYears: status === 'FUTURE' ? out.startAge - age : 0 });
  }
  const rank = { START_NOW: 0, UNKNOWN_AGE: 1, FUTURE: 2 };
  return {
    items: items.sort((a, b) => rank[a.status] - rank[b.status] || a.startAge - b.startAge),
    relativesConsidered: { first: first.length, second: second.length },
  };
};

/** Whole tree + plans for every household member. */
export const familyTree = async (ownerId) => {
  const [members, relatives] = await Promise.all([
    Member.find({ owner: ownerId }).sort({ isSelf: -1, createdAt: 1 }),
    Relative.find({ owner: ownerId }).sort({ createdAt: 1 }),
  ]);
  const nodes = buildNodes(members, relatives);
  const memberNodes = nodes.filter((n) => n.kind === 'member');
  const bmiById = new Map(members.map((m) => [String(m._id), m.bmi]));
  return {
    nodes,
    unplaced: members.filter((m) => !positionOf(m)).map((m) => ({ _id: m._id, name: m.name, relation: m.relation })),
    plans: memberNodes.map((n) => ({
      member: { _id: n.memberId, name: n.name, color: n.color, age: n.age, pos: n.pos },
      ...planFor({ ...n, bmi: bmiById.get(n.memberId) ?? null }, nodes),
    })),
  };
};

/** Turn a plan item into a real reminder. */
export const schedulePlanItem = async (ownerId, memberId, key) => {
  const member = await getOwnedMember(ownerId, memberId);
  const tree = await familyTree(ownerId);
  const plan = tree.plans.find((p) => String(p.member._id) === String(member._id));
  const item = plan?.items.find((i) => i.key === key);
  if (!item) throw ApiError.notFound('That screening item no longer applies');
  let dueAt;
  if (item.status === 'FUTURE' && member.dob) {
    dueAt = new Date(member.dob);
    dueAt.setFullYear(dueAt.getFullYear() + item.startAge);
  } else {
    dueAt = new Date(Date.now() + 14 * 86400000);
  }
  dueAt.setHours(9, 0, 0, 0);
  const repeat = { 12: 'YEARLY', 6: 'HALF_YEARLY', 3: 'QUARTERLY', 1: 'MONTHLY' }[item.everyMonths] || 'NONE';
  const exists = await Reminder.findOne({ owner: ownerId, member: member._id, title: item.test, status: 'UPCOMING' });
  if (exists) return { reminder: exists, created: false };
  const reminder = await Reminder.create({
    owner: ownerId, member: member._id, type: 'LAB_TEST', title: item.test, dueAt, repeat,
    notes: `Family Health Tree: ${item.why} Recommended ${item.frequency}. Source: ${item.source}.`,
  });
  return { reminder, created: true };
};
