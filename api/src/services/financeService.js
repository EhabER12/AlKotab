import { FinanceRepository } from "../repositories/financeRepository.js";
import Finance from "../models/financeModel.js";
import { ApiError } from "../utils/apiError.js";
import Settings from "../models/settingsModel.js";
import axios from "axios";

export class FinanceService {
  constructor() {
    this.financeRepository = new FinanceRepository();
  }

  getFinanceReferencePopulate() {
    return [
      { path: "createdBy", select: "name email" },
      {
        path: "reference.id",
        select:
          "merchantOrderId amount currency paymentMethod manualPaymentMethodId paymentProofUrl billingInfo paymentDetails productId courseId serviceId packageId studentMemberId cartSessionId couponCode couponDetails status createdAt processedAt",
        populate: [
          { path: "productId", select: "_id name slug coverImage basePrice" },
          {
            path: "courseId",
            select: "_id title slug thumbnail price currency",
          },
          { path: "serviceId", select: "_id title slug startingPrice" },
          { path: "packageId", select: "_id name price currency" },
          {
            path: "studentMemberId",
            select: "_id name studentName phone status",
          },
          {
            path: "cartSessionId",
            select: "_id cartItems cartTotal currency sessionId",
            populate: {
              path: "cartItems.productId",
              select: "_id name slug coverImage basePrice",
            },
          },
        ],
      },
    ];
  }

  isManualPayment(payment) {
    if (!payment) return false;

    const methodType = payment.paymentDetails?.methodType;
    return Boolean(
      payment.manualPaymentMethodId ||
        payment.paymentProofUrl ||
        methodType === "manual_user_payment" ||
        methodType === "admin_manual_payment"
    );
  }

  getPaymentSource(payment) {
    return this.isManualPayment(payment) ? "payment_manual" : "payment_auto";
  }

  /**
   * Create a new transaction
   */
  async createTransaction(data, userId) {
    // Validate amount sign based on type
    let amount = Math.abs(data.amount);
    if (data.type === "expense") {
      amount = -amount;
    } else if (data.type === "adjustment") {
      // Adjustment can be positive or negative
      amount = data.amount;
    }

    // Get exchange rate
    const exchangeRate = Finance.getExchangeRate(data.currency || "EGP");
    const amountInUSD = Finance.convertToUSD(amount, data.currency || "EGP");

    const transactionData = {
      type: data.type,
      amount,
      currency: data.currency || "EGP",
      amountInUSD,
      exchangeRate,
      category: data.category || "other",
      description: data.description,
      transactionDate: data.transactionDate || new Date(),
      source: data.source || "manual",
      createdBy: userId,
      tags: data.tags || [],
      attachmentUrl: data.attachmentUrl,
      metadata: data.metadata,
    };

    // Add reference if provided
    if (data.referenceId && data.referenceModel) {
      transactionData.reference = {
        id: data.referenceId,
        model: data.referenceModel,
        displayId: data.referenceDisplayId,
      };
    }

    return this.financeRepository.create(transactionData);
  }

  /**
   * Create transaction from successful payment
   */
  async createFromPayment(payment) {
    // Check if entry already exists
    const exists = await this.financeRepository.hasPaymentEntry(payment._id);
    if (exists) {
      console.log(`Finance entry already exists for payment ${payment._id}`);
      return null;
    }

    const paymentItems = Array.isArray(payment.paymentDetails?.items)
      ? payment.paymentDetails.items
      : [];
    const hasSubscription = Boolean(payment.packageId || payment.studentMemberId);
    const hasService = Boolean(payment.serviceId);
    const hasCourseItem = paymentItems.some((item) => item?.itemType === "course");
    const purchaseType = hasSubscription
      ? "subscription"
      : hasService
        ? "service"
        : hasCourseItem || payment.courseId
          ? "course"
          : "product";
    const category = hasSubscription
      ? "subscription"
      : hasService
        ? "service_payment"
        : "product_sale";
    const description = `Payment: ${
      payment.billingInfo?.name || "Customer"
    } - ${payment.merchantOrderId || payment._id}`;

    const transactionData = {
      type: "income",
      amount: payment.amount,
      currency: payment.currency || "EGP",
      category,
      description,
      transactionDate: payment.processedAt || payment.createdAt || new Date(),
      source: this.getPaymentSource(payment),
      reference: {
        id: payment._id,
        model: "Payment",
        displayId: payment.merchantOrderId,
      },
      metadata: {
        customerName: payment.billingInfo?.name,
        customerEmail: payment.billingInfo?.email,
        paymentMethod: payment.paymentMethod,
        purchaseType,
        couponCode: payment.couponCode,
        originalAmount: payment.originalAmount,
        discountAmount: payment.discountAmount,
        itemsCount: paymentItems.length,
        itemsSummary: paymentItems.map((item) => ({
          itemType: item?.itemType,
          itemId: item?.itemId,
          name: item?.name,
          quantity: item?.quantity,
          unitPrice: item?.unitPrice || item?.price,
          totalPrice: item?.totalPrice,
          variantName: item?.variantName,
        })),
      },
    };

    // Calculate USD amount
    const exchangeRate = Finance.getExchangeRate(transactionData.currency);
    transactionData.amountInUSD = Finance.convertToUSD(
      transactionData.amount,
      transactionData.currency
    );
    transactionData.exchangeRate = exchangeRate;

    return this.financeRepository.create(transactionData);
  }

