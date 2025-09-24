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

	// List pending requests (in/out) [Requires user authentication]
	fastify.get(
		"/pending",
		{
			preHandler: verifyJWT
		},
		friendController.getPendingRequests.bind(friendController)
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
	fastify.delete<{ Params: FriendshipIdParams }>(
		"/request/:id",
		{
			schema: { params: friendshipIdSchema },
			preHandler: verifyJWT
		},
		friendController.cancelFriendRequest.bind(friendController)
	);

	// Accept friend request [Requires user authentication]
	fastify.post<{ Params: FriendshipIdParams }>(
		"/accept/:id",
		{
			schema: { params: friendshipIdSchema },
			preHandler: verifyJWT
		},
		friendController.acceptFriendRequest.bind(friendController)
	);

	// Decline friend request [Requires user authentication]
	fastify.post<{ Params: FriendshipIdParams }>(
		"/decline/:id",
		{
			schema: { params: friendshipIdSchema },
			preHandler: verifyJWT
		},
		friendController.declineFriendRequest.bind(friendController)
	);

	// Remove friend [Requires user authentication]
	fastify.delete<{ Params: FriendshipIdParams }>(
		"/:id",
		{
			schema: { params: friendshipIdSchema },
			preHandler: verifyJWT
		},
		friendController.removeFriend.bind(friendController)
	);

}
