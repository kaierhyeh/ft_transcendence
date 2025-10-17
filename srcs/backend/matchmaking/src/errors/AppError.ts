import { ErrorCode } from './ErrorCodes';

export class AppError extends Error {
    constructor(
        message: string,
        public statusCode: number = 500,
        public code?: ErrorCode | string // Allow ErrorCode type or string for flexibility
    ) {
        super(message);
        this.name = 'AppError';
    }
}
