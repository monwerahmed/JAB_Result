class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    statusCode = 409;
    const field = err.meta?.target?.join(', ') || 'field';
    message = `A record with this ${field} already exists.`;
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found.';
  }

  // Prisma foreign key constraint
  if (err.code === 'P2003') {
    statusCode = 400;
    message = 'Related record not found. Please check the provided IDs.';
  }

  // Zod validation error
  if (err.name === 'ZodError') {
    statusCode = 422;
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired. Please log in again.';
  }

  statusCode = statusCode || 500;
  message = message || 'Internal Server Error';

  if (process.env.NODE_ENV === 'development') {
    console.error('ERROR:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { AppError, errorHandler, asyncHandler };
