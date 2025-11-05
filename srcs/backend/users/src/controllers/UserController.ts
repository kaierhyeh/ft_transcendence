import { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/UserService';
import { 
  LocalUserCreationRawData, 
  GoogleUserCreationData, 
  UpdateRawData, 
  UserIdParams, 
  Credentials,
  MatchHistoryQuery,
  UserLookupParams,
  GoogleSubParams
} from '../schemas';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config';
import { pipeline } from 'stream/promises';
import { toInteger } from '../utils/type-converters';
import { toSqlDateTime } from '../utils';

export class UserController {
  constructor(private userService: UserService) {}

  public async createLocalAccount(
    request: FastifyRequest<{ Body: LocalUserCreationRawData }>, 
    reply: FastifyReply
  ) {
    try {
      const result = await this.userService.createLocalUser(request.body);
      
      reply.status(201).send({
        success: true,
        user_id: result.user_id,
        message: "Local user created successfully"
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  public async createGoogleAccount(
    request: FastifyRequest<{ Body: GoogleUserCreationData }>, 
    reply: FastifyReply
  ) {
    try {
      const result = await this.userService.createGoogleUser(request.body);
      
      reply.status(201).send({
        success: true,
        user_id: result.user_id,
        message: "Google user created successfully"
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  public async resolveLocalUser(
    request: FastifyRequest<{ Body: Credentials}>,
    reply: FastifyReply
  ) {
    try {
      const result = await this.userService.resolveLocalUser(request.body);

      reply.status(200).send({
        success: true,
        user_id: result.user_id,
        two_fa_enabled: result.two_fa_enabled,
        two_fa_secret: result.two_fa_secret,
        message: "Local user resolved successfully"
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  public async updateMe(
    request: FastifyRequest<{ Body: UpdateRawData }>,
    reply: FastifyReply
  ) {
    try {
      const sub = request.authUser?.sub; // `sub` is the user ID in the JWT payload
      
      if (!sub) {
        return reply.status(401).send({ error: "Unauthorized: No user context" });
      }
      const user_id = toInteger(sub);
      
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
      const sub = request.authUser?.sub;
      if (!sub) {
        return reply.status(401).send({ error: "Unauthorized: No user context" });
      }
      const user_id = toInteger(sub);

      const data = await request.file();
      if (!data)
        return reply.status(400).send({ error: "No file uploaded" });
      
      // Type-safe mimetype check
      const allowedTypes = CONFIG.AVATAR.ALLOWED_TYPES as readonly string[];
      if (!allowedTypes.includes(data.mimetype))
        return reply.status(400).send({ error: "Invalid file type" });

      // Prevent uploading files with reserved names
      if (data.filename === CONFIG.AVATAR.DEFAULT_FILENAME) {
        return reply.status(400).send({ error: "Filename is reserved" });
      }

      const updated_at = new Date();
      const timestamp = updated_at.getTime();
      const extension = path.extname(data.filename || '') || '.jpg';
      const filename = `user_${user_id}_${timestamp}${extension}`;
      const filepath = path.join(CONFIG.AVATAR.BASE_URL, filename);

      await fs.promises.mkdir(CONFIG.AVATAR.BASE_URL, {recursive: true});

      // Use pipeline from stream/promises
      await pipeline(data.file, fs.createWriteStream(filepath));

      const old_user = await this.userService.getUserById(user_id);
      const old_avatar_filename = old_user.avatar_filename;

      // Only delete old avatar if it's not the default avatar
      if (old_avatar_filename && 
          old_avatar_filename !== filename && 
          old_avatar_filename !== CONFIG.AVATAR.DEFAULT_FILENAME) {
        const old_path = path.join(CONFIG.AVATAR.BASE_URL, old_avatar_filename);
        try {
          await fs.promises.unlink(old_path);
        } catch (err) {
          console.warn(`Could not delete old avatar: ${old_path}`);
        }
      }

      const changes = await this.userService.updateAvatar(user_id, filename, toSqlDateTime(updated_at));

      return reply.status(201).send(changes);
    } catch (error) {
        this.handleError(error, reply);
    }
  }

  public async getMe(request: FastifyRequest, reply: FastifyReply) {
    try {
      const sub = request.authUser?.sub;
      
      if (!sub) {
        return reply.status(401).send({ error: "Unauthorized: No user context" });
      }
      const user_id = toInteger(sub);
      
      const profile = await this.userService.getProfile(user_id);
      return reply.send(profile);
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  public async getAvatar(
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply
  ) {
    // Note: We ignore the 'v' parameter in avatarQuerySchema - it's only for cache busting
    try {
      const user_id = request.params.uid;
      const filename = await this.userService.getAvatar(user_id);
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
      const user_id = request.params.uid;
      
      const publicProfile = await this.userService.getPublicProfile(user_id);
      return reply.send(publicProfile);
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  public async getUser(
    request: FastifyRequest<{ Params: UserLookupParams }>,
    reply: FastifyReply
  ) {
    try {
      const identifier = request.params.identifier;
      
      const user = await this.userService.getUser(identifier);
      return reply.send(user);
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  public async getUserByGoogleSub(
    request: FastifyRequest<{ Params: GoogleSubParams }>,
    reply: FastifyReply
  ) {
    try {
      const google_sub = request.params.google_sub;
      
      const user = await this.userService.getUserByGoogleSub(google_sub);
      return reply.send(user);
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  public async resetAvatar(request: FastifyRequest, reply: FastifyReply) {
    try {
      const sub = request.authUser?.sub;
      
      if (!sub) {
        return reply.status(401).send({ error: "Unauthorized: No user context" });
      }
      const user_id = toInteger(sub);
      
      const changes = await this.userService.resetAvatarToDefault(user_id);
      return reply.send({ 
        success: true,
        changes,
        message: "Avatar reset to default successfully"
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  public async getMatchHistory(request: FastifyRequest<{ Params: UserIdParams, Querystring: MatchHistoryQuery }>, reply: FastifyReply) {
    try {
      const user_id = request.params.uid;
      const { page, limit } = request.query;

      const game_sessions = await this.userService.getMatchHistory(user_id, page, limit);

      return reply.send(game_sessions);

    } catch (error) {
      this.handleError(error, reply);
    }
  }

  public async getLeaderboard(
    request: FastifyRequest<{ Querystring: { limit?: number } }>,
    reply: FastifyReply) {
    try {
      const { limit = 10 } = request.query;
      const leaderboard = await this.userService.getLeaderboard(limit);
      return reply.send(leaderboard);
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  public async update2FASettings(
    request: FastifyRequest<{ Params: UserIdParams; Body: { enabled: number; secret?: string | null } }>,
    reply: FastifyReply
  ) {
    try {
      const user_id = request.params.uid;
      const { enabled, secret } = request.body;

      await this.userService.update2FASettings(user_id, enabled, secret);

      return reply.send({
        success: true,
        message: "2FA settings updated successfully"
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  private handleError(error: any, reply: FastifyReply) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      reply.status(409).send({ 
        error: "Username already exists" 
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
    } else if (error.status === 401 || error.code === 'INVALID_CREDENTIALS') {
      reply.status(401).send({ 
        error: error.message || "Unauthorized" 
      });
    } else if (error.status === 405 || error.code === 'NOT_A_LOCAL_USER') {
      reply.status(405).send({
        error: error.message || "Not a local user"
      });
    } else {
      reply.log.error(error);
      reply.status(500).send({ 
        error: "Internal server error" 
      });
    }
  }
}