// Validation (and sanitization) middleware using Zod

export const validateBodySchema = (schema) => (req, res, next) => {
  // Frontend data is evaluated with Zod schema.
  // If no body is provided it is interpreted as a void object, so it can be validated
  const result = schema.safeParse(req.body || {});

  // If errors are detected, it returns them
  if (!result.success) {
    return res.status(400).json({
      errors: result.error.flatten().fieldErrors,
    });
  }

  // Data is sanitize
  req.body = result.data;

  // Successful validation
  next();
};

export const validateParamsSchema = (schema) => (req, res, next) => {
  // Frontend data is evaluated with Zod schema.
  // If no body is provided it is interpreted as a void object, so it can be validated
  const result = schema.safeParse(req.params || {});

  // If errors are detected, it returns them
  if (!result.success) {
    return res.status(400).json({
      errors: result.error.flatten().fieldErrors,
    });
  }

  // Data is sanitize
  req.body = result.data;

  // Successful validation
  next();
};

export const validateQuerySchema = (schema) => (req, res, next) => {
  // Frontend data is evaluated with Zod schema.
  // If no body is provided it is interpreted as a void object, so it can be validated
  const result = schema.safeParse(req.query || {});

  // If errors are detected, it returns them
  if (!result.success) {
    return res.status(400).json({
      errors: result.error.flatten().fieldErrors,
    });
  }

  // Data is sanitize
  req.body = result.data;

  // Successful validation
  next();
};
