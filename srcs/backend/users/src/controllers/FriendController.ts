import { FastifyRequest, FastifyReply } from 'fastify';
import { FriendService } from '../services/FriendService';
import { FriendshipIdParams, FriendshipParams, UserIdParams, UserIdsBody, BatchUserIdsBody } from '../schemas/friends';
import { toInteger } from '../utils/type-converters';

export class FriendController {
	constructor(private friendService: FriendService) {}

	public async getAllUsers(request: FastifyRequest, reply: FastifyReply) {
		try {
			const sub = request.authUser?.sub;
			if (!sub) {
				console.log("[DEBUG] request all users NO auth");
				reply.status(200).send(await this.friendService.getAllUsers(null));
			} else {
				console.log("[DEBUG] request all users WITH auth user id:", sub);
				reply.status(200).send(await this.friendService.getAllUsers(toInteger(sub)));
			}
		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async getUserById(request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) {
		try {
			const targetUserId = request.params.id;
			const sub = request.authUser?.sub;
			if (!sub) {
				console.log("[DEBUG] request user by id NO auth");
				const user = await this.friendService.getUserById(null, targetUserId);
				reply.status(200).send(user);
			} else {
				console.log("[DEBUG] request user by id WITH auth user id:", sub);
				const user = await this.friendService.getUserById(toInteger(sub), targetUserId);
				reply.status(200).send(user);
			}
		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async getFriends(request: FastifyRequest, reply: FastifyReply) {
		try {
			const sub = request.authUser?.sub;
			if (!sub) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}
			const thisUserId = toInteger(sub);
			const friends = await this.friendService.getFriends(thisUserId);
			reply.status(200).send(friends);
		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async getFriendsByUserId(request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) {
		try {
			const userId = request.params.id;
			const friends = await this.friendService.getFriends(userId);
			reply.status(200).send(friends);
		} catch(error) {
			this.handleError(error, reply);
		}
	}

	public async getFriendsBatch(request: FastifyRequest<{ Body: BatchUserIdsBody }>, reply: FastifyReply) {
		try {
			const userIds = request.body.user_ids;
			const friendLists = await this.friendService.getFriendsBatch(userIds);
			reply.status(200).send(friendLists);
		} catch(error) {
			this.handleError(error, reply);
		}
	}

	public async getPendingIncomingRequests(request: FastifyRequest, reply: FastifyReply) {
		try {
			const sub = request.authUser?.sub;
			if (!sub) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}
			const thisUserId = toInteger(sub);
			const requests = await this.friendService.getPendingIncomingRequests(thisUserId);
			reply.status(200).send(requests);
		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async getPendingOutgoingRequests(request: FastifyRequest, reply: FastifyReply) {
		try {
			const sub = request.authUser?.sub;
			if (!sub) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}
			const thisUserId = toInteger(sub);
			const requests = await this.friendService.getPendingOutgoingRequests(thisUserId);
			reply.status(200).send(requests);
		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async sendFriendRequest(request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) {
		try {
			const sub = request.authUser?.sub;
			const targetUserId = request.params.id;

			if (!sub) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}
			const thisUserId = toInteger(sub);
			if (thisUserId === targetUserId) {
				return reply.status(400).send({ error: "Cannot send friend request to yourself" });
			}
			await this.friendService.sendFriendRequest(thisUserId, targetUserId);
			reply.status(201).send({
				success: true,
				message: "Friend request sent"
			});
		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async cancelFriendRequest(request: FastifyRequest<{ Params: FriendshipIdParams }>, reply: FastifyReply) {
		try {
			const sub = request.authUser?.sub;
			const targetFriendshipId = request.params.id;

			if (!sub) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}
			const thisUserId = toInteger(sub);
			if (thisUserId === targetFriendshipId) {
				return reply.status(400).send({ error: "Cannot cancel friend request to yourself" });
			}
			await this.friendService.cancelFriendRequest(thisUserId, targetFriendshipId);
			reply.status(204).send();
		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async acceptFriendRequest(request: FastifyRequest<{ Params: FriendshipIdParams }>, reply: FastifyReply) {
		try {
			const sub = request.authUser?.sub;
			const targetFriendshipId = request.params.id;

			if (!sub) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}
			const thisUserId = toInteger(sub);
			if (thisUserId === targetFriendshipId) {
				return reply.status(400).send({ error: "Cannot accept friend request to yourself" });
			}
			await this.friendService.acceptFriendRequest(thisUserId, targetFriendshipId);
			reply.status(200).send({
				success: true,
				message: "Friend request accepted" });

		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async declineFriendRequest(request: FastifyRequest<{ Params: FriendshipIdParams }>, reply: FastifyReply) {
		try {
			const sub = request.authUser?.sub;
			const targetFriendshipId = request.params.id;

			if (!sub) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}
			const thisUserId = toInteger(sub);
			if (thisUserId === targetFriendshipId) {
				return reply.status(400).send({ error: "Cannot decline friend request to yourself" });
			}
			await this.friendService.declineFriendRequest(thisUserId, targetFriendshipId);
			reply.status(200).send({
				success: true,
				message: "Friend request declined"
			});

		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async removeFriend(request: FastifyRequest<{ Params: FriendshipIdParams }>, reply: FastifyReply) {
		try {
			const sub = request.authUser?.sub;
			const targetFriendshipId = request.params.id;

			if (!sub) {
				return reply.status(401).send({ error: "Unauthorized: No user context" });
			}
			const thisUserId = toInteger(sub);
			if (thisUserId === targetFriendshipId) {
				return reply.status(400).send({ error: "Cannot remove yourself from friends" });
			}
			await this.friendService.removeFriendship(thisUserId, targetFriendshipId);
			reply.status(204).send();

		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async getUsersByIds(request: FastifyRequest<{ Body: UserIdsBody }>, reply: FastifyReply) {
		try {
			const thisUserId = request.body.id;
			const userIds = request.body.ids;
			const users = await this.friendService.getUsersByIds(thisUserId, userIds);
			reply.status(200).send(users);
		} catch (error) {
			this.handleError(error, reply);
		}
	}

	public async getFriendshipStatus(request: FastifyRequest<{ Params: FriendshipParams }>, reply: FastifyReply) {
		try {
			const userId = request.params.userId;
			const friendId = request.params.friendId;
			console.log("-----FRIENDSHIP : " + userId + " -> " + friendId);
			const status = await this.friendService.getFriendshipStatus(userId, friendId);
			console.log("-------- BEFORE SEND: ", status);
			reply.status(200).send( status ?? null )
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
