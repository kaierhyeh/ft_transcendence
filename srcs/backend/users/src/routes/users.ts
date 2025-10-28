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
  userLookupSchema,
  AvatarQuery,
  avatarQuerySchema,
  GoogleSubParams,
  googleSubParamsSchema
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

  // PUT /me - Update some user profile data
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

  // DELETE /me/avatar - Reset avatar to default
  fastify.delete(
    "/me/avatar",
    { preHandler: userAuthMiddleware },
    userController.resetAvatar.bind(userController)
  );

  // GET /:uid/avatar - Retrieve avatar image file
  fastify.get<{ Params: UserIdParams, Querystring: AvatarQuery }> (
    "/:uid/avatar",
    { schema: { querystring: avatarQuerySchema, params: userIdSchema } },
    userController.getAvatar.bind(userController)
  );

  // PUT /:uid/2fa - Update 2FA settings (internal service use only)
  fastify.put<{ Params: UserIdParams; Body: { enabled: number; secret?: string | null } }>(
    "/:uid/2fa",
    { 
      schema: { params: userIdSchema },
      preHandler: internalAuthMiddleware 
    },
    userController.update2FASettings.bind(userController)
  );

  // GET /:uid/profile - Get public user profile
  fastify.get<{ Params: UserIdParams }>(
    "/:uid/profile",
    { schema: { params: userIdSchema } },
    userController.getPublicProfile.bind(userController)
  );

  // GET /google/:google_sub - Get user by Google sub [protected]
  fastify.get<{ Params: GoogleSubParams }>(
    "/google/:google_sub",
    {
      schema: { params: googleSubParamsSchema },
      preHandler: internalAuthMiddleware,
    },
    userController.getUserByGoogleSub.bind(userController)
  );

  // GET /:identifier - Get all user data by identifier (id, username) [protected]
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

  // GET /leaderboard - Get leaderboard [public]
  fastify.get<{ Querystring: { limit?: number } }>(
    "/leaderboard",
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 100, default: 10 }
          }
        }
      }
    },
    userController.getLeaderboard.bind(userController)
  );
}
