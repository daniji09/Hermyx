// Validation (and sanitization) middleware using Zod

// Validates body
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

// Validates params
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
  Object.defineProperty(req, 'params', {
    value: result.data,
    writable: true,
    enumerable: true,
    configurable: true,
  });
  // Successful validation
  next();
};

// Validates query
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
  Object.defineProperty(req, 'query', {
    value: result.data,
    writable: true,
    enumerable: true,
    configurable: true,
  });

  // Successful validation
  next();
};

// Validates files
export const validateFilesSchema = (schema) => (req, res, next) => {
  // Frontend data is evaluated with Zod schema.
  // If no files are provided it is interpreted as a void array, so it can be validated
  const result = schema.safeParse({ photos: req.files || [] });

  // If errors are detected, it returns them
  if (!result.success) {
    return res.status(400).json({
      errors: result.error.flatten().fieldErrors,
    });
  }

  // Data is sanitize
  req.files = result.data;

  // Successful validation
  next();
};

export const validateFileSchema = (schema) => (req, res, next) => {
  const result = schema.safeParse({ photo: req.file });

  if (!result.success) {
    return res.status(400).json({
      errors: result.error.flatten().fieldErrors,
    });
  }

  req.file = result.data.photo;
  next();
};
