import { FastifyInstance } from "fastify";
import { AuthController } from '../controllers/AuthController';
import { LoginData, loginSchema, passwordUpdateSchema, PasswordUpdateData, SignupFormData, signupFormSchema, gameSessionClaimsSchema, GameSessionClaims } from "../schemas";

export default async function authRoutes(fastify: FastifyInstance) {
  const authController = new AuthController();

  fastify.post<{ Body: SignupFormData }>(
    "/signup",
    { schema: { body: signupFormSchema } },
    authController.signup.bind(authController)
  );

  fastify.post<{ Body: LoginData }>(
    "/login",
    { schema: { body: loginSchema} },
    authController.login.bind(authController)
  );

  fastify.put<{ Body: PasswordUpdateData }>(
    "/hash-password",
    { schema: { body: passwordUpdateSchema } },
    authController.updatePasswordHash.bind(authController)
  );

  fastify.post<{ Body: GameSessionClaims }>(
    "/game-jwt",
    { schema: { body: gameSessionClaimsSchema } },
    authController.generateGameJWT.bind(authController)
  );
}
