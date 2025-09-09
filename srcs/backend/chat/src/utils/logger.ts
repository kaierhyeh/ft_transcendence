import { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const logger: FastifyPluginAsync = async (fastify:FastifyInstance): Promise<void> => {
	fastify.decorate('logRequest', (req: any) => {
		fastify.log.info(`Incoming request: ${req.method} ${req.url}`);
	});

	fastify.addHook('onRequest', async (req) => {
		(fastify as any).logRequest(req);
	});
};
