import { FastifyInstance } from "fastify";
import { AuthController } from '../controllers/AuthController';
import { LoginData, loginSchema, passwordSchema, SignupFormData, signupFormSchema } from "../schemas";

export default async function authRoutes(fastify: FastifyInstance) {
  const userController = new AuthController();

  fastify.post<{ Body: SignupFormData }>(
    "/signup",
    { schema: { body: signupFormSchema} },
    userController.signup.bind(userController)
  );

  fastify.post<{ Body: LoginData }>(
    "/login",
    { schema: { body: loginSchema} },
    userController.login.bind(userController)
  );

  fastify.put<{ Body: string }>(
    "/hash-password",
    { schema: { body: passwordSchema } },
    userController.hashPassword.bind(userController)
  );
}
