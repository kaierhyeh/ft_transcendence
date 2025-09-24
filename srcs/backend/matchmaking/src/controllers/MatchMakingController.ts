import { FastifyRequest, FastifyReply } from 'fastify';
import { MatchMakingService } from '../services/MatchMakingService';
import { UserCreationData, LoginParams, UpdateRawData, UserIdParams, AvatarParams } from '../schemas';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config';
import { pipeline } from 'stream/promises';

export class MatchMakingController {
  constructor(private userService: MatchMakingService) {}

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

  public async updateAvatar(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const user_id = request.user?.sub;
      if (!user_id)
        return reply.status(401).send({ error: "Unauthorized" });

      const data = await request.file();
      if (!data)
        return reply.status(400).send({ error: "No file uploaded" });
      
      // Type-safe mimetype check
      const allowedTypes = CONFIG.AVATAR.ALLOWED_TYPES as readonly string[];
      if (!allowedTypes.includes(data.mimetype))
        return reply.status(400).send({ error: "Invalid file type" });

      const timestamp = Date.now();
      const extension = path.extname(data.filename || '') || '.jpg';
      const filename = `user_${user_id}_${timestamp}${extension}`;
      const filepath = path.join(CONFIG.AVATAR.BASE_URL, filename);

      await fs.promises.mkdir(CONFIG.AVATAR.BASE_URL, {recursive: true});

      // Use pipeline from stream/promises
      await pipeline(data.file, fs.createWriteStream(filepath));

      const old_user = await this.userService.getUserById(user_id);
      const old_avatar_filename = old_user.avatar_filename;

      if (old_avatar_filename && old_avatar_filename !== filename) {
        const old_path = path.join(CONFIG.AVATAR.BASE_URL, old_avatar_filename);
        try {
          await fs.promises.unlink(old_path);
        } catch (err) {
          console.warn(`Could not delete old avatar: ${old_path}`);
        }
      }

      const changes = await this.userService.updateAvatar(user_id, filename);

      return reply.status(201).send(changes);
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

  public async getAvatar(
    request: FastifyRequest<{ Params: AvatarParams }>,
    reply: FastifyReply
  ) {
    try {
      const { filename } = request.params;
      const filepath = path.join(CONFIG.AVATAR.BASE_URL, filename);

      if (!fs.existsSync(filepath) || !filepath.startsWith(CONFIG.AVATAR.BASE_URL)) {
        return reply.status(404).send({ error: 'Avatar not found' });
      }

      const stats = await fs.promises.stat(filepath);
      const ext = path.extname(filename).toLowerCase();

      const mime_types: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      };

      reply
        .header('Content-Type', mime_types[ext] || 'application/octet-stream')
        .header('Content-Length', stats.size)
        .header('Cache-control', 'public, max-age=31536000') // 1 year cache
        .header('Etag', `"${stats.mtime.getTime()}-${stats.size}`);

        const stream = fs.createReadStream(filepath);
        return reply.send(stream);
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