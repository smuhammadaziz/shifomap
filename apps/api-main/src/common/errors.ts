/**
 * Custom application error with status code
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message)
    this.name = "AppError"
  }
}

// HTTP 400 Bad Request
export function badRequest(message: string, code?: string): AppError {
  return new AppError(message, 400, code ?? "BAD_REQUEST")
}

// HTTP 401 Unauthorized
export function unauthorized(message: string = "Unauthorized", code?: string): AppError {
  return new AppError(message, 401, code ?? "UNAUTHORIZED")
}

// HTTP 403 Forbidden
export function forbidden(message: string = "Forbidden", code?: string): AppError {
  return new AppError(message, 403, code ?? "FORBIDDEN")
}

// HTTP 404 Not Found
export function notFound(message: string = "Not found", code?: string): AppError {
  return new AppError(message, 404, code ?? "NOT_FOUND")
}

// HTTP 409 Conflict
export function conflict(message: string, code?: string): AppError {
  return new AppError(message, 409, code ?? "CONFLICT")
}
