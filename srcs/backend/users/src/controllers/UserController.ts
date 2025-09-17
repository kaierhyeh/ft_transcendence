import { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/UserService';
import { AccountCreationData, LoginParams, UpdateRawData } from '../schemas';

export class UserController {
  constructor(private userService: UserService) {}

  public async createAccount(
    request: FastifyRequest<{ Body: AccountCreationData }>, 
    reply: FastifyReply
  ) {
    try {
      const result = await this.userService.createAccount(request.body);
      
      reply.status(201).send({
        success: true,
        user_id: result.user_id,
        message: "Account created successfully"
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
      
      const user = await this.userService.getUserById(userId);
      return reply.send(user);
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