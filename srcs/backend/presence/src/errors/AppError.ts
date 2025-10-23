export class AppError extends Error {
    public readonly status: number;

    constructor(status: number, reason: string, message?: string) {
        super(message || reason);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
        this.status = status;
    }
}