  /**
   * Create transaction from refund
   */
  async createFromRefund(payment, adminId) {
    const description = `Refund: ${payment.billingInfo?.name || "Customer"} - ${
      payment.merchantOrderId || payment._id
    }`;

    return this.createTransaction(
      {
        type: "expense",
        amount: payment.amount,
        currency: payment.currency || "EGP",
        category: "refund",
        description,
        transactionDate: new Date(),
        source: "refund_auto",
        referenceId: payment._id,
        referenceModel: "Payment",
        referenceDisplayId: payment.merchantOrderId,
        metadata: {
          customerName: payment.billingInfo?.name,
          customerEmail: payment.billingInfo?.email,
          originalPaymentDate: payment.createdAt,
        },
      },
      adminId
    );
  }

  /**
   * Get all transactions with filters
   */
  async getAllTransactions(queryParams) {
    const {
      page = 1,
      limit = 20,
      type,
      category,
      source,
      startDate,
      endDate,
      search,
      sortBy = "transactionDate",
      sortOrder = "desc",
    } = queryParams;

    const filter = {};

    if (type) {
      filter.type = type;
    }

    if (category) {
      filter.category = category;
    }

    if (source) {
      filter.source = source;
    }

    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) {
        filter.transactionDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.transactionDate.$lte = new Date(endDate);
      }
    }

    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: "i" } },
        { "reference.displayId": { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    return this.financeRepository.findAll({
      filter,
      page,
      limit,
      sort,
      populate: this.getFinanceReferencePopulate(),
    });
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id) {
    const transaction = await this.financeRepository.findById(id, {
      populate: [
        ...this.getFinanceReferencePopulate(),
        { path: "deletedBy", select: "name email" },
      ],
    });

    if (!transaction || transaction.isDeleted) {
      throw new ApiError(404, "Transaction not found");
    }

    return transaction;
  }

  /**
   * Update a transaction
   */
  async updateTransaction(id, data, userId) {
    const transaction = await this.getTransactionById(id);

    // Prevent editing auto-generated entries
    if (transaction.source !== "manual") {
      throw new ApiError(
        400,
        "Cannot edit auto-generated transactions. Create an adjustment instead."
      );
    }

    const updateData = {};

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.category !== undefined) {
      updateData.category = data.category;
    }

    if (data.transactionDate !== undefined) {
      updateData.transactionDate = new Date(data.transactionDate);
    }

    if (data.tags !== undefined) {
      updateData.tags = data.tags;
    }

    if (data.attachmentUrl !== undefined) {
      updateData.attachmentUrl = data.attachmentUrl;
    }

    if (data.isReconciled !== undefined) {
      updateData.isReconciled = data.isReconciled;
    }

    // If amount or currency changes, recalculate
    if (data.amount !== undefined || data.currency !== undefined) {
      const currency = data.currency || transaction.currency;
      let amount = data.amount !== undefined ? data.amount : transaction.amount;

      // Ensure correct sign
      if (transaction.type === "expense") {
        amount = -Math.abs(amount);
      } else if (transaction.type === "income") {
        amount = Math.abs(amount);
      }

      updateData.amount = amount;
      updateData.currency = currency;
      updateData.exchangeRate = Finance.getExchangeRate(currency);
      updateData.amountInUSD = Finance.convertToUSD(amount, currency);
    }

    return this.financeRepository.update(id, updateData);
  }

  /**
   * Delete a transaction (soft delete)
   */
  async deleteTransaction(id, userId) {
    const transaction = await this.getTransactionById(id);

    // For auto-generated, suggest creating reverse entry instead
    if (transaction.source !== "manual") {
      throw new ApiError(
        400,
        "Cannot delete payment entries. Create a refund or adjustment instead."
      );
    }

    return this.financeRepository.softDelete(id, userId);
  }

  /**
   * Get financial summary
   */
  async getFinancialSummary(queryParams = {}) {
    const { startDate, endDate, category } = queryParams;

    const filter = {};

    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) {
        filter.transactionDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.transactionDate.$lte = new Date(endDate);
      }
    }

    if (category) {
      filter.category = category;
    }

    const summary = await this.financeRepository.getFinancialSummary(filter);

    // Get recent transactions
    const recentTransactions = await this.financeRepository.findAll({
      filter,
      limit: 5,
      sort: { transactionDate: -1 },
    });

    return {
      ...summary,
      recentTransactions: recentTransactions.results,
    };
  }

  /**
   * Get monthly breakdown for charts
   */
  async getMonthlyBreakdown(year) {
    const currentYear = year || new Date().getFullYear();
    return this.financeRepository.getMonthlyBreakdown(currentYear);
  }

  /**
   * Get category breakdown
   */
  async getCategoryBreakdown(type = null) {
    return this.financeRepository.getCategoryBreakdown(type);
  }

  /**
   * Export transactions to CSV format
   */
  async exportTransactions(queryParams) {
    const { startDate, endDate, type, category } = queryParams;

    const filter = {};

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) filter.transactionDate.$gte = new Date(startDate);
      if (endDate) filter.transactionDate.$lte = new Date(endDate);
    }

    const transactions = await this.financeRepository.findAll({
      filter,
      limit: 10000,
      sort: { transactionDate: -1 },
    });

    // Convert to CSV format
    const headers = [
      "Date",
      "Type",
      "Category",
      "Description",
      "Amount",
      "Currency",
      "Amount (USD)",
      "Source",
      "Reference",
    ];

    const rows = transactions.results.map((t) => [
      new Date(t.transactionDate).toISOString().split("T")[0],
      t.type,
      t.category,
      `"${(t.description || "").replace(/"/g, '""')}"`,
      t.amount,
      t.currency,
      t.amountInUSD,
      t.source,
      t.reference?.displayId || "",
    ]);

    return {
      headers,
      rows,
      csv: headers.join(",") + "\n" + rows.map((r) => r.join(",")).join("\n"),
    };
  }

  /**
   * Adjust balance manually
   */
  async adjustBalance(data, userId) {
    return this.createTransaction(
      {
        type: "adjustment",
        amount: data.amount, // Can be positive or negative
        currency: data.currency || "USD",
        category: "adjustment",
        description: data.description || "Manual balance adjustment",
        source: "manual",
      },
      userId
    );
  }

  /**
   * Get finance settings from Settings model
   */
  async getFinanceSettings() {
    const settings = await Settings.findOneOrCreate();

    // Check if rates need update (older than 24 hours)
    const lastUpdate = settings.financeSettings?.lastRatesUpdate;
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    if (!lastUpdate || now - new Date(lastUpdate) > oneDay) {
      try {
        const rates = await this.fetchExchangeRates();
        if (rates) {
          if (!settings.financeSettings) settings.financeSettings = {};
          settings.financeSettings.exchangeRates = rates;
          settings.financeSettings.lastRatesUpdate = now;
          await settings.save();
        }
      } catch (error) {
        console.error("Failed to update exchange rates:", error.message);
      }
    }

    return {
      baseCurrency: settings.financeSettings?.baseCurrency || "EGP",
      exchangeRates: settings.financeSettings?.exchangeRates || {
        USD: 1,
        SAR: 3.75,
        EGP: 50.0,
      },
      lastRatesUpdate: settings.financeSettings?.lastRatesUpdate || new Date(),
    };
  }

  /**
   * Fetch live exchange rates from API
   */
  async fetchExchangeRates() {
    try {
      const apiKey = "d27e6714877128d10fcec33c";
      const response = await axios.get(
        `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`
      );

      if (response.data && response.data.result === "success") {
        // Return only the currencies we care about, plus USD base
        const allRates = response.data.conversion_rates;
        return {
          USD: 1,
          SAR: allRates.SAR,
          EGP: allRates.EGP,
          EUR: allRates.EUR,
          AED: allRates.AED,
          // Add others as needed
        };
      }
      return null;
    } catch (error) {
      console.error("ExchangeRate-API Error:", error.message);
      throw error;
    }
  }

  /**
   * Update finance settings
   */
  async updateFinanceSettings(data, userId) {
    const Settings = (await import("../models/settingsModel.js")).default;
    const settings = await Settings.findOneOrCreate();

    if (!settings.financeSettings) {
      settings.financeSettings = {};
    }

    if (data.baseCurrency) {
      settings.financeSettings.baseCurrency = data.baseCurrency;
    }

    if (data.exchangeRates) {
      settings.financeSettings.exchangeRates = {
        ...settings.financeSettings.exchangeRates,
        ...data.exchangeRates,
      };
      settings.financeSettings.lastRatesUpdate = new Date();
    }

    settings.updatedBy = userId;
    await settings.save();

    return {
      baseCurrency: settings.financeSettings.baseCurrency,
      exchangeRates: settings.financeSettings.exchangeRates,
      lastRatesUpdate: settings.financeSettings.lastRatesUpdate,
    };
  }
}
