import { PaymentService } from "../services/paymentService.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";

const paymentService = new PaymentService();

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private/Admin
export const getAllPayments = async (req, res, next) => {
  try {
    const { page, limit, status, userId, productId, serviceId, packageId, studentMemberId } = req.query;
    const payments = await paymentService.getAllPayments({
      page,
      limit,
      status,
      userId,
      productId,
      serviceId,
      packageId,
      studentMemberId,
    });

    return ApiResponse.success(res, payments);
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment history for the current user
// @route   GET /api/payments/history
// @access  Private
export const getUserPaymentHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const payments = await paymentService.getAllPayments({
      userId,
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      productId: req.query.productId,
      serviceId: req.query.serviceId,
    });

    return ApiResponse.success(res, payments);
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment status (public - for redirect pages)
// @route   GET /api/payments/status/:id
// @access  Public (returns limited data)
export const getPaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await paymentService.getPaymentById(id);

    // Return only status-related fields (no sensitive data)
    return ApiResponse.success(res, {
      id: payment.id || payment._id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      merchantOrderId: payment.merchantOrderId,
      createdAt: payment.createdAt,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private/Admin
export const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await paymentService.getPaymentById(id);

    return ApiResponse.success(res, payment);
  } catch (error) {
    next(error);
  }
};

// @desc    Create manual payment
// @route   POST /api/payments/manual
// @access  Private
export const createManualPayment = async (req, res, next) => {
  try {
    const {
      productId,
      courseId,
      serviceId,
      packageId,
      studentMemberId,
      amount,
      currency,
      pricingTierId,
      manualPaymentMethodId,
      billingInfo,
      notes,
      couponCode,
    } = req.body;
    const userId = req.user._id;
    const isAdmin = req.user.role === "admin";
    const paymentProofUrl = req.file ? `uploads/${req.file.filename}` : null;

    if (!productId && !courseId && !serviceId && !packageId) {
      return next(new ApiError(400, "Product ID, Course ID, Service ID, or Package ID is required"));
    }

    if (!billingInfo || !billingInfo.name) {
      return next(new ApiError(400, "Customer name is required"));
    }

    if (isAdmin) {
      if (!amount || amount <= 0) {
        return next(new ApiError(400, "Valid amount is required"));
      }

      const payment = await paymentService.createAdminManualPayment({
        adminId: userId,
        productId,
        courseId,
        serviceId,
        amount,
        currency: currency || "EGP",
        billingInfo,
        notes,
      });

      return ApiResponse.success(
        res,
        payment,
        "Manual payment created successfully.",
        201
      );
    } else {
      if (!pricingTierId || !manualPaymentMethodId) {
        return next(
          new ApiError(400, "Pricing tier and payment method are required")
        );
      }

      const payment = await paymentService.createManualPayment({
        userId,
        productId,
        courseId,
        serviceId,
        packageId,
        studentMemberId,
        pricingTierId,
        manualPaymentMethodId,
        paymentProofUrl,
        billingInfo,
        couponCode,
      });

      return ApiResponse.success(
        res,
        payment,
        "Manual payment created successfully. Awaiting admin approval.",
        201
      );
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create Customer Manual Payment
// @route   POST /api/payments/customer-manual
// @access  Public
export const createCustomerManualPayment = async (req, res, next) => {
  try {
    const {
      productId,
      courseId,
      serviceId,
      packageId,
      studentMemberId,
      pricingTierId,
      manualPaymentMethodId,
      billingInfo,
      cartSessionId,
      currency,
      couponCode,
    } = req.body;

    const userId = req.user?._id || null;
    const paymentProofUrl = req.file ? `uploads/${req.file.filename}` : null;

    const hasCheckoutItems =
      Array.isArray(billingInfo?.items)
        ? billingInfo.items.length > 0
        : typeof billingInfo?.items === "string" && billingInfo.items.trim().length > 2;

    if (!productId && !courseId && !serviceId && !packageId && !hasCheckoutItems) {
      return next(new ApiError(400, "At least one purchasable item is required"));
    }

    if (!pricingTierId) {
      return next(new ApiError(400, "Pricing tier ID is required"));
    }

    if (!manualPaymentMethodId) {
      return next(new ApiError(400, "Manual payment method ID is required"));
    }

    if (!billingInfo || !billingInfo.name || !billingInfo.email || !billingInfo.phone) {
      return next(new ApiError(400, "Customer name, email and phone are required"));
    }

    const payment = await paymentService.createManualPayment({
      userId,
      productId,
      courseId,
      serviceId,
      packageId,
      studentMemberId,
      pricingTierId,
      manualPaymentMethodId,
      paymentProofUrl,
      billingInfo,
      cartSessionId,
      currency,
      couponCode,
    });

    res.status(201).json({
      success: true,
      message: "Payment submitted successfully. Awaiting verification.",
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment status
// @route   PUT /api/payments/:id/status
// @access  Private/Admin
export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, failureReason, note } = req.body;
    const adminId = req.user._id;

    const payment = await paymentService.updatePaymentStatus(
      id,
      status,
      failureReason,
      adminId,
      note
    );

    return ApiResponse.success(
      res,
      payment,
      "Payment status updated successfully"
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Update admin notes
// @route   PUT /api/payments/:id/notes
// @access  Private/Admin
export const updateAdminNotes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    const adminId = req.user._id;

    const payment = await paymentService.updateAdminNotes(
      id,
      adminNotes,
      adminId
    );

    return ApiResponse.success(
      res,
      payment,
      "Admin notes updated successfully"
    );
  } catch (error) {
    next(error);
  }
};

export const getRevenueStatistics = async (req, res, next) => {
  try {
    const statistics = await paymentService.getRevenueStatistics();
    return ApiResponse.success(res, statistics);
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a pending payment
// @route   POST /api/payments/:id/cancel
// @access  Private
export const cancelPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const payment = await paymentService.cancelPayment(id, userId);

    return ApiResponse.success(res, payment, "Payment cancelled successfully");
  } catch (error) {
    next(error);
  }
};

// ==================== PayPal ====================

// @desc    Create PayPal payment
// @route   POST /api/payments/paypal/create
// @access  Private
export const createPaypalPayment = async (req, res, next) => {
  try {
    const { courseId, productId, items, amount, currency = "USD", locale, billingInfo, couponCode } = req.body;
    const userId = req.user?._id; // Optional - may be undefined for guest checkout

    const hasCheckoutItems = Array.isArray(items) && items.length > 0;

    if (!courseId && !productId && !hasCheckoutItems) {
      return next(new ApiError(400, "Course ID, Product ID, or checkout items are required"));
    }

    // Amount is optional for course checkout (server calculates it from DB).
    if (!courseId && !hasCheckoutItems && (!amount || Number(amount) <= 0)) {
      return next(new ApiError(400, "Valid amount is required"));
    }

    const payment = await paymentService.createPaypalPayment({
      userId,
      courseId,
      productId,
      items,
      amount,
      currency,
      locale,
      billingInfo,
      couponCode,
    });

    return ApiResponse.success(
      res,
      payment,
      "PayPal payment created successfully",
      201
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Capture PayPal order
// @route   POST /api/payments/paypal/capture/:orderId
// @access  Private
export const capturePaypalOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?._id; // Optional

    const payment = await paymentService.capturePaypalOrder({
      orderId,
      userId,
    });

    return ApiResponse.success(
      res,
      payment,
      "PayPal payment captured successfully"
    );
  } catch (error) {
    next(error);
  }
};



// @desc    PayPal Webhook
// @route   POST /api/payments/paypal/webhook
// @access  Public
export const paypalWebhook = async (req, res, next) => {
  try {
    // PayPal expects 200 OK immediately
    // Pass headers for signature verification
    await paymentService.handlePaypalWebhook(req.body, req.headers);

    res.status(200).json({
      success: true,
      message: "Webhook processed",
    });
  } catch (error) {
    console.error("PayPal webhook error:", error.message);
    res.status(200).json({
      success: false,
      message: "Webhook failed",
    });
  }
};

// ==================== Cashier/Kashier ====================

// @desc    Create Kashier payment (Payment Session)
// @route   POST /api/payments/kashier/create
// @access  Private
export const createCashierPayment = async (req, res, next) => {
  try {
    const { courseId, productId, items, amount, currency = "EGP", customer, couponCode } = req.body;
    const userId = req.user?._id;
    const user = req.user;
    const hasCheckoutItems = Array.isArray(items) && items.length > 0;

    if (!courseId && !productId && !hasCheckoutItems) {
      return next(new ApiError(400, "Course ID, Product ID, or checkout items are required"));
    }

    // Amount is optional for course checkout (server calculates it from DB).
    if (!courseId && !hasCheckoutItems && (!amount || Number(amount) <= 0)) {
      return next(new ApiError(400, "Valid amount is required"));
    }

    // Determine customer info (use provided customer object or logged in user)
    const finalCustomer = customer || {
      name: user?.name?.en || user?.name?.ar || user?.fullName || "Guest Customer",
      email: user?.email || "guest@genoun.com",
    };

    if (!finalCustomer.email) {
      return next(new ApiError(400, "Customer email is required for payment"));
    }

    const payment = await paymentService.createCashierPayment({
      userId,
      courseId,
      productId,
      items,
      amount,
      currency,
      customer: finalCustomer,
      couponCode,
    });

    return ApiResponse.success(
      res,
      payment,
      "Kashier payment session created successfully",
      201
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Kashier payment webhook (Primary - Payment Sessions API)
// @route   POST /api/payments/kashier/webhook
// @access  Public
export const kashierWebhook = async (req, res, next) => {
  try {
    console.log("📥 Kashier webhook received");
    
    // Get signature from headers if provided
    const signature = req.headers['x-kashier-signature'] || req.headers['kashier-signature'];
    
    const result = await paymentService.handleKashierWebhook(req.body, signature);

    // Kashier expects 200 OK response
    res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    console.error("❌ Kashier webhook error:", error.message);
    
    // Still return 200 to prevent Kashier from retrying on our errors
    // But we can distinguish between validation errors and processing errors
    res.status(200).json({
      success: false,
      message: error.message || "Webhook processing failed",
    });
  }
};

// @desc    Kashier payment callback (Deprecated - for backward compatibility)
// @route   POST /api/payments/cashier/callback
// @access  Public
export const cashierCallback = async (req, res, next) => {
  try {
    console.warn("⚠️ Using deprecated Cashier callback endpoint");
    const result = await paymentService.handleCashierCallback(req.body);

    // Cashier expects 200 OK
    res.status(200).json({
      success: true,
      message: "Callback processed",
    });
  } catch (error) {
    console.error("Cashier callback error:", error.message);
    // Still return 200 to avoid retries
    res.status(200).json({
      success: false,
      message: "Callback failed",
    });
  }
};
