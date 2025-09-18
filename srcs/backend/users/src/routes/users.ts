import { FastifyInstance } from "fastify";
import { UserController } from '../controllers/UserController';
import { UserCreationData, createUserSchema, LoginParams, loginSchema, UpdateRawData, updateSchema, UserIdParams, userIdSchema } from "../schemas";
import { verifyJWT } from "../middleware/veryfyJWT";

export default async function usersRoutes(fastify: FastifyInstance) {
  const userController = new UserController(fastify.services.user);

  fastify.post<{ Body: UserCreationData }>(
    "/",
    { schema: { body: createUserSchema} },
    userController.createAccount.bind(userController)
  );

  fastify.get<{ Params: LoginParams }>(
    "/:login",
    { schema: { params: loginSchema} },
    userController.getUserByLogin.bind(userController)
  );

  fastify.put<{ Body: UpdateRawData }>(
    "/me",
    { schema: { body: updateSchema },
      preHandler: verifyJWT
    }, 
    userController.updateMe.bind(userController)
  );

  fastify.get(
    "/me",
    { preHandler: verifyJWT},
    userController.getMe.bind(userController)
  );

  fastify.get<{ Params: UserIdParams }>(
    "/id/:id",
    { schema: { params: userIdSchema } },
    userController.getPublicProfile.bind(userController)
  );

  fastify.get("/match-history", async (request, reply) => {
    // get match-history aka game sessions via game service
  });
}
