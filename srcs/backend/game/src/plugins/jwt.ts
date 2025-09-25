// src/plugins/jwt.ts
import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { verify } from "jsonwebtoken";
import fs from "fs";
import { CONFIG } from "../config";
import { JwtGameSessionPayload } from "../types";

declare module "fastify" {
  interface FastifyInstance {
    verifyToken: (token: string) => Promise<JwtGameSessionPayload>;
  }
}

const jwtPlugin: FastifyPluginAsync = async (fastify) => {
  const publicKey = fs.readFileSync(CONFIG.JWT.GAME_PUBLIC_KEY_PATH, "utf8");

  // Custom verification function - no signing needed in users service
  fastify.decorate("verifyToken", async (token: string): Promise<JwtGameSessionPayload> => {
    return new Promise((resolve, reject) => {
      verify(token, publicKey, {
        algorithms: [CONFIG.JWT.ALGORITHM as any],
        issuer: CONFIG.JWT.ISSUER,
        audience: CONFIG.JWT.AUDIENCE,
      }, (err: any, payload: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(payload as JwtGameSessionPayload);
        }
      });
    });
  });
};

export default fp(jwtPlugin, {
  name: "jwt-plugin",
  fastify: "5.x",
});
