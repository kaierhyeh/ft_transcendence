import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { AuthService } from '../services/AuthService';
import { CONFIG } from '../config';
import { LoginData, SignupFormData } from '../schemas';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // Issue JWT token using Fastify's JWT plugin
  private issueToken(fastify: FastifyInstance, user_id: number, username: string) {
    return fastify.jwt.sign(
      { 
        sub: user_id, 
        username,
        iss: CONFIG.JWT.ISSUER,
        aud: CONFIG.JWT.AUDIENCE
      },
      { 
        algorithm: CONFIG.JWT.ALGORITHM as any,
        expiresIn: CONFIG.JWT.EXPIRES_IN
      }
    );
  }

  async signup(
    request: FastifyRequest<{ Body: SignupFormData }>, 
    reply: FastifyReply
  ) {
    try {
      const result = await this.authService.signup(request.body);
      
      const token = this.issueToken(request.server, result.user_id, request.body.username);
      
      reply.status(201).send({
        success: true,
        user_id: result.user_id,
        token,
        message: "Account created successfully"
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async login(
    request: FastifyRequest<{ Body: LoginData }>, 
    reply: FastifyReply
  ) {
    try {
      const data = request.body;
      const user = await this.authService.validateUser(data);
      
      // Generate token using Fastify's JWT
      const token = this.issueToken(request.server, user.user_id, user.username);
      
      reply.send({
        succes: true,
        user_id: user.user_id,
        access_token: token,
        message: "Login successful"
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async hashPassword(
    request: FastifyRequest<{ Body: string }>, 
    reply: FastifyReply
  ) {
    try {
      const password = request.body;
      const password_hash = await this.authService.hashPassword(password);
      
      reply.send({ password_hash });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  private handleError(error: any, reply: FastifyReply) {
    // Handle validation errors from user service
    if (error.status === 400 && error.details) {
      reply.status(400).send({
        error: "Invalid user data",
        details: error.details.message || error.message,
        // Optionally include validation details for debugging
        validation: error.details.validation
      });
      return;
    }

    // User service is down
    if (error.code === 'ECONNREFUSED') {
      reply.status(503).send({ 
        error: "Service temporarily unavailable" 
      });
      return;
    }

    // User already exists (409 from user service)
    if (error.status === 409) {
      reply.status(409).send({ 
        error: "Username or email already exists" 
      });
      return;
    }

    if (error.code === 'INVALID_CREDENTIALS') {
      reply.status(401).send({
        error: "Invalid credentials"
      });
      return;
    }

    // Generic 400 errors
    if (error.status === 400) {
      reply.status(400).send({ 
        error: error.message || "Invalid request data" 
      });
      return;
    }

    // User not found
    if (error.code === 'USER_NOT_FOUND') {
      reply.status(404).send({ 
        error: "User not found" 
      });
      return;
    }

    // Everything else is a 500
    reply.log.error(error);
    reply.status(500).send({ 
      error: "Internal server error" 
    });
  }
}