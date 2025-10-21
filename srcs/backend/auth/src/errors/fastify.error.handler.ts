import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

/**
 * Global error handler for the auth service
 * Handles validation errors and transforms them into user-friendly messages
 */
export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
    // Handle schema validation errors
    if (error.validation) {
        // Take the first error for simplicity
        const firstError = error.validation[0];
        
        // Strip 'body/' prefix from instancePath
        const field = firstError.instancePath
            .replace(/^\/body\//, '')
            .replace(/^\//, '') || firstError.params?.missingProperty;
        
        return reply.status(400).send({
            error: firstError.message || 'Validation failed',
            field: field
        });
    }

    // NOTE: error handling in routes via error vode (e,g, 'NOT_A_LOCAL_USER') could be put here
    // // Handle other types of errors
    // if (error.statusCode) {
    //     return reply.status(error.statusCode).send({
    //         error: error.message || 'An error occurred'
    //     });
    // }

    // // Default error response
    // request.log.error(error);
    // return reply.status(500).send({
    //     error: 'Internal server error'
    // });
}