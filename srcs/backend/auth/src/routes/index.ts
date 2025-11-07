import authRoutes from "./auth.routes";
import jwksRoutes from "./jwks.routes";
import oauthRoutes from "./oauth.routes";
import twofaRoutes from "./twofa.routes";

export default [
    { route: authRoutes, prefix: "/auth" },
    { route: jwksRoutes, prefix: "/.well-known" },
    { route: oauthRoutes, prefix: "/auth/google" },
    { route: twofaRoutes, prefix: "/auth/2fa" },
];