import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { crud } from './crudFactory.js';

const rangeFilter = (req) => {
  const f = {};
  if (req.query.from || req.query.to) {
    f.date = {};
    if (req.query.from) f.date.$gte = new Date(req.query.from);
    if (req.query.to) f.date.$lte = new Date(req.query.to);
  }
  if (req.query.category) f.category = String(req.query.category);
  return f;
};

const base = crud({
  Model: Expense,
  name: 'Expense',
  fields: ['member', 'category', 'amount', 'date', 'vendor', 'note', 'paymentMode', 'taxDeductible', 'reimbursed'],
  memberRequired: false,
  sort: { date: -1 },
  populate: { path: 'member', select: 'name color' },
  filter: rangeFilter,
  maxLimit: 2000,
});

export const { list: listExpenses, create: createExpense, update: updateExpense, remove: deleteExpense } = base;

/** Totals by month, category and member for a date range (default: last 12 months). */
export const summary = asyncHandler(async (req, res) => {
  const to = req.query.to ? new Date(req.query.to) : new Date();
  const from = req.query.from ? new Date(req.query.from) : new Date(to.getFullYear(), to.getMonth() - 11, 1);
  const match = { owner: new mongoose.Types.ObjectId(String(req.user._id)), date: { $gte: from, $lte: to } };

  const [byMonth, byCategory, byMember, totals] = await Promise.all([
    Expense.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, total: { $sum: '$amount' } } }, { $sort: { _id: 1 } }]),
    Expense.aggregate([{ $match: match }, { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]),
    Expense.aggregate([
      { $match: match },
      { $group: { _id: '$member', total: { $sum: '$amount' } } },
      { $lookup: { from: 'members', localField: '_id', foreignField: '_id', as: 'm' } },
      { $project: { total: 1, name: { $ifNull: [{ $arrayElemAt: ['$m.name', 0] }, 'Household'] }, color: { $arrayElemAt: ['$m.color', 0] } } },
      { $sort: { total: -1 } },
    ]),
    Expense.aggregate([{ $match: match }, {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        taxDeductible: { $sum: { $cond: ['$taxDeductible', '$amount', 0] } },
        reimbursed: { $sum: { $cond: ['$reimbursed', '$amount', 0] } },
        count: { $sum: 1 },
      },
    }]),
  ]);

  return ApiResponse.success(res, 'Expense summary', {
    from, to,
    totals: totals[0] || { total: 0, taxDeductible: 0, reimbursed: 0, count: 0 },
    byMonth: byMonth.map((m) => ({ month: m._id, total: m.total })),
    byCategory: byCategory.map((c) => ({ category: c._id, total: c.total, count: c.count })),
    byMember,
  });
});
