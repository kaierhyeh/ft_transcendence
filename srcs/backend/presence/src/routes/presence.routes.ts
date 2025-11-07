// presence.routes.ts
import { FastifyInstance, FastifyRequest } from "fastify";
import { SocketStream } from "@fastify/websocket";
import { presenceController } from "../controllers/PresenceController";
import { verifyUserSessionJWT } from "../services/JwtVerifierService";

export default async function presenceRoutes(fastify: FastifyInstance) {
    // WebSocket endpoint with authentication
    fastify.get(
        "/ws",
        { websocket: true },
        async (connection: SocketStream, request: FastifyRequest) => {
            console.log('🎯 WebSocket connection handler called');
            console.log('   Socket readyState:', connection.socket.readyState);
            
            try {
                // Extract token from cookies or Authorization header
                let token: string | undefined;
                
                const authHeader = request.headers.authorization;
                if (authHeader?.startsWith("Bearer ")) {
                    token = authHeader.substring(7);
                }
                
                if (!token && request.cookies?.accessToken) {
                    token = request.cookies.accessToken;
                }
                
                if (!token) {
                    console.log('❌ No access token provided in WebSocket upgrade');
                    connection.socket.close(4000, 'No access token provided');
                    return;
                }
                
                // Verify the token
                const payload = await verifyUserSessionJWT(token);
                console.log(`✅ WebSocket authenticated for user ${payload.sub}`);
                
                // Pass the authenticated user ID to the controller
                presenceController.accept(connection, parseInt(payload.sub));
                
            } catch (err) {
                console.log('❌ WebSocket authentication failed:', err);
                connection.socket.close(4001, 'Invalid or expired access token');
            }
        }
    );
}