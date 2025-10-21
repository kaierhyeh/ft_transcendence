import { FastifyRequest, FastifyReply } from 'fastify';
import { BlockService } from '../services/BlockService';
import { UserIdParams } from '../schemas/blocks';
import { toInteger } from '../utils/type-converters';

export class BlockController {
	constructor(private blockService: BlockService) {}

	public async getBlockedUsers(request: FastifyRequest, reply: FastifyReply) {
		try {
			console.log("[INFO] CONTROLLER - getBlockedUsers 0");
			const sub = request.authUser?.sub;
			console.log("[INFO] CONTROLLER - getBlockedUsers 1");
			if (!sub) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}
			console.log("[INFO] CONTROLLER - getBlockedUsers 2");
			const thisUserId = toInteger(sub);
			console.log("[INFO] CONTROLLER - getBlockedUsers 3");
			const blockedUsers = await this.blockService.getBlockedUsers(thisUserId);
			console.log("[INFO] CONTROLLER - getBlockedUsers 4");
			reply.status(200).send(blockedUsers);
		} catch (error) {
			console.log("[INFO] CONTROLLER - getBlockedUsers ERROR");
			this.handleError(error, reply);
		}
	}

	public async blockUser(request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) {
		try {
			const sub = request.authUser?.sub;
			const targetUserId = request.params.id;

			if (!sub) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}
			const thisUserId = toInteger(sub);
			if (thisUserId === targetUserId) {
				return reply.status(400).send({ error: "Cannot block yourself" });
			}
			await this.blockService.blockUser(thisUserId, targetUserId);
			reply.status(201).send({ success: true });
		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async unblockUser(request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) {
		try {
			const sub = request.authUser?.sub;
			const targetUserId = request.params.id;

			if (!sub) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}
			const thisUserId = toInteger(sub);
			if (thisUserId === targetUserId) {
				return reply.status(400).send({ error: "Cannot unblock yourself" });
			}
			await this.blockService.unblockUser(thisUserId, targetUserId);
			reply.status(200).send({ success: true });
		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async isBlocked(request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) {
		try {
			const sub = request.authUser?.sub;
			const targetUserId = request.params.id;

			if (!sub) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}
			const thisUserId = toInteger(sub);
			if (thisUserId === targetUserId) {
				return reply.status(400).send({ error: "Cannot check block status for yourself" });
			}
			const isBlocked = await this.blockService.isBlocked(thisUserId, targetUserId);
			reply.status(200).send({ isBlocked });
		} catch (error) {
			this.handleError(error, reply);
		}
	}

	private handleError(error: any, reply: FastifyReply) {
		if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
			reply.status(409).send({ 
				error: "Username or email already exists" 
			});
		} else if (error.code === 'USER_NOT_FOUND') {
			reply.status(404).send({ 
				error: "User not found" 
			});
		} else {
			reply.log.error(error);
			reply.status(500).send({ 
				error: "Internal server error" 
			});
		}
	}
}
