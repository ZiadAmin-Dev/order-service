export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = "Resource not found") {
        super(message, 404, true);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = "Unauthorized access") {
        super(message, 401, true);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = "Forbidden access") {
        super(message, 403, true);
    }
}

export class ConflictError extends AppError {
    constructor(message: string = "Conflict occurred") {
        super(message, 409, true);
    }
}

export class BadRequestError extends AppError {
    constructor(message: string = "Bad request") {
        super(message, 400, true);
    }
}
