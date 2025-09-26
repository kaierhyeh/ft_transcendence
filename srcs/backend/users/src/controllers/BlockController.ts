import { FastifyRequest, FastifyReply } from 'fastify';
import { BlockService } from '../services/BlockService';
import { UserIdParams } from '../schemas/blocks';

export class BlockController {
	constructor(private blockService: BlockService) {}

	public async getBlockedUsers(request: FastifyRequest, reply: FastifyReply) {
		try {
			const thisUserId = request.user?.sub;
			if (!thisUserId) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}
			const blockedUsers = await this.blockService.getBlockedUsers(thisUserId);
			reply.status(200).send(blockedUsers);
		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async blockUser(request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) {
		try {
			const thisUserId = request.user?.sub;
			const targetUserId = request.params.id;

			if (!thisUserId) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}
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
			const thisUserId = request.user?.sub;
			const targetUserId = request.params.id;

			if (!thisUserId) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}
			await this.blockService.unblockUser(thisUserId, targetUserId);
			reply.status(200).send({ success: true });
		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async isBlocked(request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) {
		try {
			const thisUserId = request.user?.sub;
			const targetUserId = request.params.id;

			if (!thisUserId) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
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