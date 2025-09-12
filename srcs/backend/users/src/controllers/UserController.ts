import { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/UserService';
import { AccountCreationData, LoginParams, SubParams } from '../schemas';

export class UserController {
  constructor(private userService: UserService) {}

  async createAccount(
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

  async getUserByLogin(
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

  async getUserByGoogleSub(
    request: FastifyRequest<{ Params: SubParams }>, 
    reply: FastifyReply
  ) {
    try {
      const user = await this.userService.getUserByGoogleSub(request.params.sub);
      reply.send(user);
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  // async getUserProfile(
  //   request: FastifyRequest<{ Params: { id: string } }>, 
  //   reply: FastifyReply
  // ) {
  //   try {
  //     const user = await this.userService.getUserById(parseInt(request.params.id));
  //     reply.send(user);
  //   } catch (error) {
  //     this.handleError(error, reply);
  //   }
  // }

  private handleError(error: any, reply: FastifyReply) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      reply.status(409).send({ 
        error: "Username or email already exists" 
      });
    } else if (error.code === 'USER_NOT_FOUND') {
      reply.status(404).send({ 
        error: "User not found" 
      });
    } else {
      reply.log.error(error);
      reply.status(500).send({ 
        error: "Internal server error" 
      });
    }
  }
}