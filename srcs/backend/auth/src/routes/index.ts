import authRoutes from "./auth.routes";
import jwksRoutes from "./jwks.routes";
// import oauthRoutes from "./oauth";
// import twofaRoutes from "./twofa";

export default [
    { route: authRoutes, prefix: "/auth" },
    { route: jwksRoutes, prefix: "/.well-known" },
    // { route: oauthRoutes, prefix: "/auth/google" },
    // { route: twofaRoutes, prefix: "/2fa"},
];