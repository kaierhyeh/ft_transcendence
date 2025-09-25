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
import { verifyJWT } from "../middleware/verifyJWT";

export default async function usersRoutes(fastify: FastifyInstance) {
  const userController = new UserController(fastify.services.user);

  // Create local user account (email/password signup)
  fastify.post<{ Body: LocalUserCreationData }>(
    "/local",
    { schema: { body: createLocalUserSchema} },
    userController.createLocalAccount.bind(userController)
  );

  // Create Google OAuth user account
  fastify.post<{ Body: GoogleUserCreationData }>(
    "/google",
    { schema: { body: createGoogleUserSchema} },
    userController.createGoogleAccount.bind(userController)
  );



  // get all user data via its login [SHOULD be accessible only to backend micro services]
  fastify.get<{ Params: LoginParams }>(
    "/:login",
    { schema: { params: loginSchema} },
    userController.getUserByLogin.bind(userController)
  );

  // update some user data (email, password, 2fa, alias, settings) [Requires user authentication]
  fastify.put<{ Body: UpdateRawData }>(
    "/me",
    {
      schema: { body: updateSchema },
      preHandler: verifyJWT
    }, 
    userController.updateMe.bind(userController)
  );

  // update avatar [Requires user authentication]
  fastify.put<{  }>(
    "/me/avatar",
    {
      schema: { },
      preHandler: verifyJWT
    },
    userController.updateAvatar.bind(userController)
  );

  // get user profile (most of user data + stats summary) [Requires user authentication]
  fastify.get(
    "/me",
    { preHandler: verifyJWT },
    userController.getMe.bind(userController)
  );

  // delete user account (soft delete) [Requires user authentication]
  fastify.delete(
    "/me",
    { preHandler: verifyJWT },
    userController.deleteMe.bind(userController)
  );

  // Retrieve avatar image file
  fastify.get<{ Params: AvatarParams }> (
    "/avatar/:filename",
    { schema: { params: avatarFilenameSchema }  },
    userController.getAvatar.bind(userController)
  );

  // get public user profile (no sensisitive data + stats summary)
  fastify.get<{ Params: UserIdParams }>(
    "/id/:id",
    { schema: { params: userIdSchema } },
    userController.getPublicProfile.bind(userController)
  );

  // get match-history aka game sessions via game service
  fastify.get("/match-history", async (request, reply) => {
    // TODO - implement match history retrieval
  });
}
