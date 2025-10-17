import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from './AppError';

export function fastifyErrorHandler(
    error: FastifyError | AppError | Error,
    request: FastifyRequest,
    reply: FastifyReply
) {
    // 1. Handle schema validation errors (from Fastify/AJV)
    if ('validation' in error && error.validation) {
        const firstError = error.validation[0];
        const field = firstError.instancePath?.replace(/^\//, '') || 
                     firstError.params?.missingProperty || 
                     'unknown';

        return reply.status(400).send({
            error: firstError.message || 'Validation failed',
            code: 'VALIDATION_ERROR',
            field
        });
    }

    // 2. Handle custom AppError
    if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
            error: error.message,
            code: error.code || 'APP_ERROR'
        });
    }

    // 3. Handle Fastify HTTP errors (statusCode set)
    if ('statusCode' in error && error.statusCode && error.statusCode < 500) {
        return reply.status(error.statusCode).send({
            error: error.message || 'Request failed',
            code: 'HTTP_ERROR'
        });
    }

    // 4. Default: Internal Server Error
    request.log.error(error);
    return reply.status(500).send({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
    });
}
