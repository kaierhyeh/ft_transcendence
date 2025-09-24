import { authRoutes } from './auth.routes.js';
import { oauthRoutes } from './oauth.routes.js';
import { twofaRoutes } from './twofa.routes.js';
import { jwksRoutes } from './jwks.routes.js';

export default [authRoutes, oauthRoutes, twofaRoutes, jwksRoutes];