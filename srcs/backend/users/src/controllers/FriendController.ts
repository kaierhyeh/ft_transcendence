import { FastifyRequest, FastifyReply } from 'fastify';
import { FriendService } from '../services/FriendService';
import { FriendshipIdParams, UserIdParams } from '../schemas/friends';

export class FriendController {
	constructor(private friendService: FriendService) {}

	public async getListFriends(request: FastifyRequest, reply: FastifyReply) {
		try {
			const thisUserId = request.user?.sub;
			if (!thisUserId) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}

		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async getPendingRequests(request: FastifyRequest, reply: FastifyReply) {
		try {
			const thisUserId = request.user?.sub;
			if (!thisUserId) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}
		
		} catch (error) {
			this.handleError(error, reply);
		}

	}

	public async sendFriendRequest(request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) {
		try {
			const thisUserId = request.user?.sub;
			const targetUserId = request.params.id;
			if (!thisUserId) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}

		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async cancelFriendRequest(request: FastifyRequest<{ Params: FriendshipIdParams }>, reply: FastifyReply) {
		try {
			const thisUserId = request.user?.sub;
			if (!thisUserId) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}

		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async acceptFriendRequest(request: FastifyRequest<{ Params: FriendshipIdParams }>, reply: FastifyReply) {
		try {
			const thisUserId = request.user?.sub;
			if (!thisUserId) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}

		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async declineFriendRequest(request: FastifyRequest<{ Params: FriendshipIdParams }>, reply: FastifyReply) {
		try {
			const thisUserId = request.user?.sub;
			if (!thisUserId) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}

		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async removeFriend(request: FastifyRequest<{ Params: FriendshipIdParams }>, reply: FastifyReply) {
		try {
			const thisUserId = request.user?.sub;
			if (!thisUserId) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}

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
