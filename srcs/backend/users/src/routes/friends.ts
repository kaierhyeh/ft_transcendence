import { FastifyInstance } from "fastify";
import { FriendController } from "../controllers/FriendController";
import { verifyJWT } from "../middleware/verifyJWT";
import { FriendshipIdParams, friendshipIdSchema, UserIdParams, userIdSchema } from "../schemas/friends";


/* 
 * Time to think about friendship manpulations: 
 * is it better to use FriendshipIdParams or UserIdParams
 * for accepting/declining/canceling requests and removing friends?
 */

export default async function friendsRoutes(fastify: FastifyInstance) {
	const friendController = new FriendController(fastify.services.friends);

	// List current friends [Requires user authentication]
	fastify.get(
		"/",
		{
			preHandler: verifyJWT
		},
		friendController.getFriends.bind(friendController)
	);

	// List pending requests to this user (in) [Requires user authentication]
	fastify.get(
		"/incoming",
		{
			preHandler: verifyJWT
		},
		friendController.getPendingIncomingRequests.bind(friendController)
	);

	// List pending requests from this (out) [Requires user authentication]
	fastify.get(
		"/outgoing",
		{
			preHandler: verifyJWT
		},
		friendController.getPendingOutgoingRequests.bind(friendController)
	);

	// Send a friend request [Requires user authentication]
	fastify.post<{ Params: UserIdParams }>(
		"/request/:id",
		{
			schema: { params: userIdSchema },
			preHandler: verifyJWT
		},
		friendController.sendFriendRequest.bind(friendController)
	);

	// Cancel a friend request [Requires user authentication]
	fastify.delete<{ Params: UserIdParams }>(
		"/request/:id",
		{
			schema: { params: userIdSchema },
			preHandler: verifyJWT
		},
		friendController.cancelFriendRequest.bind(friendController)
	);

	// Accept friend request [Requires user authentication]
	fastify.post<{ Params: UserIdParams }>(
		"/accept/:id",
		{
			schema: { params: userIdSchema },
			preHandler: verifyJWT
		},
		friendController.acceptFriendRequest.bind(friendController)
	);

	// Decline friend request [Requires user authentication]
	fastify.post<{ Params: UserIdParams }>(
		"/decline/:id",
		{
			schema: { params: userIdSchema },
			preHandler: verifyJWT
		},
		friendController.declineFriendRequest.bind(friendController)
	);

	// Remove friend [Requires user authentication]
	fastify.delete<{ Params: UserIdParams }>(
		"/:id",
		{
			schema: { params: userIdSchema },
			preHandler: verifyJWT
		},
		friendController.removeFriend.bind(friendController)
	);

}
