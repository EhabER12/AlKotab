import Joi from "joi";
import { ApiError } from "../utils/apiError.js";

export const validate = (schema) => {
  return (req, res, next) => {
    const validationData = {};

    if (schema.describe().keys.body) validationData.body = req.body;
    if (schema.describe().keys.query) validationData.query = req.query;
    if (schema.describe().keys.params) validationData.params = req.params;

    const { error } = schema.validate(validationData, {
      abortEarly: false,
      allowUnknown: true,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        path: detail.path.join("."),
        message: detail.message,
      }));

      return next(new ApiError(400, "Validation Error", details));
    }

    next();
  };
};

export const schemas = {
  id: Joi.object({
    params: Joi.object({
      id: Joi.string().required(),
    }),
  }),

  pagination: Joi.object({
    query: Joi.object({
      page: Joi.number().integer().min(1),
      limit: Joi.number().integer().min(1).max(100),
    }),
  }),

  auth: {
    login: Joi.object({
      body: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
      }),
    }),

    register: Joi.object({
      body: Joi.object({
        fullName: Joi.object({
          ar: Joi.string().required().messages({
            "string.empty": "Arabic name is required",
            "any.required": "Arabic name is required",
          }),
          en: Joi.string().required().messages({
            "string.empty": "English name is required",
            "any.required": "English name is required",
          }),
        }).required(),
        email: Joi.string().email().required(),
        phone: Joi.string().optional().allow(""),
        lang: Joi.string().valid("ar", "en").optional(),
        password: Joi.string().min(6).required(),
        confirmPassword: Joi.string()
          .valid(Joi.ref("password"))
          .required()
          .messages({ "any.only": "Passwords do not match" }),
      }),
    }),

    forgotPassword: Joi.object({
      body: Joi.object({
        email: Joi.string().email().required(),
        lang: Joi.string().valid("ar", "en").optional(),
      }),
    }),

    resetPassword: Joi.object({
      body: Joi.object({
        token: Joi.string().required(),
        password: Joi.string().min(6).required(),
        lang: Joi.string().valid("ar", "en").optional(),
      }),
    }),
  },

};
