/**
 * server/core/errors.js
 * Domain and HTTP errors for Knot Just server core.
 * Host-agnostic: pure JavaScript, zero external dependencies.
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.details = details
    Error.captureStackTrace?.(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message, 404, code)
  }
}

export class InsufficientStockError extends AppError {
  constructor(productName, available, requested) {
    super(
      `Insufficient stock for "${productName}". Requested: ${requested}, Available: ${available}`,
      409,
      'INSUFFICIENT_STOCK',
      { productName, available, requested }
    )
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please try again later.', retryAfterSeconds = 60) {
    super(message, 429, 'RATE_LIMITED', { retryAfterSeconds })
    this.retryAfterSeconds = retryAfterSeconds
  }
}

/**
 * Format any thrown error into a safe client response object.
 * Sanitizes internal stack traces and secrets in production.
 */
export function formatErrorResponse(error) {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
    }
  }

  // Generic or unexpected error: mask internal details
  return {
    status: 500,
    body: {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected server error occurred.',
      },
    },
  }
}
