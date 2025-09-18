import { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/UserService';
import { UserCreationData, LoginParams, UpdateRawData, UserIdParams } from '../schemas';

export class UserController {
  constructor(private userService: UserService) {}

  public async createAccount(
    request: FastifyRequest<{ Body: UserCreationData }>, 
    reply: FastifyReply
  ) {
    try {
      const result = await this.userService.createUser(request.body);
      
      reply.status(201).send({
        success: true,
        user_id: result.user_id,
        message: "User created successfully"
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  public async getUserByLogin(
    request: FastifyRequest<{ Params: LoginParams }>, 
    reply: FastifyReply
  ) {
    try {
      const user = await this.userService.getUserByLogin(request.params.login);
      reply.send(user);
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  public async updateMe(
    request: FastifyRequest<{ Body: UpdateRawData }>,
    reply: FastifyReply
  ) {
    try {
      const user_id = request.user?.sub; // `sub` is the user ID in the JWT payload
      
      if (!user_id) {
        return reply.status(401).send({ error: "Unauthorized: No user context" });
      }
      
      const raw_data = request.body;
      const changes = await this.userService.updateUser(user_id, raw_data);
      
      return reply.send({ changes });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  public async getMe(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user?.sub;
      
      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized: No user context" });
      }
      
      const profile = await this.userService.getProfile(userId);
      return reply.send(profile);
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  public async getPublicProfile(
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply
  ) {
    try {
      const user_id = request.params.id;
      
      const publicProfile = await this.userService.getPublicProfile(user_id);
      return reply.send(publicProfile);
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  private handleError(error: any, reply: FastifyReply) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      reply.status(409).send({ 
        error: "Username or email already exists" 
      });
    } else if (error.code === 'USER_NOT_FOUND') {
      reply.status(404).send({ 
        error: "User not found" 
      });
    } else if (error.code === 'LITE_STATS_NOT_FOUND') {
      reply.status(503).send({ 
        error: "Statistics service unavailable" 
      });
    } else if (error.code === 'FORBIDDEN_OPERATION') {
      reply.status(403).send({ 
        error: error.message || "Forbidden operation" 
      });
    } else if (error.status === 401 ) {
      reply.status(401).send({ 
        error: error.message || "Unauthorized" 
      });
    } else {
      reply.log.error(error);
      reply.status(500).send({ 
        error: "Internal server error" 
      });
    }
  }
}