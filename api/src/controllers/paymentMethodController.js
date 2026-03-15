import PaymentMethod from "../models/paymentMethodSchema.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";

// @desc    Get all payment methods
// @route   GET /api/payment-methods
// @access  Public (only active ones shown to public)
export const getAllPaymentMethods = async (req, res, next) => {
    try {
        const { includeInactive } = req.query;
        const isAdmin = req.user?.role === "admin";

        const filter = {};
        // Only filter inactive if user is not admin OR if admin didn't explicitly request inactive ones
        const shouldFilterInactive = !isAdmin || (isAdmin && !includeInactive);
        if (shouldFilterInactive) {
            filter.isActive = true;
        }

        const methods = await PaymentMethod.find(filter).sort({ order: 1 });

        // Hide sensitive credentials from non-admin users
        const sanitizedMethods = methods.map((method) => {
            const obj = method.toObject();
            if (!isAdmin) {
                delete obj.credentials;
            }
            return obj;
        });

        return ApiResponse.success(res, sanitizedMethods);
    } catch (error) {
        next(error);
    }
};

// @desc    Get payment method by ID
// @route   GET /api/payment-methods/:id
// @access  Private/Admin
export const getPaymentMethodById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const method = await PaymentMethod.findById(id);

        if (!method) {
            return next(new ApiError(404, "Payment method not found"));
        }

        return ApiResponse.success(res, method);
    } catch (error) {
        next(error);
    }
};

// @desc    Create payment method
// @route   POST /api/payment-methods
// @access  Private/Admin
export const createPaymentMethod = async (req, res, next) => {
    try {
        console.log("📝 Creating payment method with data:", JSON.stringify(req.body, null, 2));
        const method = await PaymentMethod.create(req.body);
        console.log("✅ Payment method created successfully:", method._id);
        return ApiResponse.success(res, method, "Payment method created successfully", 201);
    } catch (error) {
        console.error("❌ Error creating payment method:", {
            name: error.name,
            message: error.message,
            code: error.code,
            errors: error.errors,
        });
        if (error.code === 11000) {
            return next(new ApiError(400, "Payment method already exists"));
        }
        next(error);
    }
};

// @desc    Update payment method
// @route   PUT /api/payment-methods/:id
// @access  Private/Admin
export const updatePaymentMethod = async (req, res, next) => {
    try {
        const { id } = req.params;
        const method = await PaymentMethod.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!method) {
            return next(new ApiError(404, "Payment method not found"));
        }

        return ApiResponse.success(res, method, "Payment method updated successfully");
    } catch (error) {
        next(error);
    }
};

// @desc    Delete payment method
// @route   DELETE /api/payment-methods/:id
// @access  Private/Admin
export const deletePaymentMethod = async (req, res, next) => {
    try {
        const { id } = req.params;
        const method = await PaymentMethod.findByIdAndDelete(id);

        if (!method) {
            return next(new ApiError(404, "Payment method not found"));
        }

        return ApiResponse.success(res, null, "Payment method deleted successfully");
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle payment method status
// @route   PATCH /api/payment-methods/:id/toggle
// @access  Private/Admin
export const togglePaymentMethod = async (req, res, next) => {
    try {
        const { id } = req.params;
        const method = await PaymentMethod.findById(id);

        if (!method) {
            return next(new ApiError(404, "Payment method not found"));
        }

        method.isActive = !method.isActive;
        await method.save();

        return ApiResponse.success(
            res,
            method,
            `Payment method ${method.isActive ? "activated" : "deactivated"} successfully`
        );
    } catch (error) {
        next(error);
    }
};
