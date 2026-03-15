import CartSession from "../models/cartSessionModel.js";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

/**
 * Create or update cart session
 * Called when cart changes or checkout starts
 */
export const createOrUpdateSession = async (req, res) => {
  try {
    const { sessionId, cartItems, cartTotal, currency } = req.body;

    if (sessionId && (typeof sessionId !== "string" || sessionId.length > 128)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    if (!Array.isArray(cartItems) || cartItems.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart items",
      });
    }

    const normalizeLocalizedText = (value) => {
      if (!value) return { ar: "", en: "" };
      if (typeof value === "string") return { ar: value, en: value };
      if (typeof value === "object") {
        const ar = typeof value.ar === "string" ? value.ar : "";
        const en = typeof value.en === "string" ? value.en : "";
        if (ar || en) return { ar, en: en || ar };
      }
      return { ar: "", en: "" };
    };

    const sanitizedCartItems = cartItems
      .map((item) => {
        const productId = String(item?.productId || "").trim();
        if (!mongoose.Types.ObjectId.isValid(productId)) {
          return null;
        }

        const quantity = Number(item?.quantity || 1);
        const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
        const unitPrice = Number(item?.unitPrice || 0);
        const totalPrice = Number(item?.totalPrice || unitPrice * safeQuantity);

        const addons = Array.isArray(item?.addons)
          ? item.addons.slice(0, 50).map((addon) => ({
              addonId: String(addon?.addonId || ""),
              name: normalizeLocalizedText(addon?.name),
              price: Number(addon?.price || 0),
            }))
          : [];

        return {
          productId,
          productName: normalizeLocalizedText(item?.productName),
          productSlug: item?.productSlug ? String(item.productSlug) : "",
          productImage: item?.productImage ? String(item.productImage) : "",
          variantId: item?.variantId ? String(item.variantId) : undefined,
          variantName: normalizeLocalizedText(item?.variantName),
          variantPrice: Number(item?.variantPrice || 0),
          addons,
          quantity: safeQuantity,
          unitPrice,
          totalPrice,
        };
      })
      .filter(Boolean);

    const safeCartTotal = Number(cartTotal || 0);
    if (!Number.isFinite(safeCartTotal) || safeCartTotal < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart total",
      });
    }

    // Generate new session ID if not provided
    const sid = sessionId || uuidv4();
    const existingSession = await CartSession.findOne({ sessionId: sid }).select("status");
    const nextStatus = existingSession?.status === "converted" ? "converted" : "active";

    // Device info from request
    const deviceInfo = {
      userAgent: req.headers["user-agent"],
      ip: req.ip || req.connection?.remoteAddress,
      language: req.headers["accept-language"]?.split(",")[0],
    };

    // Use findOneAndUpdate with upsert to prevent race conditions
    const session = await CartSession.findOneAndUpdate(
      { sessionId: sid },
      {
        $set: {
          cartItems: sanitizedCartItems,
          cartTotal: safeCartTotal,
          currency: currency || "EGP",
          status: nextStatus,
          lastActivityAt: new Date(),
          deviceInfo,
          ...(req.user && { userId: req.user._id }),
        },
        $setOnInsert: {
          sessionId: sid,
          status: "active",
          createdAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    res.status(200).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        status: session.status,
      },
    });
  } catch (error) {
    console.error("Error creating/updating cart session:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save cart session",
      error: error.message,
    });
  }
};

/**
 * Update customer info during checkout
 */
export const updateCustomerInfo = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { name, email, phone } = req.body;

    if (!sessionId || typeof sessionId !== "string" || sessionId.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    const existingSession = await CartSession.findOne({ sessionId });

    if (!existingSession) {
      await CartSession.create({
        sessionId,
        status: "active",
        customerInfo: {
          name: name || "",
          email: email || "",
          phone: phone || "",
        },
        cartItems: [],
        cartTotal: 0,
        currency: "EGP",
        checkoutStartedAt: new Date(),
        lastActivityAt: new Date(),
      });
    } else {
      existingSession.customerInfo = {
        name: name || existingSession.customerInfo?.name,
        email: email || existingSession.customerInfo?.email,
        phone: phone || existingSession.customerInfo?.phone,
      };

      // Mark checkout started if not already
      if (!existingSession.checkoutStartedAt) {
        existingSession.checkoutStartedAt = new Date();
      }

      existingSession.lastActivityAt = new Date();
      await existingSession.save();
    }

    res.status(200).json({
      success: true,
      message: "Customer info updated",
    });
  } catch (error) {
    console.error("Error updating customer info:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update customer info",
      error: error.message,
    });
  }
};

