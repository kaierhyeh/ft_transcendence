import { FastifyInstance } from "fastify";
import { UserController } from '../controllers/UserController';
import { AccountCreationData, createAccountSchema, EmailParams, emailSchema, subSchema, SubParams } from "../schemas";

export default async function usersRoutes(fastify: FastifyInstance) {
  const userController = new UserController(fastify.services.user);

  // CREATE
  fastify.post<{ Body: AccountCreationData }>(
    "/",
    { schema: { body: createAccountSchema} },
    userController.createAccount.bind(userController)
  );

  fastify.get<{ Params: EmailParams }>(
    "/email/:email",
    { schema: { params: emailSchema} },
    userController.getUserByEmail.bind(userController)
  );

  fastify.get<{ Params: SubParams }>(
    "/google/:sub",
    { schema: { params: subSchema} },
    userController.getUserByGoogleSub.bind(userController)
  );

  // READ
  // fastify.get(
  //   "/:id",
  //    userController.getUserProfile.bind(userController)
  // );

  // UPDATE
  fastify.put(
    "/me",
    (request, reply) => {
      // (authenticated) -> update profile (display_name, avatar, settings)

    }
  );

  // CREATE
  fastify.post(
    "/me/avatar",
    async (request, reply) => {
      // uplaod avatar (multipart) -> returns `avatar_url`?

    });

  // READ
  fastify.get(
    "/me", 
    async (request, reply) => {
      // retrieve current user profile

  });

  // READ
  fastify.get(
    "/",
    async (request, reply) => {
      // search user
    });
}
