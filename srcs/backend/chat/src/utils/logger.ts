import { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const logger: FastifyPluginAsync = async (fastify:FastifyInstance): Promise<void> => {
	fastify.decorate('logRequest', (req: any) => {
		fastify.log.info(`Incoming request: ${req.method} ${req.url}`);
	});

	fastify.addHook('onRequest', async (req) => {
		(fastify as any).logRequest(req);
	});
};

export function colorLog(type: "green" | "red" | "yellow" | "cyan" = "cyan", ...args: any[]) {
	let colorCode: string;
	switch (type) {
		case "green": // green
			colorCode = "\x1b[32m[SUCSESS]:";
			break;
		case "red": // red
			colorCode = "\x1b[31m[ERROR]  :";
			break;
		case "yellow": // yellow
			colorCode = "\x1b[33m[WARN]   :";
			break;
		case "cyan": // cyan
			colorCode = "\x1b[36m[INFO]   :";
			break;
		default:
			colorCode = "\x1b[0m[LOG]     :";
			break;
	}
	console.log(colorCode, ...args, "\x1b[0m");
}

export function redLogError(...args: any[]) {
	console.error("\x1b[31m[ERROR]  : %s", ...args, "\x1b[0m");
}
