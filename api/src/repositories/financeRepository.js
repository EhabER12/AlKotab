import Finance from "../models/financeModel.js";
import { BaseRepository } from "./baseRepository.js";

export class FinanceRepository extends BaseRepository {
  constructor() {
    super(Finance);
  }

  /**
   * Find all transactions with soft delete filter
   */
  async findAll(options = {}) {
    const filter = { ...options.filter, isDeleted: { $ne: true } };
    return super.findAll({ ...options, filter });
  }

  /**
   * Find transactions by type (income/expense)
   */
  async findByType(type, options = {}) {
    return this.findAll({
      ...options,
      filter: { ...options.filter, type },
    });
  }

  /**
   * Find transactions by category
   */
  async findByCategory(category, options = {}) {
    return this.findAll({
      ...options,
      filter: { ...options.filter, category },
    });
  }

  /**
   * Find transactions by date range
   */
  async findByDateRange(startDate, endDate, options = {}) {
    return this.findAll({
      ...options,
      filter: {
        ...options.filter,
        transactionDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      },
    });
  }

  /**
   * Find transactions by reference (e.g., payment ID)
   */
  async findByReference(referenceId, options = {}) {
    return this.findAll({
      ...options,
      filter: { ...options.filter, "reference.id": referenceId },
    });
  }

  /**
   * Get financial summary (balance, income, expenses)
   */
  async getFinancialSummary(filter = {}) {
    const baseMatch = { isDeleted: { $ne: true }, ...filter };

    const result = await this.model.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalIncomeUSD: {
            $sum: {
              $cond: [{ $eq: ["$type", "income"] }, "$amountInUSD", 0],
            },
          },
          totalExpenseUSD: {
            $sum: {
              $cond: [
                { $eq: ["$type", "expense"] },
                { $abs: "$amountInUSD" },
                0,
              ],
            },
          },
          totalAdjustmentUSD: {
            $sum: {
              $cond: [{ $eq: ["$type", "adjustment"] }, "$amountInUSD", 0],
            },
          },
          transactionCount: { $sum: 1 },
          incomeCount: {
            $sum: { $cond: [{ $eq: ["$type", "income"] }, 1, 0] },
          },
          expenseCount: {
            $sum: { $cond: [{ $eq: ["$type", "expense"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalIncomeUSD: { $round: ["$totalIncomeUSD", 2] },
          totalExpenseUSD: { $round: ["$totalExpenseUSD", 2] },
          totalAdjustmentUSD: { $round: ["$totalAdjustmentUSD", 2] },
          balanceUSD: {
            $round: [
              {
                $subtract: [
                  { $add: ["$totalIncomeUSD", "$totalAdjustmentUSD"] },
                  "$totalExpenseUSD",
                ],
              },
              2,
            ],
          },
          transactionCount: 1,
          incomeCount: 1,
          expenseCount: 1,
        },
      },
    ]);

    return (
      result[0] || {
        totalIncomeUSD: 0,
        totalExpenseUSD: 0,
        totalAdjustmentUSD: 0,
        balanceUSD: 0,
        transactionCount: 0,
        incomeCount: 0,
        expenseCount: 0,
      }
    );
  }

  /**
   * Get monthly breakdown
   */
  async getMonthlyBreakdown(year, filter = {}) {
    const baseMatch = {
      isDeleted: { $ne: true },
      transactionDate: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`),
      },
      ...filter,
    };

    return this.model.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: { $month: "$transactionDate" },
          income: {
            $sum: {
              $cond: [{ $eq: ["$type", "income"] }, "$amountInUSD", 0],
            },
          },
          expense: {
            $sum: {
              $cond: [
                { $eq: ["$type", "expense"] },
                { $abs: "$amountInUSD" },
                0,
              ],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          month: "$_id",
          income: { $round: ["$income", 2] },
          expense: { $round: ["$expense", 2] },
          net: { $round: [{ $subtract: ["$income", "$expense"] }, 2] },
        },
      },
    ]);
  }

  /**
   * Get category breakdown
   */
  async getCategoryBreakdown(type = null, filter = {}) {
    const baseMatch = { isDeleted: { $ne: true }, ...filter };
    if (type) {
      baseMatch.type = type;
    }

    return this.model.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: "$category",
          total: { $sum: { $abs: "$amountInUSD" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      {
        $project: {
          category: "$_id",
          total: { $round: ["$total", 2] },
          count: 1,
        },
      },
    ]);
  }

  /**
   * Soft delete a transaction
   */
  async softDelete(id, userId) {
    return this.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
    });
  }

  /**
   * Check if payment already has a finance entry
   */
  async hasPaymentEntry(paymentId) {
    const count = await this.model.countDocuments({
      "reference.id": paymentId,
      source: { $in: ["payment_auto", "payment_manual"] },
      isDeleted: { $ne: true },
    });
    return count > 0;
  }
}