/**
 * Mark session as converted (after successful payment)
 */
export const markAsConverted = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { paymentId } = req.body;

    if (!sessionId || typeof sessionId !== "string" || sessionId.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    const session = await CartSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    session.status = "converted";
    session.convertedAt = new Date();
    session.paymentId = paymentId;
    session.lastActivityAt = new Date();
    await session.save();

    res.status(200).json({
      success: true,
      message: "Session marked as converted",
    });
  } catch (error) {
    console.error("Error marking session as converted:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark session as converted",
      error: error.message,
    });
  }
};

/**
 * Get abandoned sessions (Admin)
 */
export const getAbandonedSessions = async (req, res) => {
  try {
    // Auto-mark old active sessions as abandoned (30 min inactivity)
    // This ensures admin always sees current status
    await CartSession.markAbandonedSessions(30);

    const {
      page = 1,
      limit = 20,
      status = "abandoned",
      search,
      sortBy = "abandonedAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    // Status filter
    if (status && status !== "all") {
      query.status = status;
    }

    // Search by email, phone, or name
    if (search) {
      query.$or = [
        { "customerInfo.email": { $regex: search, $options: "i" } },
        { "customerInfo.phone": { $regex: search, $options: "i" } },
        { "customerInfo.name": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    const [sessions, total] = await Promise.all([
      CartSession.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate("userId", "name email")
        .lean(),
      CartSession.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        sessions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching abandoned sessions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sessions",
      error: error.message,
    });
  }
};

/**
 * Get single session details (Admin)
 */
export const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await CartSession.findById(id)
      .populate("userId", "name email phone")
      .populate("paymentId");

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch session",
      error: error.message,
    });
  }
};

/**
 * Get cart session statistics (Admin)
 */
export const getSessionStats = async (req, res) => {
  try {
    // Auto-mark old active sessions as abandoned before calculating stats
    await CartSession.markAbandonedSessions(30);

    const stats = await CartSession.getStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching session stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message,
    });
  }
};

/**
 * Mark session as recovered (Admin)
 */
export const markAsRecovered = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const session = await CartSession.findById(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    session.status = "recovered";
    session.recoveredAt = new Date();
    session.recoveryAttempts = (session.recoveryAttempts || 0) + 1;
    session.lastRecoveryAttemptAt = new Date();

    if (notes) {
      session.adminNotes = notes;
    }

    await session.save();

    res.status(200).json({
      success: true,
      message: "Session marked as recovered",
    });
  } catch (error) {
    console.error("Error marking session as recovered:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update session",
      error: error.message,
    });
  }
};

/**
 * Add admin note to session (Admin)
 */
export const addAdminNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const session = await CartSession.findById(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    session.adminNotes = note;
    await session.save();

    res.status(200).json({
      success: true,
      message: "Note added",
    });
  } catch (error) {
    console.error("Error adding note:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add note",
      error: error.message,
    });
  }
};

/**
 * Delete session (Admin)
 */
export const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await CartSession.findByIdAndDelete(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Session deleted",
    });
  } catch (error) {
    console.error("Error deleting session:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete session",
      error: error.message,
    });
  }
};

/**
 * Run abandonment check (called by cron)
 */
export const runAbandonmentCheck = async (req, res) => {
  try {
    const inactivityMinutes = parseInt(req.query.minutes) || 30;
    const count = await CartSession.markAbandonedSessions(inactivityMinutes);

    res.status(200).json({
      success: true,
      message: `Marked ${count} sessions as abandoned`,
      markedCount: count,
    });
  } catch (error) {
    console.error("Error running abandonment check:", error);
    res.status(500).json({
      success: false,
      message: "Failed to run abandonment check",
      error: error.message,
    });
  }
};
