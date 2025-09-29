import { FastifyInstance } from "fastify";
import { UserController } from '../controllers/UserController';
import { 
  LocalUserCreationData, 
  GoogleUserCreationData, 
  createLocalUserSchema,
  createGoogleUserSchema, 
  LoginParams, 
  loginSchema, 
  UpdateRawData, 
  updateSchema, 
  UserIdParams, 
  userIdSchema, 
  AvatarParams, 
  avatarFilenameSchema 
} from "../schemas";
import { userAuthMiddleware } from "../middleware/user-auth.middleware";
import { internalAuthMiddleware } from "../middleware/internal-auth.middleware";

export default async function usersRoutes(fastify: FastifyInstance) {
  const userController = new UserController(fastify.services.user);

  // Create local user account (email/password signup)
  fastify.post<{ Body: LocalUserCreationData }>(
    "/local",
    { 
      schema: { body: createLocalUserSchema},
      preHandler: internalAuthMiddleware 
    },
    userController.createLocalAccount.bind(userController)
  );

  // Create Google OAuth user account
  fastify.post<{ Body: GoogleUserCreationData }>(
    "/google",
    {
      schema: { body: createGoogleUserSchema},
      preHandler: internalAuthMiddleware 
    },
    userController.createGoogleAccount.bind(userController)
  );

  // get all user data via its login [SHOULD be accessible only to backend micro services]
  fastify.get<{ Params: LoginParams }>(
    "/login/:login",
    {
      schema: { params: loginSchema},
      preHandler: internalAuthMiddleware,
    },
    userController.getUserByLogin.bind(userController)
  );

  // update some user data (email, password, 2fa, alias, settings) [Requires user authentication]
  fastify.put<{ Body: UpdateRawData }>(
    "/profile/me",
    {
      schema: { body: updateSchema },
      preHandler: userAuthMiddleware
    }, 
    userController.updateMe.bind(userController)
  );

  // update avatar [Requires user authentication]
  fastify.put<{  }>(
    "/profile/me/avatar",
    {
      schema: { },
      preHandler: userAuthMiddleware
    },
    userController.updateAvatar.bind(userController)
  );

  // get user profile (most of user data + stats summary) [Requires user authentication]
  fastify.get(
    "/profile/me",
    { preHandler: userAuthMiddleware },
    userController.getMe.bind(userController)
  );

  // delete user account (soft delete) [Requires user authentication]
  fastify.delete(
    "/me",
    { preHandler: userAuthMiddleware },
    userController.deleteMe.bind(userController)
  );

  // reset avatar to default [Requires user authentication]
  fastify.delete(
    "/profile/me/avatar",
    { preHandler: userAuthMiddleware },
    userController.resetAvatar.bind(userController)
  );

  // Retrieve avatar image file
  fastify.get<{ Params: AvatarParams }> (
    "/avatar/:filename",
    { schema: { params: avatarFilenameSchema }  },
    userController.getAvatar.bind(userController)
  );

  // get public user profile (no sensitive data + stats summary)
  fastify.get<{ Params: UserIdParams }>(
    "/profile/id/:id",
    { schema: { params: userIdSchema } },
    userController.getPublicProfile.bind(userController)
  );

  // get all user data by id [SHOULD be accessible only to backend micro services]
  fastify.get<{ Params: UserIdParams }>(
    "/id/:id",
    {
      schema: { params: userIdSchema },
      preHandler: internalAuthMiddleware,
    },
    userController.getUserById.bind(userController)
  );

  // get match-history aka game sessions via game service
  fastify.get("/match-history", async (request, reply) => {
    // TODO - implement match history retrieval
  });
}
