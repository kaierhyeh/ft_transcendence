import { FastifyInstance } from "fastify";
import { UserController } from '../controllers/UserController';
import { UserCreationData, createUserSchema, LoginParams, loginSchema, UpdateRawData, updateSchema, UserIdParams, userIdSchema } from "../schemas";
import { verifyJWT } from "../middleware/verifyJWT";

export default async function usersRoutes(fastify: FastifyInstance) {
  const userController = new UserController(fastify.services.user);

  // add a user to database (google, local, guest)
  fastify.post<{ Body: UserCreationData }>(
    "/",
    { schema: { body: createUserSchema} },
    userController.createAccount.bind(userController)
  );

  // get all user data via its login [SHOULD be accessible only to backend micro services]
  fastify.get<{ Params: LoginParams }>(
    "/:login",
    { schema: { params: loginSchema} },
    userController.getUserByLogin.bind(userController)
  );

  // update some user data (email, password, 2fa, alias, settings, avatar) [Requires user authentication]
  fastify.put<{ Body: UpdateRawData }>(
    "/me",
    { schema: { body: updateSchema },
      preHandler: verifyJWT
    }, 
    userController.updateMe.bind(userController)
  );

  // get user profile (most of user data + stats summary) [Requires user authentication]
  fastify.get(
    "/me",
    { preHandler: verifyJWT},
    userController.getMe.bind(userController)
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
