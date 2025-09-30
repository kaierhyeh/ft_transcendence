import authRoutes from "./auth";
import jwksRoutes from "./jwks";
// import oauthRoutes from "./oauth";
// import twofaRoutes from "./twofa";

export default [
    { route: authRoutes, prefix: "/auth" },
    { route: jwksRoutes, prefix: "" },
    // { route: oauthRoutes, prefix: "/auth/google" },
    // { route: twofaRoutes, prefix: "/2fa"},
];