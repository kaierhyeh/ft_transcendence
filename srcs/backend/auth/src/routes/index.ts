import { FastifyInstance } from "fastify";
import { AuthController } from '../controllers/AuthController';
import { SignupFormData, signupFormSchema } from "../schemas";

export default async function authRoutes(fastify: FastifyInstance) {
  const userController = new AuthController();

  fastify.post<{ Body: SignupFormData }>(
    "/signup",
    { schema: { body: signupFormSchema} },
    userController.signup.bind(userController)
  );

}
