import { FastifyInstance } from "fastify";
import { UserController } from '../controllers/UserController';
import { 
  LocalUserCreationRawData, 
  GoogleUserCreationData, 
  createLocalUserSchema,
  createGoogleUserSchema, 
  UpdateRawData, 
  updateSchema, 
  UserIdParams, 
  userIdSchema, 
  Credentials,
  credentialsSchema,
  MatchHistoryQuery,
  matchHistoryQuerySchema,
  UserLookupParams,
  userLookupSchema
} from "../schemas";
import { userAuthMiddleware } from "../middleware/userAuth";
import { internalAuthMiddleware } from "../middleware/internalAuth";

export default async function usersRoutes(fastify: FastifyInstance) {
  const userController = new UserController(fastify.services.user);

  // POST /local - Create local user account (email/password signup) [protected]
  fastify.post<{ Body: LocalUserCreationRawData }>(
    "/local",
    { 
      schema: { body: createLocalUserSchema },
      preHandler: internalAuthMiddleware 
    },
    userController.createLocalAccount.bind(userController)
  );

  // POST /local/resolve - Resolve local user credentials (email/password signin) [protected]
  fastify.post<{ Body: Credentials }>(
    "/local/resolve",
    {
      schema: { body: credentialsSchema },
      preHandler: internalAuthMiddleware,
    },
    userController.resolveLocalUser.bind(userController)
  );

  // POST /google - Create Google OAuth user account [protected]
  fastify.post<{ Body: GoogleUserCreationData }>(
    "/google",
    {
      schema: { body: createGoogleUserSchema},
      preHandler: internalAuthMiddleware 
    },
    userController.createGoogleAccount.bind(userController)
  );

  // PUT /me - Update user profile data
  fastify.put<{ Body: UpdateRawData }>(
    "/me",
    {
      schema: { body: updateSchema },
      preHandler: userAuthMiddleware
    }, 
    userController.updateMe.bind(userController)
  );

  // PUT /me/avatar - Update user avatar
  fastify.put(
    "/me/avatar",
    { preHandler: userAuthMiddleware },
    userController.updateAvatar.bind(userController)
  );

  // GET /me - Get current user profile with stats
  fastify.get(
    "/me",
    { preHandler: userAuthMiddleware },
    userController.getMe.bind(userController)
  );

  // DELETE /me - Delete user account (soft delete)
  fastify.delete(
    "/me",
    { preHandler: userAuthMiddleware },
    userController.deleteMe.bind(userController)
  );

  // DELETE /me/avatar - Reset avatar to default
  fastify.delete(
    "/me/avatar",
    { preHandler: userAuthMiddleware },
    userController.resetAvatar.bind(userController)
  );

  // GET /:uid/avatar - Retrieve avatar image file
  fastify.get<{ Params: UserIdParams }> (
    "/:uid/avatar",
    { schema: { params: userIdSchema }  },
    userController.getAvatar.bind(userController)
  );

  // GET /:uid/profile - Get public user profile
  fastify.get<{ Params: UserIdParams }>(
    "/:uid/profile",
    { schema: { params: userIdSchema } },
    userController.getPublicProfile.bind(userController)
  );

  // GET /:identifier - Get all user data by identifier (id, username, email) [protected]
  fastify.get<{ Params: UserLookupParams }>(
    "/:identifier",
    {
      schema: { params: userLookupSchema },
      preHandler: internalAuthMiddleware,
    },
    userController.getUser.bind(userController)
  );

  // GET /:uid/match-history - Get match history via game service [protected]
  fastify.get<{Params: UserIdParams, Querystring: MatchHistoryQuery}>(
    "/:uid/match-history", 
    { schema: { querystring: matchHistoryQuerySchema, params: userIdSchema },
      preHandler: userAuthMiddleware,
    },
    userController.getMatchHistory.bind(userController)
  );
}
