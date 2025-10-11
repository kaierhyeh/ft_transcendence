import { FastifyInstance } from "fastify";
import { UserController } from '../controllers/UserController';
import { 
  LocalUserCreationRawData, 
  GoogleUserCreationData, 
  createLocalUserSchema,
  createGoogleUserSchema, 
  LoginParams, 
  loginParamsSchema, 
  UpdateRawData, 
  updateSchema, 
  UserIdParams, 
  userIdSchema, 
  Credentials,
  credentialsSchema,
  MatchHistoryQuery,
  matchHistoryQuerySchema
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

  // GET /login/:login - Get all user data via login identifier [protected]
  fastify.get<{ Params: LoginParams }>(
    "/login/:login",
    {
      schema: { params: loginParamsSchema},
      preHandler: internalAuthMiddleware,
    },
    userController.getUserByLogin.bind(userController)
  );

  // PUT /profile/me - Update user profile data
  fastify.put<{ Body: UpdateRawData }>(
    "/profile/me",
    {
      schema: { body: updateSchema },
      preHandler: userAuthMiddleware
    }, 
    userController.updateMe.bind(userController)
  );

  // PUT /profile/me/avatar - Update user avatar
  fastify.put(
    "/profile/me/avatar",
    { preHandler: userAuthMiddleware },
    userController.updateAvatar.bind(userController)
  );

  // GET /profile/me - Get current user profile with stats
  fastify.get(
    "/profile/me",
    { preHandler: userAuthMiddleware },
    userController.getMe.bind(userController)
  );

  // DELETE /me - Delete user account (soft delete)
  fastify.delete(
    "/me",
    { preHandler: userAuthMiddleware },
    userController.deleteMe.bind(userController)
  );

  // DELETE /profile/me/avatar - Reset avatar to default
  fastify.delete(
    "/profile/me/avatar",
    { preHandler: userAuthMiddleware },
    userController.resetAvatar.bind(userController)
  );

  // GET /profile/id/:id/avatar - Retrieve avatar image file
  fastify.get<{ Params: UserIdParams }> (
    "/profile/id/:id/avatar",
    { schema: { params: userIdSchema }  },
    userController.getAvatar.bind(userController)
  );

  // GET /profile/id/:id - Get public user profile
  fastify.get<{ Params: UserIdParams }>(
    "/profile/id/:id",
    { schema: { params: userIdSchema } },
    userController.getPublicProfile.bind(userController)
  );

  // GET /id/:id - Get all user data by id [protected]
  fastify.get<{ Params: UserIdParams }>(
    "/id/:id",
    {
      schema: { params: userIdSchema },
      preHandler: internalAuthMiddleware,
    },
    userController.getUserById.bind(userController)
  );

  // GET /me/match-history - Get match history via game service (TODO)
  fastify.get<{ Querystring: MatchHistoryQuery}>(
    "/me/match-history", 
    { schema: matchHistoryQuerySchema,
      preHandler: userAuthMiddleware,
    },
    userController.getMatchHistory.bind(userController)
  );
}
