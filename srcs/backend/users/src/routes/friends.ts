import { FastifyInstance } from "fastify";
import { FriendController } from "../controllers/FriendController";
import { UserIdParams, userIdSchema, UserIdsBody, userIdsSchema, FriendshipParams, friendshipParamsSchema, BatchUserIdsBody, batchUserIdsSchema } from "../schemas/friends";
import { userAuthMiddleware, userAuthSwitcher } from "../middleware/userAuth";
import { internalAuthMiddleware } from "../middleware/internalAuth";

export default async function friendsRoutes(fastify: FastifyInstance) {
	const friendController = new FriendController(fastify.services.friends);

	// List current friends [Requires user authentication]
	fastify.get(
		"/",
		{
			preHandler: userAuthMiddleware
		},
		friendController.getFriends.bind(friendController)
	);

	fastify.get<{ Params: UserIdParams}>(
		"/user/:id",
		{ 
			schema: { params: userIdSchema },
			preHandler: internalAuthMiddleware
		},
		friendController.getFriendsByUserId.bind(friendController)
	)

	fastify.post<{ Body: BatchUserIdsBody }>(
		"/batch",
		{ 
			schema: { body: batchUserIdsSchema },
			preHandler: internalAuthMiddleware
		},
		friendController.getFriendsBatch.bind(friendController)
	)

	// Get user by id
	fastify.get<{ Params: UserIdParams }>(
		"/:id",
		{
			preHandler: userAuthSwitcher
		},
		friendController.getUserById.bind(friendController)
	);

	// List all users (for searching)
	fastify.get(
		"/allusers",
		{
			preHandler: userAuthSwitcher
		},
		friendController.getAllUsers.bind(friendController)
	);

	// List pending requests to this user (in) [Requires user authentication]
	fastify.get(
		"/incoming",
		{
			preHandler: userAuthMiddleware
		},
		friendController.getPendingIncomingRequests.bind(friendController)
	);

	// List pending requests from this (out) [Requires user authentication]
	fastify.get(
		"/outgoing",
		{
			preHandler: userAuthMiddleware
		},
		friendController.getPendingOutgoingRequests.bind(friendController)
	);

	// Send a friend request [Requires user authentication]
	fastify.post<{ Params: UserIdParams }>(
		"/request/:id",
		{
			schema: { params: userIdSchema },
			preHandler: userAuthMiddleware
		},
		friendController.sendFriendRequest.bind(friendController)
	);

	// Cancel a friend request [Requires user authentication]
	fastify.delete<{ Params: UserIdParams }>(
		"/request/:id",
		{
			schema: { params: userIdSchema },
			preHandler: userAuthMiddleware
		},
		friendController.cancelFriendRequest.bind(friendController)
	);

	// Accept friend request [Requires user authentication]
	fastify.post<{ Params: UserIdParams }>(
		"/accept/:id",
		{
			schema: { params: userIdSchema },
			preHandler: userAuthMiddleware
		},
		friendController.acceptFriendRequest.bind(friendController)
	);

	// Decline friend request [Requires user authentication]
	fastify.delete<{ Params: UserIdParams }>(
		"/decline/:id",
		{
			schema: { params: userIdSchema },
			preHandler: userAuthMiddleware
		},
		friendController.declineFriendRequest.bind(friendController)
	);

	// Remove friend [Requires user authentication]
	fastify.delete<{ Params: UserIdParams }>(
		"/:id",
		{
			schema: { params: userIdSchema },
			preHandler: userAuthMiddleware
		},
		friendController.removeFriend.bind(friendController)
	);

	// Set of users data for chat service
	fastify.post<{ Body: UserIdsBody }>(
		"/usersChat",
		{
			schema: { body: userIdsSchema },
			preHandler: internalAuthMiddleware
		},
		friendController.getUsersByIds.bind(friendController)
	);

	fastify.get<{ Params: FriendshipParams }>(
		"/status/:userId/:friendId",
		{
			schema: { params: friendshipParamsSchema },
			preHandler: internalAuthMiddleware
		},
		friendController.getFriendshipStatus.bind(friendController)
	);

	fastify.get
}
