import { FastifyInstance } from "fastify";
import { AuthController } from '../controllers/AuthController';
import { LoginData, loginSchema, passwordUpdateSchema, PasswordUpdateData, SignupFormData, signupFormSchema, createGuestSchema, GuestRawData } from "../schemas";

export default async function authRoutes(fastify: FastifyInstance) {
  const userController = new AuthController();

  fastify.post<{ Body: SignupFormData }>(
    "/signup",
    { schema: { body: signupFormSchema } },
    userController.signup.bind(userController)
  );

  fastify.post<{ Body: LoginData }>(
    "/login",
    { schema: { body: loginSchema} },
    userController.login.bind(userController)
  );

  fastify.put<{ Body: PasswordUpdateData }>(
    "/hash-password",
    { schema: { body: passwordUpdateSchema } },
    userController.updatePasswordHash.bind(userController)
  );

  fastify.post<{ Body: GuestRawData }>(
    "/guest",
    { schema: { body: createGuestSchema } },
    userController.createGuest.bind(userController)
  );
}
