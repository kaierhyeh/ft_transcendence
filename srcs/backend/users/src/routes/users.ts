import { FastifyInstance } from "fastify";
import { UserController } from '../controllers/UserController';
import { AccountCreationData, createAccountSchema, LoginParams, loginSchema } from "../schemas";

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

  fastify.put("/me", (request, reply) => {
    // (authenticated) -> update profile
  });

  fastify.post("/me/avatar", async (request, reply) => {
    // upload avatar
  });

  fastify.get("/me", async (request, reply) => {
    // retrieve current user profile
  });

  fastify.get("/", async (request, reply) => {
    // search users
  });
}
