import { FastifyInstance } from "fastify";
import { UserController } from '../controllers/UserController';
import { AccountCreationData, createAccountSchema, LoginParams, loginSchema, UpdateData, updateSchema } from "../schemas";
import { verifyJWT } from "../middleware/veryfyJWT";

export default async function usersRoutes(fastify: FastifyInstance) {
  const userController = new UserController(fastify.services.user);

  fastify.post<{ Body: AccountCreationData }>(
    "/",
    { schema: { body: createAccountSchema} },
    userController.createAccount.bind(userController)
  );

  fastify.get<{ Params: LoginParams }>(
    "/:login",
    { schema: { params: loginSchema} },
    userController.getUserByLogin.bind(userController)
  );

  fastify.put<{ Body: UpdateData }>(
    "/me",
    { schema: { body: updateSchema },
      preHandler: verifyJWT
    }, 
    userController.updateMe.bind(userController)
  );

  fastify.get("/me", async (request, reply) => {
    // retrieve current user profile
  });

  fastify.get("/", async (request, reply) => {
    // search users
  });
}
