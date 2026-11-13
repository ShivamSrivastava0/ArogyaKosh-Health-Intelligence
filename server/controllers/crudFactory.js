import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { pick, assertObjectId } from '../utils/helpers.js';
import { assertMembersOwned } from '../services/memberService.js';

/**
 * Builds list/get/create/update/remove handlers for a resource that is
 * owned by the signed-in user and (optionally) tied to a family member.
 *
 * @param {object} cfg
 * @param {import('mongoose').Model} cfg.Model
 * @param {string} cfg.name          human name for messages, e.g. 'Medicine'
 * @param {string[]} cfg.fields      fields a client may write
 * @param {boolean} [cfg.memberRequired=true]
 * @param {object} [cfg.sort]
 * @param {(req) => object} [cfg.filter]   extra list filters from the query string
 * @param {number} [cfg.maxLimit=500]
 * @param {object} [cfg.hooks]       { beforeSave(doc, req), afterSave(doc, req, isNew), beforeRemove(doc, req) }
 */
export const crud = ({ Model, name, fields, memberRequired = true, sort = { createdAt: -1 }, filter, maxLimit = 500, populate, hooks = {} }) => {
  const key = name.charAt(0).toLowerCase() + name.slice(1);

  const findOwned = async (req) => {
    assertObjectId(req.params.id, name.toLowerCase());
    const doc = await Model.findOne({ _id: req.params.id, owner: req.ownerId });
    if (!doc) throw ApiError.notFound(`${name} not found`);
    return doc;
  };

  const list = asyncHandler(async (req, res) => {
    const q = { owner: req.ownerId, ...(filter ? filter(req) : {}) };
    if (req.query.member) q.member = assertObjectId(req.query.member, 'member');
    const limit = Math.min(Number(req.query.limit) || maxLimit, maxLimit);
    let query = Model.find(q).sort(sort).limit(limit);
    if (populate) query = query.populate(populate);
    const items = await query;
    return ApiResponse.success(res, `${name} list`, { items, count: items.length });
  });

  const get = asyncHandler(async (req, res) => {
    const doc = await findOwned(req);
    if (populate) await doc.populate(populate);
    return ApiResponse.success(res, name, { [key]: doc });
  });

  const create = asyncHandler(async (req, res) => {
    const data = pick(req.body, fields);
    if (memberRequired && !data.member) throw ApiError.badRequest('Choose a family member');
    if (data.member) await assertMembersOwned(req.ownerId, [data.member]);
    const doc = new Model({ ...data, owner: req.ownerId });
    if (hooks.beforeSave) await hooks.beforeSave(doc, req, true);
    await doc.save();
    if (hooks.afterSave) await hooks.afterSave(doc, req, true);
    if (populate) await doc.populate(populate);
    return ApiResponse.created(res, `${name} added`, { [key]: doc });
  });

  const update = asyncHandler(async (req, res) => {
    const doc = await findOwned(req);
    const data = pick(req.body, fields);
    if (data.member) await assertMembersOwned(req.ownerId, [data.member]);
    doc.set(data);
    if (hooks.beforeSave) await hooks.beforeSave(doc, req, false);
    await doc.save();
    if (hooks.afterSave) await hooks.afterSave(doc, req, false);
    if (populate) await doc.populate(populate);
    return ApiResponse.success(res, `${name} updated`, { [key]: doc });
  });

  const remove = asyncHandler(async (req, res) => {
    const doc = await findOwned(req);
    if (hooks.beforeRemove) await hooks.beforeRemove(doc, req);
    await doc.deleteOne();
    return ApiResponse.success(res, `${name} deleted`, { _id: doc._id });
  });

  return { list, get, create, update, remove, findOwned };
};
